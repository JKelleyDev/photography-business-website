import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { Media } from '../../types';
import ImageGrid from '../../components/ui/ImageGrid';
import Lightbox from '../../components/ui/Lightbox';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function SharedGallery() {
  const { token } = useParams<{ token: string }>();
  const [gallery, setGallery] = useState<{ title: string; description: string } | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ loaded: 0, total: 0 });
  const [downloadsLocked, setDownloadsLocked] = useState(false);
  const [invoiceToken, setInvoiceToken] = useState<string | null>(null);

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

  const apiBase = import.meta.env.VITE_API_URL || '/api';

  function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function streamDownload(url: string, filename: string, estimatedBytes: number, method: 'GET' | 'POST' = 'GET') {
    setDownloading(true);
    setDownloadProgress({ loaded: 0, total: estimatedBytes });
    try {
      const res = await fetch(`${apiBase}${url}`, { method });
      if (res.status === 402) {
        setDownloadsLocked(true);
        return;
      }
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      // Use Content-Length if available, otherwise fall back to our estimate
      const contentLength = res.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : estimatedBytes;
      const reader = res.body?.getReader();
      if (!reader) {
        // Fallback if ReadableStream not supported
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);
        return;
      }
      const chunks: BlobPart[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        setDownloadProgress({ loaded, total });
      }
      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(false);
      setDownloadProgress({ loaded: 0, total: 0 });
    }
  }

  async function handleDownloadSelected() {
    await saveSelections();
    const totalBytes = media.filter((m) => selectedIds.has(m.id)).reduce((sum, m) => sum + m.size_bytes, 0);
    await streamDownload(`/gallery/${token}/download`, `${gallery?.title || 'photos'}_selected.zip`, totalBytes);
  }

  async function handleDownloadAll() {
    const totalBytes = media.reduce((sum, m) => sum + m.size_bytes, 0);
    await streamDownload(`/gallery/${token}/download-all`, `${gallery?.title || 'photos'}_all.zip`, totalBytes);
  }

  async function handleExportForPrinting() {
    await saveSelections();
    const totalBytes = media.filter((m) => selectedIds.has(m.id)).reduce((sum, m) => sum + m.size_bytes, 0);
    await streamDownload(`/gallery/${token}/shutterfly-export`, `${gallery?.title || 'photos'}_for_printing.zip`, totalBytes, 'POST');
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
        {downloading && downloadProgress.total > 0 && (
          <div className="max-w-7xl mx-auto mb-3">
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span>Preparing download...</span>
              <span>
                {formatBytes(downloadProgress.loaded)} / {formatBytes(downloadProgress.total)}
                {downloadProgress.total > 0 && ` (${Math.min(Math.round((downloadProgress.loaded / downloadProgress.total) * 100), 100)}%)`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((downloadProgress.loaded / downloadProgress.total) * 100, 100)}%` }}
              />
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
        />
      )}
    </div>
  );
}
