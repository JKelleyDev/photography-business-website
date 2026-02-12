import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import JSZip from 'jszip';
import api from '../../api/client';
import { Media } from '../../types';
import ImageGrid from '../../components/ui/ImageGrid';
import Lightbox from '../../components/ui/Lightbox';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface DownloadFile {
  url: string;
  filename: string;
  size_bytes: number;
}

interface DownloadProgress {
  phase: 'downloading' | 'zipping' | 'idle';
  filesCompleted: number;
  filesTotal: number;
  bytesLoaded: number;
  bytesTotal: number;
}

const MAX_CONCURRENT = 4;

export default function SharedGallery() {
  const { token } = useParams<{ token: string }>();
  const [gallery, setGallery] = useState<{ title: string; description: string } | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress>({ phase: 'idle', filesCompleted: 0, filesTotal: 0, bytesLoaded: 0, bytesTotal: 0 });
  const [downloadsLocked, setDownloadsLocked] = useState(false);
  const [invoiceToken, setInvoiceToken] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadGallery();
  }, [token]);

  async function loadGallery() {
    try {
      const [galleryRes, mediaRes] = await Promise.all([
        api.get(`/gallery/${token}`),
        api.get(`/gallery/${token}/media`),
      ]);
      setGallery(galleryRes.data);
      setDownloadsLocked(galleryRes.data.downloads_locked ?? false);
      setInvoiceToken(galleryRes.data.invoice_token ?? null);
      setMedia(mediaRes.data.media);
      const preSelected = new Set<string>(
        mediaRes.data.media.filter((m: Media) => m.is_selected).map((m: Media) => m.id)
      );
      setSelectedIds(preSelected);
    } catch (err: any) {
      if (err.response?.status === 410) {
        setError('This gallery link has expired or is no longer available.');
      } else if (err.response?.status === 404) {
        setError('Gallery not found.');
      } else {
        setError('Failed to load gallery.');
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveSelections() {
    const allIds = media.map((m) => m.id);
    const selected = allIds.filter((id) => selectedIds.has(id));
    const unselected = allIds.filter((id) => !selectedIds.has(id));
    await Promise.all([
      selected.length > 0 && api.post(`/gallery/${token}/select`, { media_ids: selected, selected: true }),
      unselected.length > 0 && api.post(`/gallery/${token}/select`, { media_ids: unselected, selected: false }),
    ]);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function fetchWithProgress(
    url: string,
    signal: AbortSignal,
    onBytes: (delta: number) => void,
  ): Promise<ArrayBuffer> {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) return res.arrayBuffer();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      onBytes(value.byteLength);
    }
    // Merge chunks into a single ArrayBuffer
    const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return merged.buffer;
  }

  async function downloadAndZip(files: DownloadFile[], zipName: string) {
    setDownloading(true);
    const totalBytes = files.reduce((sum, f) => sum + f.size_bytes, 0);
    let bytesLoaded = 0;
    let filesCompleted = 0;
    setProgress({ phase: 'downloading', filesCompleted: 0, filesTotal: files.length, bytesLoaded: 0, bytesTotal: totalBytes });

    const abort = new AbortController();
    abortRef.current = abort;

    const updateProgress = () => {
      setProgress({ phase: 'downloading', filesCompleted, filesTotal: files.length, bytesLoaded, bytesTotal: totalBytes });
    };

    try {
      const results: { filename: string; data: ArrayBuffer }[] = [];

      // Process in batches of MAX_CONCURRENT with per-byte progress
      for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
        const batch = files.slice(i, i + MAX_CONCURRENT);
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            const data = await fetchWithProgress(file.url, abort.signal, (delta) => {
              bytesLoaded += delta;
              updateProgress();
            });
            filesCompleted++;
            updateProgress();
            return { filename: file.filename, data };
          })
        );
        results.push(...batchResults);
      }

      // Build zip client-side
      setProgress((p) => ({ ...p, phase: 'zipping' }));
      const zip = new JSZip();
      for (const { filename, data } of results) {
        zip.file(filename, data);
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });

      // Trigger download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = zipName;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Download failed', err);
      }
    } finally {
      setDownloading(false);
      setProgress({ phase: 'idle', filesCompleted: 0, filesTotal: 0, bytesLoaded: 0, bytesTotal: 0 });
      abortRef.current = null;
    }
  }

  async function fetchUrlsAndDownload(scope: 'selected' | 'all', zipName: string) {
    try {
      if (scope === 'selected') await saveSelections();
      const { data } = await api.get(`/gallery/${token}/download-urls?scope=${scope}`);
      const files: DownloadFile[] = data.files;
      if (files.length === 1) {
        // Single file — download directly, no zip needed
        const a = document.createElement('a');
        a.href = files[0].url;
        a.download = files[0].filename;
        a.click();
        return;
      }
      await downloadAndZip(files, zipName);
    } catch (err: any) {
      if (err.response?.status === 402) {
        setDownloadsLocked(true);
      } else {
        console.error('Download failed', err);
      }
    }
  }

  function handleDownloadSelected() {
    fetchUrlsAndDownload('selected', `${gallery?.title || 'photos'}_selected.zip`);
  }

  function handleDownloadAll() {
    fetchUrlsAndDownload('all', `${gallery?.title || 'photos'}_all.zip`);
  }

  function handleExportForPrinting() {
    fetchUrlsAndDownload('selected', `${gallery?.title || 'photos'}_for_printing.zip`);
  }

  function handleCancelDownload() {
    abortRef.current?.abort();
  }

  if (loading) return <LoadingSpinner size="lg" />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-3">Gallery Unavailable</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const gridImages = media.map((m) => ({
    id: m.id,
    thumbnailUrl: m.thumbnail_url || '',
    alt: m.filename,
  }));
  const lightboxImages = media.map((m) => ({
    url: downloadsLocked && m.watermarked_url
      ? m.watermarked_url
      : m.compressed_url || '',
    alt: m.filename,
  }));

  const pct = progress.bytesTotal > 0 ? Math.min(Math.round((progress.bytesLoaded / progress.bytesTotal) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-primary text-white py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-accent text-sm font-medium mb-2">MAD Photography</p>
          <h1 className="text-3xl font-bold mb-2">{gallery?.title}</h1>
          {gallery?.description && <p className="text-gray-300">{gallery.description}</p>}
          <p className="text-sm text-gray-400 mt-2">{media.length} photos</p>
        </div>
      </div>

      {/* Payment banner */}
      {downloadsLocked && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-amber-800">
              Downloads will be available after payment is received.
            </p>
            {invoiceToken && (
              <Link to={`/invoice/${invoiceToken}`} className="text-sm font-semibold text-amber-900 underline hover:text-amber-700">
                View Invoice
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ImageGrid
          images={gridImages}
          onImageClick={(idx) => setLightboxIndex(idx)}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      </div>

      {/* Bottom toolbar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
        {downloading && progress.phase !== 'idle' && (
          <div className="max-w-7xl mx-auto mb-3">
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span>
                {progress.phase === 'downloading'
                  ? `Downloading ${progress.filesCompleted} of ${progress.filesTotal} photos...`
                  : 'Preparing zip file...'}
              </span>
              <div className="flex items-center gap-3">
                {progress.phase === 'downloading' && (
                  <span>{formatBytes(progress.bytesLoaded)} / {formatBytes(progress.bytesTotal)} ({pct}%)</span>
                )}
                <button onClick={handleCancelDownload} className="text-red-500 hover:text-red-700 font-medium">
                  Cancel
                </button>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              {progress.phase === 'downloading' ? (
                <div className="bg-accent h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              ) : (
                <div className="bg-accent h-2 rounded-full animate-pulse w-full" />
              )}
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-muted">
            {selectedIds.size} of {media.length} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadAll}
              disabled={downloading || downloadsLocked}
            >
              Download All
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadSelected}
              disabled={downloading || selectedIds.size === 0 || downloadsLocked}
            >
              Download Selected ({selectedIds.size})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportForPrinting}
              disabled={downloading || selectedIds.size === 0 || downloadsLocked}
            >
              Export for Printing
            </Button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNext={() => setLightboxIndex(Math.min(lightboxIndex + 1, lightboxImages.length - 1))}
          onPrev={() => setLightboxIndex(Math.max(lightboxIndex - 1, 0))}
          onDownload={downloadsLocked ? undefined : (idx) => {
            const m = media[idx];
            if (!m) return;
            api.get(`/gallery/${token}/media/${m.id}/download-url`).then(({ data }) => {
              const a = document.createElement('a');
              a.href = data.url;
              a.download = data.filename;
              a.click();
            }).catch(console.error);
          }}
        />
      )}
    </div>
  );
}
