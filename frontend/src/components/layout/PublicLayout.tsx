import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { SITE } from '../../content/site';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/reviews', label: 'Reviews' },
];

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const overHero = isHome && !scrolled && !menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          overHero ? 'bg-transparent text-paper' : 'bg-paper/95 backdrop-blur-sm text-ink border-b border-tray'
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center" aria-label="MAD Photos, home">
            <img
              src="/mad_photos.svg"
              alt=""
              className={`h-10 w-auto transition ${overHero ? 'invert' : ''}`}
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.slice(1).map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-2 text-[15px] transition-opacity hover:opacity-100 ${
                    active ? 'opacity-100' : 'opacity-70'
                  }`}
                >
                  {link.label}
                  {active && <span className="absolute -bottom-0.5 left-0 h-0.5 w-full bg-safelight" />}
                </Link>
              );
            })}
            <Link
              to="/login"
              className={`rounded-sm border px-4 py-2 text-[15px] transition-colors ${
                overHero ? 'border-paper/60 hover:bg-paper hover:text-ink' : 'border-ink hover:bg-ink hover:text-paper'
              }`}
            >
              Client login
            </Link>
          </div>

          <button
            className="md:hidden -mr-2 flex h-11 w-11 items-center justify-center"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {menuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M3 8h18M3 16h18" />}
            </svg>
          </button>
        </nav>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 top-16 z-40 flex flex-col bg-paper px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 md:hidden">
          <ul className="flex flex-col">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <li key={link.to} className="border-b border-tray">
                  <Link
                    to={link.to}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between py-4 font-serif text-4xl font-light ${
                      active ? 'text-ink' : 'text-fixer'
                    }`}
                  >
                    {link.label}
                    {active && <span className="h-2 w-2 rounded-full bg-safelight" />}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link to="/login" className="mt-auto rounded-sm bg-ink py-4 text-center text-paper">
            Client login
          </Link>
        </div>
      )}

      <main className={`flex-1 ${isHome ? '' : 'pt-16'}`}>
        <Outlet />
      </main>

      <footer className="border-t border-tray">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 md:grid-cols-12 lg:px-8">
          <div className="col-span-2 md:col-span-5">
            <p className="font-serif text-3xl font-light leading-tight">
              Have a date in mind?
            </p>
            <Link to="/pricing" className="mt-4 inline-block border-b border-ink pb-0.5 hover:border-safelight">
              Check availability
            </Link>
          </div>

          <div className="col-span-2 md:col-span-4 md:col-start-9">
            <h3 className="mb-3 text-sm text-fixer">Contact</h3>
            <div className="space-y-2 text-[17px]">
              <a href={`mailto:${SITE.email}`} className="block break-all hover:underline">{SITE.email}</a>
              <a href={SITE.phoneHref} className="block hover:underline">{SITE.phone}</a>
            </div>
          </div>

          <p className="col-span-2 border-t border-tray pt-6 text-sm text-fixer md:col-span-12">
            &copy; {new Date().getFullYear()} MAD Photos
          </p>
        </div>
      </footer>
    </div>
  );
}
