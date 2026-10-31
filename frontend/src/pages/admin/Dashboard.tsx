import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Star, Receipt, ChevronRight, CheckCircle2, Plus } from 'lucide-react';
import api from '../../api/client';
import { DashboardStats, Inquiry, Invoice, Review, User } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import { Badge, Card, CardHeader, PageHeader, Skeleton, buttonClass } from '../../components/admin/ui';

interface Task { id: string; to: string; icon: typeof Inbox; title: string; detail: string; when: string; tag: string; tone: 'info' | 'warn' | 'danger' }

const DAY = 864e5;

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setStats(data)).catch(() => {});

    Promise.allSettled([
      api.get('/admin/inquiries'), api.get('/admin/reviews'),
      api.get('/admin/invoices'), api.get('/admin/clients'),
    ]).then(([inq, rev, inv, cli]) => {
      const val = <T,>(r: PromiseSettledResult<{ data: Record<string, T[]> }>, k: string): T[] =>
        r.status === 'fulfilled' ? r.value.data[k] ?? [] : [];
      const inquiries = val<Inquiry>(inq, 'inquiries');
      const reviews = val<Review>(rev, 'reviews');
      const invoices = val<Invoice>(inv, 'invoices');
      const clients = Object.fromEntries(val<User>(cli, 'clients').map((c) => [c.id, c]));

      const list: (Task & { sort: number })[] = [];
      for (const q of inquiries.filter((q) => q.status === 'new')) {
        list.push({
          id: `q${q.id}`, to: '/admin/inquiries', icon: Inbox, title: q.name,
          detail: q.message, when: formatDate(q.created_at), tag: 'New inquiry', tone: 'info',
          sort: new Date(q.created_at).getTime(),
        });
      }
      for (const r of reviews.filter((r) => !r.is_approved)) {
        list.push({
          id: `r${r.id}`, to: '/admin/reviews', icon: Star, title: `${r.author_name}, ${r.rating} of 5`,
          detail: r.body, when: formatDate(r.created_at), tag: 'Review to approve', tone: 'warn',
          sort: new Date(r.created_at).getTime(),
        });
      }
      for (const i of invoices.filter((i) => i.status === 'sent')) {
        const due = new Date(i.due_date).getTime();
        const overdue = due < Date.now();
        if (!overdue && due - Date.now() > 3 * DAY) continue;
        list.push({
          id: `i${i.id}`, to: '/admin/invoices', icon: Receipt,
          title: `${formatCurrency(i.amount_cents)} from ${clients[i.client_id]?.name ?? 'a client'}`,
          detail: `Due ${formatDate(i.due_date)}`, when: '', tag: overdue ? 'Overdue' : 'Due soon',
          tone: overdue ? 'danger' : 'warn', sort: due + (overdue ? 1e13 : 0),
        });
      }
      setTasks(list.sort((a, b) => b.sort - a.sort));
    });
  }, []);

  const strip = stats && [
    { label: 'Active projects', value: stats.active_projects, to: '/admin/projects' },
    { label: 'Delivered', value: stats.delivered_projects, to: '/admin/projects' },
    { label: 'Clients', value: stats.total_clients, to: '/admin/clients' },
    { label: 'Revenue collected', value: formatCurrency(stats.total_revenue_cents), to: '/admin/invoices' },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        actions={<>
          <Link to="/admin/invoices/new" className={buttonClass('outline')}>New invoice</Link>
          <Link to="/admin/projects/new" className={buttonClass()}><Plus /> New project</Link>
        </>}
      />

      <dl className="mb-6 grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4 [&>*]:bg-white" style={{ gap: 1 }}>
        {(strip ?? Array.from({ length: 4 }, () => null)).map((s, i) => (
          s ? (
            <Link key={s.label} to={s.to} className="px-4 py-4 hover:bg-wash sm:px-5">
              <dt className="text-[13px] text-fixer">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{s.value}</dd>
            </Link>
          ) : (
            <div key={i} className="space-y-2 px-4 py-4 sm:px-5"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-14" /></div>
          )
        ))}
      </dl>

      <Card>
        <CardHeader
          title="Needs your attention"
          description={tasks ? (tasks.length ? `${tasks.length} ${tasks.length === 1 ? 'item' : 'items'} waiting` : 'Nothing waiting') : 'Checking…'}
        />
        {!tasks ? (
          <ul className="divide-y divide-line">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-2/3" /></div>
              </li>
            ))}
          </ul>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <CheckCircle2 className="mb-3 size-8 text-emerald-600" strokeWidth={1.5} />
            <p className="font-medium">You're all caught up</p>
            <p className="mt-1 text-sm text-fixer">New inquiries, reviews to approve and invoices coming due will show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link to={t.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-wash sm:px-5">
                  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-wash text-fixer">
                    <t.icon className="size-4" />
                    {t.tone === 'danger' && <span className="absolute right-0 top-0 size-2.5 rounded-full bg-safelight ring-2 ring-white" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <Badge tone={t.tone}>{t.tag}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-fixer">{t.detail}</p>
                  </div>
                  {t.when && <span className="hidden shrink-0 text-xs text-fixer sm:block">{t.when}</span>}
                  <ChevronRight className="size-4 shrink-0 text-fixer" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
