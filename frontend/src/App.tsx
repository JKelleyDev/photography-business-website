import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import ClientLayout from './components/layout/ClientLayout';

// Public pages
import Home from './pages/public/Home';
import Portfolio from './pages/public/Portfolio';
import Pricing from './pages/public/Pricing';
import About from './pages/public/About';
import Reviews from './pages/public/Reviews';

// Auth pages
import Login from './pages/auth/Login';
import SetPassword from './pages/auth/SetPassword';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Gallery pages
import SharedGallery from './pages/gallery/SharedGallery';
import ImageView from './pages/gallery/ImageView';

// Public invoice
import InvoicePublic from './pages/public/InvoicePublic';

// Admin pages
import Dashboard from './pages/admin/Dashboard';
import PortfolioManager from './pages/admin/PortfolioManager';
import PricingManager from './pages/admin/PricingManager';
import InquiryList from './pages/admin/InquiryList';
import ReviewManager from './pages/admin/ReviewManager';
import ProjectList from './pages/admin/ProjectList';
import ProjectNew from './pages/admin/ProjectNew';
import ProjectDetail from './pages/admin/ProjectDetail';
import ClientList from './pages/admin/ClientList';
import InvoiceList from './pages/admin/InvoiceList';
import InvoiceCreate from './pages/admin/InvoiceCreate';
import SiteSettings from './pages/admin/SiteSettings';

// Client pages
import ClientDashboard from './pages/client/ClientDashboard';
import InvoiceView from './pages/client/InvoiceView';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: 'admin' | 'client' }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner size="lg" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
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
  );
}
