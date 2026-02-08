import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Inquiry } from '../../types';
import { formatDateTime } from '../../utils/dateHelpers';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  booked: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export default function InquiryList() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/admin/inquiries');
    setInquiries(data.inquiries);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await api.put(`/admin/inquiries/${id}`, { status });
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Inquiries</h1>
      <div className="space-y-4">
        {inquiries.length === 0 ? (
          <p className="text-muted text-center py-12">No inquiries yet.</p>
        ) : (
          inquiries.map((inq) => (
            <div key={inq.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{inq.name}</h3>
                  <p className="text-sm text-muted">{inq.email} {inq.phone && `| ${inq.phone}`}</p>
                  {inq.event_date && <p className="text-xs text-muted mt-1">Event: {formatDateTime(inq.event_date)}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[inq.status]}`}>
                  {inq.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-3">{inq.message}</p>
              <div className="flex gap-2 mt-3">
                {['new', 'contacted', 'booked', 'closed'].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={inq.status === s ? 'primary' : 'ghost'}
                    onClick={() => updateStatus(inq.id, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{formatDateTime(inq.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
