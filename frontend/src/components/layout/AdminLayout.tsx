import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, FolderOpen, Users, Receipt, ShieldCheck,
  Images, Tag, Star, Settings, LogOut, Menu, ExternalLink, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { cn } from '../admin/ui';

interface NavItem { to: string; label: string; icon: LucideIcon; badge?: 'inquiries' | 'reviews' }

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Work',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard },
      { to: '/admin/inquiries', label: 'Inquiries', icon: Inbox, badge: 'inquiries' },
      { to: '/admin/projects', label: 'Projects', icon: FolderOpen },
      { to: '/admin/clients', label: 'Clients', icon: Users },
      { to: '/admin/invoices', label: 'Invoices', icon: Receipt },
      { to: '/admin/gallery-consents', label: 'Gallery consents', icon: ShieldCheck },
    ],
  },
  {
    label: 'Website',
    items: [
      { to: '/admin/portfolio', label: 'Portfolio', icon: Images },
      { to: '/admin/pricing', label: 'Pricing', icon: Tag },
      { to: '/admin/reviews', label: 'Reviews', icon: Star, badge: 'reviews' },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];
const allItems = groups.flatMap((g) => g.items);
const tabPaths = ['/admin', '/admin/inquiries', '/admin/projects', '/admin/invoices'];
const tabs = tabPaths.map((p) => allItems.find((i) => i.to === p)!);

export default function AdminLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [counts, setCounts] = useState({ inquiries: 0, reviews: 0 });
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);
  const current = allItems.find((i) => isActive(i.to));
  const isSubpage = current && location.pathname !== current.to;

  // Refresh "needs attention" counts on every navigation, so they clear after acting on them.
  useEffect(() => {
    setMoreOpen(false);
    api.get('/admin/dashboard')
      .then(({ data }) => setCounts({ inquiries: data.pending_inquiries ?? 0, reviews: data.pending_reviews ?? 0 }))
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [moreOpen]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const badgeFor = (item: NavItem) => (item.badge ? counts[item.badge] : 0);

  return (
    <div className="min-h-dvh bg-wash text-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-wash lg:flex">
        <Link to="/admin" className="flex h-14 items-center gap-2.5 px-5">
          <img src="/mad_photos.svg" alt="" className="h-7 w-auto" />
          <span className="text-sm font-semibold">Studio admin</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Admin">
          {groups.map((g) => (
            <div key={g.label} className="mt-4 first:mt-2">
              <p className="px-2 pb-1.5 text-xs font-medium text-fixer">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const active = isActive(item.to);
                  const n = badgeFor(item);
                  return (
                    <li key={item.to}>
                      <Link to={item.to} aria-current={active ? 'page' : undefined}
                        className={cn('flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors',
                          active ? 'bg-white font-medium text-ink shadow-sm ring-1 ring-line' : 'text-fixer hover:bg-white/70 hover:text-ink')}>
                        <item.icon className="size-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {n > 0 && (
                          <span className="min-w-5 rounded-full bg-safelight px-1.5 text-center text-[11px] font-semibold leading-5 text-white tabular-nums"
                            aria-label={`${n} waiting`}>{n}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-line p-3">
          <a href="/" target="_blank" rel="noreferrer"
            className="flex h-9 items-center gap-2.5 rounded-md px-2 text-sm text-fixer hover:bg-white/70 hover:text-ink">
            <ExternalLink className="size-4" /> View website
          </a>
          <button onClick={handleLogout}
            className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-sm text-fixer hover:bg-white/70 hover:text-ink">
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* Top bar: breadcrumb on desktop, page name on mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:px-8">
          <img src="/mad_photos.svg" alt="" className="h-6 w-auto lg:hidden" />
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="hidden text-fixer lg:inline">Admin</span>
            <span className="hidden text-line lg:inline">/</span>
            {isSubpage ? (
              <>
                <Link to={current.to} className="text-fixer hover:text-ink">{current.label}</Link>
                <span className="text-line">/</span>
                <span className="truncate font-medium">Details</span>
              </>
            ) : (
              <span className="truncate font-medium">{current?.label ?? 'Admin'}</span>
            )}
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {tabs.map((item) => {
            const active = isActive(item.to);
            const n = badgeFor(item);
            return (
              <li key={item.to}>
                <Link to={item.to} aria-current={active ? 'page' : undefined}
                  className={cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px]', active ? 'font-medium text-ink' : 'text-fixer')}>
                  <span className="relative">
                    <item.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                    {n > 0 && <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-safelight ring-2 ring-white" />}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button onClick={() => setMoreOpen(true)} aria-expanded={moreOpen}
              className={cn('flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px]',
                current && !tabPaths.includes(current.to) ? 'font-medium text-ink' : 'text-fixer')}>
              <span className="relative">
                <Menu className="size-5" />
                {counts.reviews > 0 && <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-safelight ring-2 ring-white" />}
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More pages">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMoreOpen(false)} />
          <div className="develop absolute inset-x-0 bottom-0 rounded-t-xl bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
            <ul className="grid grid-cols-3 gap-1">
              {allItems.filter((i) => !tabPaths.includes(i.to)).map((item) => {
                const n = badgeFor(item);
                return (
                  <li key={item.to}>
                    <Link to={item.to}
                      className={cn('relative flex h-20 flex-col items-center justify-center gap-2 rounded-lg text-center text-[13px]',
                        isActive(item.to) ? 'bg-wash font-medium' : 'hover:bg-wash')}>
                      <item.icon className="size-5" />
                      {item.label}
                      {n > 0 && <span className="absolute right-3 top-3 min-w-5 rounded-full bg-safelight px-1.5 text-[11px] font-semibold leading-5 text-white">{n}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <a href="/" target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-md border border-line text-sm">
                <ExternalLink className="size-4" /> View website
              </a>
              <button onClick={handleLogout} className="flex h-11 items-center justify-center gap-2 rounded-md border border-line text-sm">
                <LogOut className="size-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
