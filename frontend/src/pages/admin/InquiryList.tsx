import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, CalendarDays, Clock, Timer, Package, FolderPlus, Inbox } from 'lucide-react';
import api from '../../api/client';
import { Inquiry, PricingPackage } from '../../types';
import { formatDateTime } from '../../utils/dateHelpers';
import { formatCurrency, formatPhone } from '../../utils/formatCurrency';
import {
  Badge, EmptyState, ListSkeleton, PageHeader, Segmented, Select, STATUS_TONE, Toolbar, buttonClass, cap, cn,
} from '../../components/admin/ui';

const STATUSES = ['new', 'contacted', 'booked', 'closed'] as const;
const STATUS_FILTERS = ['all', ...STATUSES] as const;
type Filter = (typeof STATUS_FILTERS)[number];

export default function InquiryList() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [packages, setPackages] = useState<Record<string, PricingPackage>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Filter>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => { load(); }, []);

  async function load() {
    const [inqRes, pkgRes] = await Promise.all([api.get('/admin/inquiries'), api.get('/admin/pricing')]);
    setInquiries(inqRes.data.inquiries);
    const pkgMap: Record<string, PricingPackage> = {};
    for (const pkg of pkgRes.data.packages) pkgMap[pkg.id] = pkg;
    setPackages(pkgMap);
    setLoading(false);
  }

  async function updateStatus(id: string, status: Inquiry['status']) {
    setInquiries((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    await api.put(`/admin/inquiries/${id}`, { status });
    load();
  }

  const counts = Object.fromEntries(STATUSES.map((s) => [s, inquiries.filter((q) => q.status === s).length]));
  const filtered = inquiries
    .filter((inq) => statusFilter === 'all' || inq.status === statusFilter)
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });

  return (
    <div>
      <PageHeader title="Inquiries" description="Booking requests from the pricing page." />

      <Toolbar>
        <Segmented label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} counts={{ new: counts.new }} />
        <Select aria-label="Sort" value={sortDir} onChange={(e) => setSortDir(e.target.value as 'desc' | 'asc')} className="sm:w-40">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </Select>
      </Toolbar>

      {loading ? <ListSkeleton rows={3} /> : filtered.length === 0 ? (
        <EmptyState icon={<Inbox />} title={statusFilter === 'all' ? 'No inquiries yet' : `No ${statusFilter} inquiries`}>
          {statusFilter === 'all' ? "They'll appear here when someone sends the form on your pricing page." : 'Try another filter.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {filtered.map((inq) => {
            const pkg = inq.package_id ? packages[inq.package_id] : null;
            const meta = [
              pkg && { icon: Package, text: `${pkg.name}${!pkg.is_custom ? ` (${pkg.price_display || formatCurrency(pkg.price_cents)})` : ''}` },
              inq.event_date && { icon: CalendarDays, text: formatDateTime(inq.event_date) },
              inq.event_time && { icon: Clock, text: inq.event_time },
              inq.event_duration && { icon: Timer, text: inq.event_duration },
            ].filter(Boolean) as { icon: typeof Package; text: string }[];

            return (
              <li key={inq.id} className="rounded-lg border border-line bg-white">
                <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{inq.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-fixer">
                      <a href={`mailto:${inq.email}`} className="inline-flex items-center gap-1.5 break-all hover:text-ink"><Mail className="size-3.5" />{inq.email}</a>
                      {inq.phone && <a href={`tel:${inq.phone}`} className="inline-flex items-center gap-1.5 hover:text-ink"><Phone className="size-3.5" />{formatPhone(inq.phone)}</a>}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[inq.status]}>{cap(inq.status)}</Badge>
                </div>

                {meta.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 px-4 sm:px-5">
                    {meta.map((m) => (
                      <span key={m.text} className="inline-flex items-center gap-1.5 rounded-md bg-wash px-2 py-1 text-[13px]">
                        <m.icon className="size-3.5 text-fixer" />{m.text}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mx-4 mt-3 whitespace-pre-line text-sm leading-relaxed sm:mx-5">{inq.message}</p>

                <div className="mt-4 flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-center gap-2">
                    <span className="hidden text-[13px] text-fixer sm:inline">Status</span>
                    <div className="inline-flex rounded-md border border-line p-0.5" role="radiogroup" aria-label={`Status for ${inq.name}`}>
                      {STATUSES.map((s) => (
                        <button key={s} role="radio" aria-checked={inq.status === s} onClick={() => updateStatus(inq.id, s)}
                          className={cn('h-8 rounded-[5px] px-2.5 text-[13px] font-medium transition-colors',
                            inq.status === s ? 'bg-ink text-white' : 'text-fixer hover:bg-wash hover:text-ink')}>
                          {cap(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-fixer">Received {formatDateTime(inq.created_at)}</span>
                    {inq.status === 'booked' && (
                      <Link to={`/admin/projects/new?inquiryId=${inq.id}`} className={buttonClass('outline', 'sm')}>
                        <FolderPlus /> Create project
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
