import { useState, useEffect } from 'react';
import { Check, ChevronDown, ShieldCheck } from 'lucide-react';
import api from '../../api/client';
import { Badge, Button, EmptyState, ListSkeleton, PageHeader, Skeleton, cn } from '../../components/admin/ui';

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
  const [bulk, setBulk] = useState(false);

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
      setMedia((prev) => prev.map((m) => (m.id === photo.id ? { ...m, in_portfolio: data.in_portfolio, portfolio_item_id: data.portfolio_item_id } : m)));
      onPublishCountChange(publish ? 1 : -1);
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(photo.id); return s; });
    }
  }

  async function handleSelectAll(publish: boolean) {
    setBulk(true);
    const changing = media.filter((m) => m.in_portfolio !== publish);
    await Promise.all(changing.map((m) => api.put(`/admin/gallery-consents/${projectId}/media/${m.id}`, { publish })));
    const { data } = await api.get(`/admin/gallery-consents/${projectId}/media`);
    setMedia(data.media);
    onPublishCountChange(changing.length * (publish ? 1 : -1));
    setBulk(false);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}
      </div>
    );
  }
  if (!media.length) return <p className="py-4 text-sm text-fixer">This project has no photos.</p>;

  const publishedCount = media.filter((m) => m.in_portfolio).length;

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-fixer">Tap a photo to add it to your portfolio. {publishedCount} of {media.length} added.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={bulk || publishedCount === media.length} onClick={() => handleSelectAll(true)}>Add all</Button>
          <Button size="sm" variant="ghost" disabled={bulk || publishedCount === 0} onClick={() => handleSelectAll(false)}>Remove all</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {media.map((photo) => (
          <button key={photo.id} onClick={() => togglePhoto(photo)} disabled={toggling.has(photo.id) || bulk}
            aria-pressed={photo.in_portfolio}
            aria-label={`${photo.filename}, ${photo.in_portfolio ? 'in portfolio' : 'not in portfolio'}`}
            className={cn('relative aspect-square overflow-hidden rounded-md bg-wash ring-offset-2 transition',
              photo.in_portfolio ? 'ring-2 ring-ink' : 'hover:opacity-90',
              toggling.has(photo.id) && 'opacity-50')}>
            <img src={photo.thumbnail_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            <span className={cn('absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white shadow',
              photo.in_portfolio ? 'bg-ink text-white' : 'bg-black/20')}>
              {photo.in_portfolio && <Check className="size-3" strokeWidth={3} />}
            </span>
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
    api.get('/admin/gallery-consents').then(({ data }) => setProjects(data.projects)).finally(() => setLoading(false));
  }, []);

  function handlePublishCountChange(projectId: string, delta: number) {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, published_photos: p.published_photos + delta } : p)));
  }

  return (
    <div>
      <PageHeader title="Gallery consents" description="Clients who agreed to let you show their photos. Pick which ones go in your public portfolio." />

      {loading ? <ListSkeleton rows={3} /> : projects.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title="No consents yet">
          Clients can give permission from their gallery link. Their projects will show up here.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => {
            const open = expanded === project.id;
            return (
              <li key={project.id} className="overflow-hidden rounded-lg border border-line bg-white">
                <button aria-expanded={open} onClick={() => setExpanded(open ? null : project.id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-wash sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{project.title}</span>
                      {project.published_photos > 0 && <Badge tone="success">{project.published_photos} in portfolio</Badge>}
                    </div>
                    <p className="mt-0.5 text-[13px] text-fixer">
                      {project.client_name} — {project.total_photos} photos — agreed {formatDate(project.signed_at)}
                    </p>
                  </div>
                  <ChevronDown className={cn('size-4 shrink-0 text-fixer transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="border-t border-line px-4 py-4 sm:px-5">
                    <ProjectPhotos projectId={project.id} onPublishCountChange={(d) => handlePublishCountChange(project.id, d)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
