import { useState, useEffect } from 'react';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface ConsentProject {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  signed_at: string | null;
  total_photos: number;
  published_photos: number;
}

interface ConsentMedia {
  id: string;
  thumbnail_url: string;
  filename: string;
  in_portfolio: boolean;
  portfolio_item_id: string | null;
  sort_order: number;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ProjectPhotos({ projectId, onPublishCountChange }: { projectId: string; onPublishCountChange: (delta: number) => void }) {
  const [media, setMedia] = useState<ConsentMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get(`/admin/gallery-consents/${projectId}/media`).then(({ data }) => {
      setMedia(data.media);
      setLoading(false);
    });
  }, [projectId]);

  async function togglePhoto(photo: ConsentMedia) {
    setToggling((prev) => new Set(prev).add(photo.id));
    const publish = !photo.in_portfolio;
    try {
      const { data } = await api.put(`/admin/gallery-consents/${projectId}/media/${photo.id}`, { publish });
      setMedia((prev) => prev.map((m) => m.id === photo.id ? { ...m, in_portfolio: data.in_portfolio, portfolio_item_id: data.portfolio_item_id } : m));
      onPublishCountChange(publish ? 1 : -1);
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(photo.id); return s; });
    }
  }

  async function handleSelectAll(publish: boolean) {
    const unpublished = media.filter((m) => m.in_portfolio !== publish);
    await Promise.all(
      unpublished.map((m) =>
        api.put(`/admin/gallery-consents/${projectId}/media/${m.id}`, { publish })
      )
    );
    // Reload to get accurate portfolio_item_ids
    const { data } = await api.get(`/admin/gallery-consents/${projectId}/media`);
    const delta = unpublished.length * (publish ? 1 : -1);
    setMedia(data.media);
    onPublishCountChange(delta);
  }

  if (loading) return <div className="py-6"><LoadingSpinner /></div>;
  if (!media.length) return <p className="text-sm text-gray-500 py-4">No photos in this project.</p>;

  const publishedCount = media.filter((m) => m.in_portfolio).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">{publishedCount} of {media.length} photos in portfolio</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleSelectAll(true)}
            className="text-xs text-accent hover:underline"
          >
            Add all to portfolio
          </button>
          <span className="text-xs text-gray-300">|</span>
          <button
            onClick={() => handleSelectAll(false)}
            className="text-xs text-gray-500 hover:underline"
          >
            Remove all
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {media.map((photo) => (
          <button
            key={photo.id}
            onClick={() => togglePhoto(photo)}
            disabled={toggling.has(photo.id)}
            title={photo.in_portfolio ? `${photo.filename} — click to remove from portfolio` : `${photo.filename} — click to add to portfolio`}
            className={`relative aspect-square rounded overflow-hidden border-2 transition-all focus:outline-none ${
              photo.in_portfolio
                ? 'border-accent ring-2 ring-accent/30'
                : 'border-transparent hover:border-gray-300'
            } ${toggling.has(photo.id) ? 'opacity-50' : ''}`}
          >
            <img
              src={photo.thumbnail_url}
              alt={photo.filename}
              className="w-full h-full object-cover"
            />
            {photo.in_portfolio && (
              <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GalleryConsents() {
  const [projects, setProjects] = useState<ConsentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await api.get('/admin/gallery-consents');
    setProjects(data.projects);
    setLoading(false);
  }

  function handlePublishCountChange(projectId: string, delta: number) {
    setProjects((prev) =>
      prev.map((p) => p.id === projectId ? { ...p, published_photos: p.published_photos + delta } : p)
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Gallery Consents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Clients who have agreed to let you use their photos. Select which photos to feature in the public gallery.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 text-sm">No clients have agreed to gallery usage yet.</p>
          <p className="text-gray-400 text-xs mt-1">Clients can grant permission from their gallery link.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === project.id ? null : project.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-primary truncate">{project.title}</span>
                    {project.published_photos > 0 && (
                      <span className="text-xs bg-accent/10 text-accent font-medium px-2 py-0.5 rounded-full">
                        {project.published_photos} published
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {project.client_name} &middot; {project.total_photos} photos &middot; Agreed {formatDate(project.signed_at)}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${expanded === project.id ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded === project.id && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <ProjectPhotos
                    projectId={project.id}
                    onPublishCountChange={(delta) => handlePublishCountChange(project.id, delta)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
