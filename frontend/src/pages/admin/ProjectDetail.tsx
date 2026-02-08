import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import { Project, Media } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/dateHelpers';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [showDeliver, setShowDeliver] = useState(false);
  const [deliverForm, setDeliverForm] = useState({ share_link_expires_at: '', project_expires_at: '' });
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

  async function handleUpload(files: FileList) {
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    try {
      await api.post(`/admin/projects/${id}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            setUploadProgress({ overall: Math.round((e.loaded * 100) / e.total) });
          }
        },
      });
      loadProject();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!confirm('Delete this image?')) return;
    await api.delete(`/admin/projects/${id}/media/${mediaId}`);
    loadProject();
  }

  async function handleDeliver(e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/admin/projects/${id}/deliver`, {
      share_link_expires_at: deliverForm.share_link_expires_at || null,
      project_expires_at: deliverForm.project_expires_at || null,
    });
    setShowDeliver(false);
    loadProject();
  }

  async function handleArchive() {
    if (!confirm('Archive this project? This will delete all media from storage.')) return;
    await api.put(`/admin/projects/${id}/archive`);
    loadProject();
  }

  if (loading) return <LoadingSpinner />;
  if (!project) return <p>Project not found</p>;

  const statusColors: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">{project.title}</h1>
          <p className="text-sm text-muted">{project.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[project.status]}`}>
              {project.status}
            </span>
            <span className="text-xs text-muted">{formatDate(project.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {project.status === 'active' && (
            <Button onClick={() => setShowDeliver(true)}>Deliver Project</Button>
          )}
          {project.status !== 'archived' && (
            <Button variant="danger" onClick={handleArchive}>Archive</Button>
          )}
        </div>
      </div>

      {/* Share link */}
      {project.share_link_token && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-green-800">Gallery Link:</p>
          <p className="text-sm text-green-700 font-mono break-all mt-1">
            {window.location.origin}/gallery/{project.share_link_token}
          </p>
          {project.share_link_expires_at && (
            <p className="text-xs text-green-600 mt-1">Expires: {formatDate(project.share_link_expires_at)}</p>
          )}
        </div>
      )}

      {/* Upload area */}
      {project.status !== 'archived' && (
        <div className="mb-6">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('border-accent'); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-accent');
              if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
            }}
          >
            {uploading ? (
              <div>
                <p className="text-sm text-muted mb-2">Uploading...</p>
                <div className="w-48 mx-auto bg-gray-200 rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${uploadProgress.overall || 0}%` }} />
                </div>
              </div>
            ) : (
              <div>
                <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-muted">Drag & drop images or click to browse</p>
                <p className="text-xs text-muted mt-1">JPEG, PNG, TIFF supported</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      )}

      {/* Media grid */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-primary">{media.length} Photos</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {media.map((m) => (
          <div key={m.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
            <img src={m.thumbnail_url || ''} alt={m.filename} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <button
                onClick={() => handleDeleteMedia(m.id)}
                className="opacity-0 group-hover:opacity-100 text-white bg-red-600/80 p-2 rounded-full transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Deliver modal */}
      <Modal open={showDeliver} onClose={() => setShowDeliver(false)} title="Deliver Project">
        <form onSubmit={handleDeliver} className="space-y-4">
          <p className="text-sm text-muted">This will generate a shareable gallery link and notify the client via email.</p>
          <div>
            <label className="block text-sm font-medium mb-1">Gallery Link Expiration (optional)</label>
            <input type="datetime-local" value={deliverForm.share_link_expires_at} onChange={(e) => setDeliverForm({ ...deliverForm, share_link_expires_at: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Project Archival Date (optional)</label>
            <input type="datetime-local" value={deliverForm.project_expires_at} onChange={(e) => setDeliverForm({ ...deliverForm, project_expires_at: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
            <p className="text-xs text-muted mt-1">After this date, media will be deleted to save storage costs.</p>
          </div>
          <Button type="submit" className="w-full" size="lg">Deliver & Notify Client</Button>
        </form>
      </Modal>
    </div>
  );
}
