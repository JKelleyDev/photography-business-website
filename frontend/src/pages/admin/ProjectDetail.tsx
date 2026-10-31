import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { Project, Media } from '../../types';
import { Archive, Check, Copy, ExternalLink, Receipt, Send, Trash2, UploadCloud, Undo2 } from 'lucide-react';
import {
  Badge, Button, Card, CardHeader, Checkbox, Dialog, Field, Input, Skeleton, STATUS_TONE, buttonClass, cap, cn,
} from '../../components/admin/ui';
import LineItems, { LineItem, emptyLine } from '../../components/admin/LineItems';
import { formatDate } from '../../utils/dateHelpers';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, any>>({});
  const [showDeliver, setShowDeliver] = useState(false);
  const [deliverForm, setDeliverForm] = useState({ share_link_expires_at: '', project_expires_at: '' });
  const [createInvoice, setCreateInvoice] = useState(false);
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceLineItems, setInvoiceLineItems] = useState<LineItem[]>([emptyLine()]);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProject(); }, [id]);

  async function loadProject() {
    const [projectRes, mediaRes] = await Promise.all([
      api.get(`/admin/projects/${id}`),
      api.get(`/admin/projects/${id}/media`),
    ]);
    setProject(projectRes.data);
    setMedia(mediaRes.data.media);
    setLoading(false);
  }

  // Warn before leaving during upload
  useEffect(() => {
    if (!uploading) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploading]);

  function isHeic(file: File): boolean {
    const name = file.name.toLowerCase();
    return file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
  }

  async function handleUpload(files: FileList) {
    const allFiles = Array.from(files);
    const heicFiles = allFiles.filter(isHeic);
    if (heicFiles.length) {
      alert(`${heicFiles.length} photo(s) were skipped — HEIC format is not supported.\n\nTo fix on iPhone: Settings → Camera → Formats → Most Compatible (saves as JPEG)`);
    }
    const fileArray = allFiles.filter((f) => !isHeic(f));
    if (!fileArray.length) return;
    const total = fileArray.length;
    setUploading(true);
    setUploadProgress({ completed: 0, total, currentFile: '', currentPct: 0 });
    let failed = 0;
    for (let i = 0; i < total; i++) {
      const file = fileArray[i];
      const mimeType = file.type || 'image/jpeg';
      setUploadProgress({ completed: i, total, currentFile: file.name, currentPct: 0 });
      try {
        // Step 1: get presigned S3 upload URL
        const { data: presign } = await api.post(`/admin/projects/${id}/media/presign`, {
          filename: file.name,
          mime_type: mimeType,
        });

        // Step 2: upload directly to S3 (bypasses Vercel size limit)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress({ completed: i, total, currentFile: file.name, currentPct: Math.round((e.loaded * 100) / e.total) });
            }
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 upload failed: ${xhr.status}`)));
          xhr.onerror = () => reject(new Error('S3 upload network error'));
          xhr.open('PUT', presign.upload_url);
          xhr.setRequestHeader('Content-Type', mimeType);
          xhr.send(file);
        });

        // Step 3: tell backend to process the uploaded file
        setUploadProgress({ completed: i, total, currentFile: file.name, currentPct: 100 });
        await api.post(`/admin/projects/${id}/media/process`, {
          original_key: presign.original_key,
          filename: file.name,
          mime_type: mimeType,
        });
      } catch (err) {
        console.error(`[MEDIA] Upload failed for ${file.name}:`, err);
        failed++;
      }
    }
    setUploading(false);
    setUploadProgress({});
    loadProject();
    if (failed > 0) alert(`${failed} of ${total} files failed to upload.`);
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!confirm('Delete this image?')) return;
    await api.delete(`/admin/projects/${id}/media/${mediaId}`);
    loadProject();
  }

  async function handleDeliver(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      share_link_expires_at: deliverForm.share_link_expires_at || null,
      project_expires_at: deliverForm.project_expires_at || null,
      create_invoice: createInvoice,
    };
    if (createInvoice) {
      payload.invoice_line_items = invoiceLineItems.map((li) => ({
        description: li.description,
        amount_cents: Math.round(parseFloat(li.amount_dollars || '0') * 100),
        quantity: li.quantity,
      }));
      payload.invoice_due_date = new Date(invoiceDueDate).toISOString();
    }
    if (!createInvoice) {
      const ok = confirm('No invoice will be created. Clients will see unwatermarked images and can download freely. Continue without an invoice?');
      if (!ok) return;
    }
    await api.post(`/admin/projects/${id}/deliver`, payload);
    setShowDeliver(false);
    loadProject();
  }

  async function handleRescind() {
    if (!confirm('This will deactivate the gallery link. Continue?')) return;
    await api.put(`/admin/projects/${id}/rescind`);
    loadProject();
  }

  async function handleArchive() {
    if (!confirm('Archive this project? This will delete all media from storage.')) return;
    await api.put(`/admin/projects/${id}/archive`);
    loadProject();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
      </div>
    );
  }
  if (!project) return <p className="text-fixer">This project doesn’t exist or was removed.</p>;

  const galleryUrl = project.share_link_token ? `${window.location.origin}/gallery/${project.share_link_token}` : '';
  function copyGallery() {
    navigator.clipboard.writeText(galleryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
            <Badge tone={STATUS_TONE[project.status]}>{cap(project.status)}</Badge>
          </div>
          {project.description && <p className="mt-1 max-w-2xl whitespace-pre-line text-sm text-fixer">{project.description}</p>}
          <p className="mt-1 text-xs text-fixer">Created {formatDate(project.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.status === 'active' && <Button onClick={() => setShowDeliver(true)} disabled={!media.length}><Send /> Deliver to client</Button>}
          {project.status === 'delivered' && (
            <Link to={`/admin/invoices/new?clientId=${project.client_id}&projectId=${id}`} className={buttonClass('outline')}><Receipt /> New invoice</Link>
          )}
          {project.status === 'delivered' && <Button variant="outline" onClick={handleRescind}><Undo2 /> Turn off gallery link</Button>}
          {project.status !== 'archived' && <Button variant="ghost" className="text-safelight hover:bg-red-50" onClick={handleArchive}><Archive /> Archive</Button>}
        </div>
      </div>

      {/* Share link */}
      {galleryUrl && (
        <Card className="mb-6">
          <CardHeader title="Gallery link"
            description={project.share_link_expires_at ? `Works until ${formatDate(project.share_link_expires_at)}.` : 'Your client can open this any time.'} />
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:px-5">
            <Input readOnly value={galleryUrl} aria-label="Gallery link" onFocus={(e) => e.currentTarget.select()} className="font-mono text-[13px]" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyGallery} className="flex-1">{copied ? <><Check /> Copied</> : <><Copy /> Copy</>}</Button>
              <a href={galleryUrl} target="_blank" rel="noreferrer" className={buttonClass('outline', 'icon')} aria-label="Open gallery"><ExternalLink /></a>
            </div>
          </div>
        </Card>
      )}

      {/* Upload area */}
      {project.status !== 'archived' && (
        <div className="mb-6">
          <button type="button" disabled={uploading}
            className={cn('flex w-full flex-col items-center rounded-lg border border-dashed bg-white px-6 py-8 text-center transition-colors',
              dragging ? 'border-ink bg-wash' : 'border-line hover:bg-wash/60')}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files); }}>
            {uploading ? (
              <div className="w-full max-w-xs" role="status">
                <p className="text-sm font-medium">Uploading {(uploadProgress.completed || 0) + 1} of {uploadProgress.total || 0}</p>
                <p className="mt-1 truncate text-[13px] text-fixer">{uploadProgress.currentFile}</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-wash">
                  <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${uploadProgress.currentPct || 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-fixer">{uploadProgress.currentPct === 100 ? 'Processing…' : 'Keep this page open until it finishes.'}</p>
              </div>
            ) : (
              <>
                <UploadCloud className="mb-2 size-7 text-fixer" strokeWidth={1.5} />
                <span className="text-sm font-medium"><span className="hidden sm:inline">Drop photos here or </span>choose photos to upload</span>
                <span className="mt-1 text-[13px] text-fixer">JPEG, PNG or TIFF</span>
              </>
            )}
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="sr-only"
            onChange={(e) => e.target.files && handleUpload(e.target.files)} />
        </div>
      )}

      {/* Media grid */}
      <h2 className="mb-3 text-[15px] font-semibold">{media.length} {media.length === 1 ? 'photo' : 'photos'}</h2>
      {media.length === 0 ? (
        <p className="text-sm text-fixer">No photos yet. Upload the shoot above.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-4 lg:grid-cols-5">
          {media.map((m) => (
            <li key={m.id} className="group relative aspect-square overflow-hidden rounded-md bg-wash">
              <img src={m.thumbnail_url || ''} alt={m.filename} className="h-full w-full object-cover" loading="lazy" decoding="async" />
              <button onClick={() => handleDeleteMedia(m.id)} aria-label={`Delete ${m.filename}`}
                className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-md bg-white/90 text-safelight shadow-sm transition-opacity hover:bg-white focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Deliver dialog */}
      <Dialog open={showDeliver} onClose={() => setShowDeliver(false)} wide title="Deliver to client"
        description="Creates a gallery link and emails it to your client.">
        <form onSubmit={handleDeliver} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link stops working (optional)">
              {(fid) => <Input id={fid} type="datetime-local" value={deliverForm.share_link_expires_at} onChange={(e) => setDeliverForm({ ...deliverForm, share_link_expires_at: e.target.value })} />}
            </Field>
            <Field label="Delete photos after (optional)" hint="Frees up storage once the client has them.">
              {(fid) => <Input id={fid} type="datetime-local" value={deliverForm.project_expires_at} onChange={(e) => setDeliverForm({ ...deliverForm, project_expires_at: e.target.value })} />}
            </Field>
          </div>

          <div className="rounded-lg border border-line p-4">
            <Checkbox checked={createInvoice} onChange={setCreateInvoice}>
              <span className="font-medium">Send an invoice with it</span>
              <span className="mt-0.5 block text-[13px] text-fixer">Downloads stay locked until it’s paid.</span>
            </Checkbox>
            {createInvoice && (
              <div className="mt-4 space-y-4 border-t border-line pt-4">
                <Field label="Due date">{(fid) => <Input id={fid} type="date" required value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} />}</Field>
                <LineItems items={invoiceLineItems} onChange={setInvoiceLineItems} />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeliver(false)}>Cancel</Button>
            <Button type="submit"><Send /> Deliver and email client</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
