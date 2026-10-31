import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FolderOpen, Plus } from 'lucide-react';
import api from '../../api/client';
import { Project } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import {
  Badge, EmptyState, List, ListSkeleton, PageHeader, Segmented, Select, STATUS_TONE, Toolbar, buttonClass, cap,
} from '../../components/admin/ui';

const STATUS_FILTERS = ['all', 'active', 'delivered', 'archived'] as const;
type Filter = (typeof STATUS_FILTERS)[number];

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Filter>('active');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    api.get('/admin/projects').then(({ data }) => setProjects(data.projects)).finally(() => setLoading(false));
  }, []);

  const filtered = projects
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });

  const newBtn = <Link to="/admin/projects/new" className={buttonClass()}><Plus /> New project</Link>;

  return (
    <div>
      <PageHeader title="Projects" description="Client shoots, their photos and delivery." actions={newBtn} />

      <Toolbar>
        <Segmented label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        <Select aria-label="Sort" value={sortDir} onChange={(e) => setSortDir(e.target.value as 'desc' | 'asc')} className="sm:w-40">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </Select>
      </Toolbar>

      {loading ? <ListSkeleton /> : filtered.length === 0 ? (
        <EmptyState icon={<FolderOpen />} title={statusFilter === 'all' ? 'No projects yet' : `No ${statusFilter} projects`}
          action={statusFilter === 'all' || statusFilter === 'active' ? newBtn : undefined}>
          {statusFilter === 'all' || statusFilter === 'active'
            ? 'Create a project to upload a shoot and deliver it to your client.'
            : 'Try another filter.'}
        </EmptyState>
      ) : (
        <List>
          {filtered.map((project) => (
            <Link key={project.id} to={`/admin/projects/${project.id}`}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-wash sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{project.title}</p>
                <p className="mt-0.5 truncate text-[13px] text-fixer">{project.description || 'No description'}</p>
              </div>
              <span className="hidden w-28 shrink-0 text-[13px] tabular-nums text-fixer sm:block">{formatDate(project.created_at)}</span>
              <Badge tone={STATUS_TONE[project.status]}>{cap(project.status)}</Badge>
              <ChevronRight className="size-4 shrink-0 text-fixer" />
            </Link>
          ))}
        </List>
      )}
    </div>
  );
}
