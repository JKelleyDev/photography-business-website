import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Inquiry, PricingPackage } from '../../types';
import { formatDateTime } from '../../utils/dateHelpers';
import { formatCurrency, formatPhone } from '../../utils/formatCurrency';
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
  const [packages, setPackages] = useState<Record<string, PricingPackage>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const [inqRes, pkgRes] = await Promise.all([
      api.get('/admin/inquiries'),
      api.get('/admin/pricing'),
    ]);
    setInquiries(inqRes.data.inquiries);
    const pkgMap: Record<string, PricingPackage> = {};
    for (const pkg of pkgRes.data.packages) {
      pkgMap[pkg.id] = pkg;
    }
    setPackages(pkgMap);
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
          inquiries.map((inq) => {
            const pkg = inq.package_id ? packages[inq.package_id] : null;
            return (
              <div key={inq.id} className="bg-white border rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{inq.name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted mt-1">
                      <a href={`mailto:${inq.email}`} className="hover:text-accent">{inq.email}</a>
                      {inq.phone && <a href={`tel:${inq.phone}`} className="hover:text-accent">{formatPhone(inq.phone)}</a>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${statusColors[inq.status]}`}>
                    {inq.status}
                  </span>
                </div>

                {(inq.event_date || inq.event_time || inq.event_duration || pkg) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-3">
                    {pkg && (
                      <div>
                        <span className="text-muted">Package:</span>{' '}
                        <span className="font-medium text-primary">{pkg.name}</span>
                        {!pkg.is_custom && (
                          <span className="text-muted ml-1">({pkg.price_display || formatCurrency(pkg.price_cents)})</span>
                        )}
                      </div>
                    )}
                    {inq.event_date && (
                      <div>
                        <span className="text-muted">Event Date:</span>{' '}
                        <span className="font-medium">{formatDateTime(inq.event_date)}</span>
                      </div>
                    )}
                    {inq.event_time && (
                      <div>
                        <span className="text-muted">Event Time:</span>{' '}
                        <span className="font-medium">{inq.event_time}</span>
                      </div>
                    )}
                    {inq.event_duration && (
                      <div>
                        <span className="text-muted">Duration:</span>{' '}
                        <span className="font-medium">{inq.event_duration}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-3">
                  {inq.message}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
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
                  <p className="text-xs text-muted">{formatDateTime(inq.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
