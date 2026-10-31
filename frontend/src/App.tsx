import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/ui/LoadingSpinner';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

// Layouts
import PublicLayout from './components/layout/PublicLayout';
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const ClientLayout = lazy(() => import('./components/layout/ClientLayout'));

// Public pages
import Home from './pages/public/Home';
import Portfolio from './pages/public/Portfolio';
import Pricing from './pages/public/Pricing';
import About from './pages/public/About';
import Reviews from './pages/public/Reviews';

// Auth pages
const Login = lazy(() => import('./pages/auth/Login'));
const SetPassword = lazy(() => import('./pages/auth/SetPassword'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

// Gallery pages
const SharedGallery = lazy(() => import('./pages/gallery/SharedGallery'));
const ImageView = lazy(() => import('./pages/gallery/ImageView'));

// Public invoice
const InvoicePublic = lazy(() => import('./pages/public/InvoicePublic'));

// Admin pages
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const PortfolioManager = lazy(() => import('./pages/admin/PortfolioManager'));
const PricingManager = lazy(() => import('./pages/admin/PricingManager'));
const InquiryList = lazy(() => import('./pages/admin/InquiryList'));
const ReviewManager = lazy(() => import('./pages/admin/ReviewManager'));
const ProjectList = lazy(() => import('./pages/admin/ProjectList'));
const ProjectNew = lazy(() => import('./pages/admin/ProjectNew'));
const ProjectDetail = lazy(() => import('./pages/admin/ProjectDetail'));
const ClientList = lazy(() => import('./pages/admin/ClientList'));
const InvoiceList = lazy(() => import('./pages/admin/InvoiceList'));
const InvoiceCreate = lazy(() => import('./pages/admin/InvoiceCreate'));
const SiteSettings = lazy(() => import('./pages/admin/SiteSettings'));
const GalleryConsents = lazy(() => import('./pages/admin/GalleryConsents'));

// Client pages
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const InvoiceView = lazy(() => import('./pages/client/InvoiceView'));

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: 'admin' | 'client' }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner size="lg" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Suspense fallback={<LoadingSpinner size="lg" />}>
    <Routes>
      {/* Public pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/reviews" element={<Reviews />} />
      </Route>

      {/* Auth pages (standalone layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/set-password/:token" element={<SetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Shared gallery (standalone layout) */}
      <Route path="/gallery/:token" element={<SharedGallery />} />
      <Route path="/gallery/:token/:mediaId" element={<ImageView />} />

      {/* Public invoice (no auth required) */}
      <Route path="/invoice/:token" element={<InvoicePublic />} />

      {/* Admin pages */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="portfolio" element={<PortfolioManager />} />
        <Route path="pricing" element={<PricingManager />} />
        <Route path="inquiries" element={<InquiryList />} />
        <Route path="reviews" element={<ReviewManager />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="projects/new" element={<ProjectNew />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="clients" element={<ClientList />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="invoices/new" element={<InvoiceCreate />} />
        <Route path="gallery-consents" element={<GalleryConsents />} />
        <Route path="settings" element={<SiteSettings />} />
      </Route>

      {/* Client pages */}
      <Route
        path="/client"
        element={
          <ProtectedRoute role="client">
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientDashboard />} />
        <Route path="invoices/:id" element={<InvoiceView />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>
  );
}
