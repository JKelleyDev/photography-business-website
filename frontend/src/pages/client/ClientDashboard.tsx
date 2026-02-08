import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Project, Invoice } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ClientDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/client/projects').then(({ data }) => setProjects(data.projects)),
      api.get('/client/invoices').then(({ data }) => setInvoices(data.invoices)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-8">My Dashboard</h1>

      {/* Projects */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-primary mb-4">My Projects</h2>
        {projects.length === 0 ? (
          <p className="text-muted">No projects yet.</p>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      p.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {p.status}
                    </span>
                    {p.share_link_token && (
                      <Link
                        to={`/gallery/${p.share_link_token}`}
                        className="text-sm text-accent hover:underline"
                      >
                        View Gallery
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invoices */}
      <section>
        <h2 className="text-lg font-semibold text-primary mb-4">My Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-muted">No invoices yet.</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                to={`/client/invoices/${inv.id}`}
                className="block bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{formatCurrency(inv.amount_cents)}</p>
                    <p className="text-sm text-muted">Due: {formatDate(inv.due_date)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                    inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
