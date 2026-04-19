import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { formatPhone } from '../../utils/formatCurrency';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/reviews', label: 'Reviews' },
];

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const settings = useSettings();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <nav className="flex items-center justify-between py-4">
            <div className="flex items-center gap-6">
              <Link to="/" className="text-lg font-medium tracking-tight">
                MAD
              </Link>
              <span className="hidden md:block text-sm text-muted-foreground tracking-wide">
                Photography
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.slice(1).map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm transition-colors hover:text-foreground ${
                    location.pathname === link.to ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/login"
                className="text-sm px-4 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                Login
              </Link>
            </div>

            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </nav>

          {menuOpen && (
            <div className="md:hidden pb-4 border-t border-border">
              <div className="flex flex-col gap-1 pt-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-3 text-base transition-colors ${
                      location.pathname === link.to
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 mx-3 text-center py-3 rounded-full bg-foreground text-background"
                >
                  Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      <footer className="border-t border-border py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            <div className="lg:col-span-1">
              <Link to="/" className="text-xl font-medium tracking-tight">
                MAD Photography
              </Link>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
                Capturing moments that tell your story with artistry and authenticity.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
                Contact
              </h3>
              <div className="space-y-3 text-sm">
                {settings.business_email && (
                  <p>
                    <a href={`mailto:${settings.business_email}`} className="hover:text-stone transition-colors">
                      {settings.business_email}
                    </a>
                  </p>
                )}
                {settings.business_phone && (
                  <p>
                    <a href={`tel:${settings.business_phone}`} className="hover:text-stone transition-colors">
                      {formatPhone(settings.business_phone)}
                    </a>
                  </p>
                )}
                {settings.business_address && (
                  <p className="text-muted-foreground">{settings.business_address}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
                Navigation
              </h3>
              <ul className="space-y-3 text-sm">
                {navLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
                Social
              </h3>
              <div className="flex flex-col gap-2 text-sm">
                {settings.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    Instagram
                  </a>
                )}
                {settings.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    Facebook
                  </a>
                )}
                {settings.tiktok_url && (
                  <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    TikTok
                  </a>
                )}
                {!settings.instagram_url && !settings.facebook_url && !settings.tiktok_url && (
                  <span className="text-muted-foreground">Coming soon</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} MAD Photography. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
