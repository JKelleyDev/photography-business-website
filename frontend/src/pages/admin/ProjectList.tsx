import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Project } from '../../types';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/dateHelpers';

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-700',
};

const STATUS_FILTERS = ['all', 'active', 'delivered', 'archived'] as const;

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/admin/projects');
    setProjects(data.projects);
    setLoading(false);
  }

  const filtered = projects
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Projects</h1>
        <Link to="/admin/projects/new">
          <Button>New Project</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as 'desc' | 'asc')}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-muted text-center py-12">No projects found.</p>
        ) : (
          filtered.map((project) => (
            <Link
              key={project.id}
              to={`/admin/projects/${project.id}`}
              className="block bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-primary">{project.title}</h3>
                  <p className="text-sm text-muted">{project.description || 'No description'}</p>
                  <p className="text-xs text-muted mt-1">{formatDate(project.created_at)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[project.status]}`}>
                  {project.status}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
