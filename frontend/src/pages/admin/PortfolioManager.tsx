import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { PortfolioItem } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const BASE_TAGS = ['Landscape', 'Portrait'];

function toTitleCase(str: string): string {
  return str.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface UploadFile {
  file: File;
  title: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

function TagSelector({
  value,
  onChange,
  existingTags,
}: {
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
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitNew(); } if (e.key === 'Escape') { setAddingNew(false); setNewTag(''); } }}
          placeholder="New tag name…"
          className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Button size="sm" onClick={commitNew} type="button">Add</Button>
        <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setNewTag(''); }} type="button">Cancel</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent bg-white"
      >
        {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        {!allTags.includes(value) && value && <option value={value}>{value}</option>}
      </select>
      <button
        type="button"
        onClick={() => setAddingNew(true)}
        title="Add new tag"
        className="w-9 h-9 flex items-center justify-center border rounded-lg text-muted hover:text-accent hover:border-accent transition-colors text-lg leading-none"
      >
        +
      </button>
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
        console.error(`[PORTFOLIO] Upload failed for ${snapshot[i].file.name}:`, err);
        setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'error' } : f));
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

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Portfolio</h1>
        <Button onClick={() => setShowUpload(true)}>Upload Photos</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className={`relative group rounded-lg overflow-hidden border ${!item.is_visible ? 'opacity-50' : ''}`}>
            <img src={item.thumbnail_url || ''} alt={item.title} className="w-full aspect-square object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end">
              <div className="w-full p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium truncate">{item.title}</p>
                <p className="text-white/70 text-xs mb-2">{item.category}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => openEdit(item)} className="text-xs text-white bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors">
                    Edit
                  </button>
                  <button onClick={() => toggleVisibility(item)} className="text-xs text-white bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors">
                    {item.is_visible ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-300 bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={closeUpload} title="Upload Portfolio Photos">
        <div className="space-y-4">
          {uploadFiles.length === 0 ? (
            <div>
              <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors">
                <svg className="w-8 h-8 text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-muted">Click to select photos</p>
                <p className="text-xs text-muted mt-1">JPEG, PNG — multiple files supported</p>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Category for all photos</label>
                <TagSelector value={batchCategory} onChange={setBatchCategory} existingTags={existingTags} />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {uploadFiles.map((uf, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      uf.status === 'done' ? 'bg-green-500' :
                      uf.status === 'error' ? 'bg-red-500' :
                      uf.status === 'uploading' ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-300'
                    }`} />
                    <input
                      type="text"
                      value={uf.title}
                      onChange={(e) => setUploadFiles((prev) => prev.map((f, i) => i === idx ? { ...f, title: e.target.value } : f))}
                      disabled={uf.status !== 'pending'}
                      className="flex-1 px-2 py-1.5 border rounded text-sm outline-none focus:ring-2 focus:ring-accent disabled:bg-gray-50 disabled:text-muted"
                    />
                    <span className="text-xs w-20 text-right shrink-0" title={isHeic(uf.file) ? 'HEIC format not supported — convert to JPEG first' : undefined}>
                      {uf.status === 'done' ? <span className="text-green-600">✓ Done</span> :
                       uf.status === 'error' ? <span className="text-red-500" title={isHeic(uf.file) ? 'HEIC not supported' : 'Upload failed'}>{isHeic(uf.file) ? '✗ HEIC' : '✗ Error'}</span> :
                       uf.status === 'uploading' ? <span className="text-blue-500">Uploading</span> :
                       <span className="text-muted">Pending</span>}
                    </span>
                  </div>
                ))}
              </div>

              {!allDone ? (
                <Button onClick={handleBatchUpload} disabled={uploading || uploadableCount === 0} className="w-full">
                  {uploading ? `Uploading ${uploadFiles.filter(f => f.status === 'done').length} / ${uploadableCount}…` : `Upload ${uploadableCount} photo${uploadableCount !== 1 ? 's' : ''}`}
                </Button>
              ) : (
                <Button onClick={closeUpload} className="w-full">Done</Button>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Portfolio Item">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <TagSelector value={editCategory} onChange={setEditCategory} existingTags={existingTags} />
          </div>
          <Button onClick={handleEditSave} disabled={editSaving} className="w-full">
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
