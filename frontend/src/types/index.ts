export interface User {
  id: string;
  email: string;
  role: 'admin' | 'client';
  name: string;
  phone?: string;
  is_active: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  client_id: string;
  status: 'active' | 'delivered' | 'archived';
  cover_image_key?: string;
  categories: string[];
  share_link_token?: string;
  share_link_expires_at?: string;
  project_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: string;
  project_id: string;
  original_url?: string;
  compressed_url?: string;
  thumbnail_url?: string;
  watermarked_url?: string;
  filename: string;
  mime_type: string;
  width: number;
  height: number;
  size_bytes: number;
  compressed_size_bytes: number;
  sort_order: number;
  uploaded_at: string;
  is_selected: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  image_url?: string;
  thumbnail_url?: string;
  sort_order: number;
  is_visible: boolean;
}

export interface PricingPackage {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  price_display: string;
  features: string[];
  is_custom: boolean;
  sort_order: number;
  is_visible: boolean;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  package_id?: string;
  message: string;
  event_date?: string;
  event_time?: string;
  event_duration?: string;
  status: 'new' | 'contacted' | 'booked' | 'closed';
  created_at: string;
}

export interface Review {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  is_approved: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  project_id?: string;
  stripe_invoice_id: string;
  amount_cents: number;
  status: 'draft' | 'sent' | 'paid' | 'void';
  due_date: string;
  line_items: { description: string; amount_cents: number; quantity: number }[];
  token: string;
  created_at: string;
  paid_at?: string;
}

export interface SiteSetting {
  key: string;
  value: unknown;
}

export interface DashboardStats {
  active_projects: number;
  delivered_projects: number;
  pending_inquiries: number;
  pending_reviews: number;
  total_clients: number;
  total_revenue_cents: number;
}
