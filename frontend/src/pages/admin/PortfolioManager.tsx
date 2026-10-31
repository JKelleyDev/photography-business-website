import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { PortfolioItem } from '../../types';
import { Eye, EyeOff, ImagePlus, Images, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Badge, Button, Dialog, EmptyState, Field, Input, PageHeader, Select, Skeleton, cn } from '../../components/admin/ui';

const BASE_TAGS = ['Landscape', 'Portrait'];

function toTitleCase(str: string): string {
  return str.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface UploadFile {
  file: File;
  title: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

function TagSelector({
  value,
  onChange,
  existingTags,
  id,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  existingTags: string[];
}) {
  const [addingNew, setAddingNew] = useState(false);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const allTags = [...new Set([...BASE_TAGS, ...existingTags])].sort();

  function commitNew() {
    const formatted = toTitleCase(newTag);
    if (formatted) onChange(formatted);
    setAddingNew(false);
    setNewTag('');
  }

  if (addingNew) {
    return (
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          autoFocus
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitNew(); } if (e.key === 'Escape') { setAddingNew(false); setNewTag(''); } }}
          placeholder="New category"
          aria-label="New category name"
        />
        <Button onClick={commitNew}>Add</Button>
        <Button variant="ghost" onClick={() => { setAddingNew(false); setNewTag(''); }}>Cancel</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        {!allTags.includes(value) && value && <option value={value}>{value}</option>}
      </Select>
      <Button variant="outline" size="icon" onClick={() => setAddingNew(true)} aria-label="Add a new category" title="Add a new category">
        <Plus />
      </Button>
    </div>
  );
}

export default function PortfolioManager() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [batchCategory, setBatchCategory] = useState('Landscape');
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    const { data } = await api.get('/admin/portfolio');
    setItems(data.items);
    setLoading(false);
  }

  const existingTags = [...new Set(items.map((i) => i.category).filter(Boolean))];

  function isHeic(file: File): boolean {
    const name = file.name.toLowerCase();
    return file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setUploadFiles(files.map((f) => ({
      file: f,
      title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      status: isHeic(f) ? 'error' : 'pending',
    })));
  }

  async function handleBatchUpload() {
    if (!uploadFiles.length) return;
    setUploading(true);
    const snapshot = [...uploadFiles];
    for (let i = 0; i < snapshot.length; i++) {
      if (snapshot[i].status === 'error') continue;
      setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));
      try {
        const file = snapshot[i].file;
        const mimeType = file.type || 'image/jpeg';

        // Step 1: get presigned S3 upload URL
        const { data: presign } = await api.post('/admin/portfolio/presign', {
          filename: file.name,
          mime_type: mimeType,
        });

        // Step 2: upload directly to S3 (bypasses Vercel size limit)
        const s3Res = await fetch(presign.upload_url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': mimeType },
        });
        if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);

        // Step 3: tell backend to process the uploaded file
        await api.post('/admin/portfolio/process', {
          temp_key: presign.temp_key,
          file_id: presign.file_id,
          title: snapshot[i].title,
          category: batchCategory,
        });

        setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[PORTFOLIO] Upload failed for ${snapshot[i].file.name}:`, err);
        setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'error', errorMsg: msg } : f));
      }
    }
    setUploading(false);
    loadItems();
  }

  function closeUpload() {
    if (uploading) return;
    setShowUpload(false);
    setUploadFiles([]);
    setBatchCategory('Landscape');
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this portfolio item?')) return;
    await api.delete(`/admin/portfolio/${id}`);
    loadItems();
  }

  async function toggleVisibility(item: PortfolioItem) {
    await api.put(`/admin/portfolio/${item.id}`, { is_visible: !item.is_visible });
    loadItems();
  }

  function openEdit(item: PortfolioItem) {
    setEditItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
  }

  async function handleEditSave() {
    if (!editItem) return;
    setEditSaving(true);
    await api.put(`/admin/portfolio/${editItem.id}`, { title: editTitle, category: editCategory });
    setEditSaving(false);
    setEditItem(null);
    loadItems();
  }

  const allDone = uploadFiles.length > 0 && uploadFiles.every((f) => f.status === 'done' || f.status === 'error');
  const uploadableCount = uploadFiles.filter((f) => f.status === 'pending').length;

  const uploadBtn = <Button onClick={() => setShowUpload(true)}><Upload /> Upload photos</Button>;

  return (
    <div>
      <PageHeader title="Portfolio"
        description={loading ? 'Photos on your public portfolio page.' : `${items.length} photos — ${items.filter((i) => !i.is_visible).length} hidden.`}
        actions={uploadBtn} />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Images />} title="Your portfolio is empty" action={uploadBtn}>
          Upload photos here, or add them from a client gallery under Gallery consents.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="relative aspect-square bg-wash">
                <img src={item.thumbnail_url || ''} alt={item.title} loading="lazy" decoding="async"
                  className={cn('h-full w-full object-cover', !item.is_visible && 'opacity-40 grayscale')} />
                {!item.is_visible && <Badge tone="neutral" className="absolute left-2 top-2">Hidden</Badge>}
              </div>
              <div className="flex items-center gap-1 py-1.5 pl-3 pr-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{item.title}</p>
                  <p className="truncate text-xs text-fixer">{item.category}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-9" onClick={() => toggleVisibility(item)}
                  aria-label={item.is_visible ? `Hide ${item.title}` : `Show ${item.title}`} title={item.is_visible ? 'Hide from website' : 'Show on website'}>
                  {item.is_visible ? <Eye /> : <EyeOff />}
                </Button>
                <Button variant="ghost" size="icon" className="size-9" onClick={() => openEdit(item)} aria-label={`Edit ${item.title}`}><Pencil /></Button>
                <Button variant="ghost" size="icon" className="size-9 text-safelight hover:bg-red-50" onClick={() => handleDelete(item.id)} aria-label={`Delete ${item.title}`}><Trash2 /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={showUpload} onClose={closeUpload} title="Upload photos" description="JPEG or PNG. HEIC files from iPhone need converting first.">
        <div className="space-y-4">
          {uploadFiles.length === 0 ? (
            <label className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-line bg-wash/50 px-6 py-10 text-center hover:bg-wash">
              <ImagePlus className="mb-2 size-7 text-fixer" strokeWidth={1.5} />
              <span className="text-sm font-medium">Choose photos</span>
              <span className="mt-1 text-[13px] text-fixer">You can pick several at once.</span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={handleFileSelect} />
            </label>
          ) : (
            <>
              <Field label="Category for these photos">
                {(id) => <TagSelector id={id} value={batchCategory} onChange={setBatchCategory} existingTags={existingTags} />}
              </Field>
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {uploadFiles.map((uf, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className={cn('size-2 shrink-0 rounded-full',
                      uf.status === 'done' ? 'bg-emerald-500' : uf.status === 'error' ? 'bg-safelight' : uf.status === 'uploading' ? 'animate-pulse bg-sky-500' : 'bg-line')} />
                    <Input aria-label="Photo title" value={uf.title} disabled={uf.status !== 'pending'} className="h-9"
                      onChange={(e) => setUploadFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, title: e.target.value } : f)))} />
                    <span className="w-20 shrink-0 text-right text-xs" title={uf.status === 'error' ? (isHeic(uf.file) ? 'HEIC isn’t supported. Convert to JPEG first.' : uf.errorMsg || 'Upload failed') : undefined}>
                      {uf.status === 'done' ? <span className="text-emerald-700">Uploaded</span>
                        : uf.status === 'error' ? <span className="text-safelight">{isHeic(uf.file) ? 'HEIC' : 'Failed'}</span>
                        : uf.status === 'uploading' ? <span className="text-sky-700">Uploading</span>
                        : <span className="text-fixer">Ready</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {!allDone ? (
                <Button onClick={handleBatchUpload} disabled={uploading || uploadableCount === 0} className="w-full">
                  {uploading ? `Uploading ${uploadFiles.filter((f) => f.status === 'done').length} of ${uploadableCount}…` : `Upload ${uploadableCount} photo${uploadableCount !== 1 ? 's' : ''}`}
                </Button>
              ) : (
                <Button onClick={closeUpload} className="w-full">Done</Button>
              )}
            </>
          )}
        </div>
      </Dialog>

      <Dialog open={!!editItem} onClose={() => setEditItem(null)} title="Edit photo">
        <div className="space-y-4">
          <Field label="Title">{(id) => <Input id={id} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />}</Field>
          <Field label="Category">{(id) => <TagSelector id={id} value={editCategory} onChange={setEditCategory} existingTags={existingTags} />}</Field>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
