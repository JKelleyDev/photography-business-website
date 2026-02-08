import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { DashboardStats } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setStats(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return null;

  const cards = [
    { label: 'Active Projects', value: stats.active_projects, link: '/admin/projects', color: 'bg-blue-50 text-blue-700' },
    { label: 'Delivered Projects', value: stats.delivered_projects, link: '/admin/projects', color: 'bg-green-50 text-green-700' },
    { label: 'Pending Inquiries', value: stats.pending_inquiries, link: '/admin/inquiries', color: 'bg-amber-50 text-amber-700' },
    { label: 'Pending Reviews', value: stats.pending_reviews, link: '/admin/reviews', color: 'bg-purple-50 text-purple-700' },
    { label: 'Total Clients', value: stats.total_clients, link: '/admin/clients', color: 'bg-cyan-50 text-cyan-700' },
    { label: 'Total Revenue', value: formatCurrency(stats.total_revenue_cents), link: '/admin/invoices', color: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className={`${card.color} rounded-xl p-6 hover:shadow-md transition-shadow`}
          >
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
