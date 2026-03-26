# MAD Photography — Project Specification

## Overview

MAD Photography is a full-service photography business web application. It serves two audiences: **public visitors** (potential and existing clients) and the **business owner/administrator**. The platform handles portfolio display, pricing/inquiries, client project delivery with secure shareable galleries, payments/invoicing, and optional Shutterfly export for print fulfillment.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React (Vite + TypeScript) | Component-driven UI, strong ecosystem |
| Backend | Python (FastAPI) | Async performance, clean API design, strong library support for image processing and S3 |
| Database | MongoDB (via Motor async driver) | Flexible document model fits project/media metadata well |
| Object Storage | AWS S3 | Cost-effective media storage with presigned URL support for secure delivery |
| Image Processing | Pillow / sharp (or server-side Lambda) | Thumbnail generation, compression, format conversion |
| Authentication | JWT (access + refresh tokens) | Stateless auth for API; httpOnly cookies for refresh tokens |
| Payments | Stripe | Industry-standard payment processing, invoicing API, and hosted checkout |
| Email | SendGrid or AWS SES | Transactional emails (invoices, project links, inquiry confirmations) |
| Deployment | Vercel (frontend + backend serverless functions) | GitHub repo auto-deploy, edge network, serverless Python support |
| Dev Environment | Docker Compose (local dev) | Consistent local MongoDB + backend for development |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 React Frontend                   │
│  (Public Site / Admin Dashboard / Client Portal) │
└──────────────────────┬──────────────────────────┘
                       │ REST API (JSON)
┌──────────────────────▼──────────────────────────┐
│              FastAPI Backend                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Auth     │ │ Projects │ │ Payments/Invoice │ │
│  │ Service  │ │ Service  │ │ Service (Stripe) │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Media    │ │ Gallery  │ │ Shutterfly       │ │
│  │ Service  │ │ Service  │ │ Export Service   │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└───────┬──────────────┬──────────────────────────┘
        │              │
   ┌────▼────┐    ┌────▼────┐
   │ MongoDB │    │ AWS S3  │
   └─────────┘    └─────────┘
```

---

## Data Models (MongoDB Collections)

### `users`
```json
{
  "_id": "ObjectId",
  "email": "string (unique)",
  "password_hash": "string (bcrypt)",
  "role": "admin | client",
  "name": "string",
  "phone": "string | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "is_active": "boolean"
}
```
- **Admin accounts** are created via CLI seed command or by an existing admin. There is no public admin registration.
- **Client accounts** are created by the admin when starting a project. The client receives an email invite to set their password. Clients can also be created on-demand when they submit an inquiry that converts to a booking.

### `projects`
```json
{
  "_id": "ObjectId",
  "title": "string",
  "description": "string",
  "client_id": "ObjectId (ref: users)",
  "status": "active | delivered | archived",
  "cover_image_key": "string (S3 key) | null",
  "categories": ["string"],
  "share_link_token": "string (unique, URL-safe)",
  "share_link_expires_at": "datetime | null",
  "project_expires_at": "datetime | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```
- `share_link_token`: Generated when admin marks project as delivered. Used in the public gallery URL (`/gallery/{token}`).
- `project_expires_at`: When set, a background job archives the project (moves media to S3 Glacier or deletes) after this date.

### `media`
```json
{
  "_id": "ObjectId",
  "project_id": "ObjectId (ref: projects)",
  "original_key": "string (S3 key, full-res original)",
  "compressed_key": "string (S3 key, web-optimized)",
  "thumbnail_key": "string (S3 key, thumbnail)",
  "filename": "string (original filename)",
  "mime_type": "string",
  "width": "number",
  "height": "number",
  "size_bytes": "number (original size)",
  "compressed_size_bytes": "number",
  "sort_order": "number",
  "uploaded_at": "datetime",
  "is_selected": "boolean (client selection flag, default false)"
}
```
- Three S3 keys per image: original (full resolution, stored but not served directly), compressed (web-quality for gallery viewing), and thumbnail (for grid layouts).

### `portfolio_items`
```json
{
  "_id": "ObjectId",
  "title": "string",
  "description": "string | null",
  "category": "string",
  "image_key": "string (S3 key)",
  "thumbnail_key": "string (S3 key)",
  "sort_order": "number",
  "is_visible": "boolean",
  "created_at": "datetime"
}
```

### `pricing_packages`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "price_cents": "number",
  "price_display": "string (e.g. 'Starting at $500')",
  "features": ["string"],
  "is_custom": "boolean (if true, displayed as 'Contact for pricing')",
  "sort_order": "number",
  "is_visible": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### `inquiries`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string",
  "phone": "string | null",
  "package_id": "ObjectId | null (ref: pricing_packages)",
  "message": "string",
  "event_date": "datetime | null",
  "status": "new | contacted | booked | closed",
  "created_at": "datetime"
}
```

### `reviews`
```json
{
  "_id": "ObjectId",
  "author_name": "string",
  "email": "string",
  "rating": "number (1-5)",
  "body": "string",
  "is_approved": "boolean (default false)",
  "project_id": "ObjectId | null",
  "created_at": "datetime"
}
```
- Reviews require admin approval before they appear publicly. This prevents spam and lets the business owner curate.

### `invoices`
```json
{
  "_id": "ObjectId",
  "client_id": "ObjectId (ref: users)",
  "project_id": "ObjectId | null (ref: projects)",
  "stripe_invoice_id": "string",
  "amount_cents": "number",
  "status": "draft | sent | paid | void",
  "due_date": "datetime",
  "line_items": [
    {
      "description": "string",
      "amount_cents": "number",
      "quantity": "number"
    }
  ],
  "created_at": "datetime",
  "paid_at": "datetime | null"
}
```

### `site_settings`
```json
{
  "_id": "ObjectId",
  "key": "string (unique)",
  "value": "any"
}
```
- Stores admin-editable settings: business phone, email, address, social links, about page content, homepage hero text, etc.

---

## API Route Structure

### Public Routes (no auth)
```
GET    /api/portfolio              — List visible portfolio items (paginated)
GET    /api/portfolio/:id          — Single portfolio item
GET    /api/pricing                — List visible pricing packages
POST   /api/inquiries              — Submit inquiry form
GET    /api/reviews                — List approved reviews (paginated)
POST   /api/reviews                — Submit a review (goes to pending)
GET    /api/settings/:key          — Get a public site setting
GET    /api/gallery/:token         — Get project gallery by share link token (checks expiration)
GET    /api/gallery/:token/media   — List media for shared gallery
POST   /api/gallery/:token/select  — Client selects/deselects images
GET    /api/gallery/:token/download         — Download selected images (zip)
GET    /api/gallery/:token/download-all     — Download all images (zip)
POST   /api/gallery/:token/shutterfly-export — Initiate Shutterfly export
```

### Auth Routes
```
POST   /api/auth/login             — Login (returns JWT)
POST   /api/auth/refresh           — Refresh access token
POST   /api/auth/logout            — Invalidate refresh token
POST   /api/auth/set-password      — Set password from invite token
POST   /api/auth/forgot-password   — Request password reset
POST   /api/auth/reset-password    — Reset password with token
```

### Admin Routes (require admin role)
```
# Portfolio
POST   /api/admin/portfolio            — Add portfolio item
PUT    /api/admin/portfolio/:id         — Update portfolio item
DELETE /api/admin/portfolio/:id         — Delete portfolio item
PUT    /api/admin/portfolio/reorder     — Reorder portfolio items

# Pricing
POST   /api/admin/pricing              — Create package
PUT    /api/admin/pricing/:id          — Update package
DELETE /api/admin/pricing/:id          — Delete package

# Inquiries
GET    /api/admin/inquiries            — List all inquiries
PUT    /api/admin/inquiries/:id        — Update inquiry status

# Reviews
GET    /api/admin/reviews              — List all reviews (including unapproved)
PUT    /api/admin/reviews/:id          — Approve/reject/edit review
DELETE /api/admin/reviews/:id          — Delete review

# Projects
GET    /api/admin/projects             — List all projects
POST   /api/admin/projects             — Create project (also creates client account if needed)
GET    /api/admin/projects/:id         — Get project details
PUT    /api/admin/projects/:id         — Update project metadata
DELETE /api/admin/projects/:id         — Delete project (and all associated media)
POST   /api/admin/projects/:id/deliver — Generate share link, set expiration, notify client
PUT    /api/admin/projects/:id/archive — Archive project (move media to cold storage)

# Media (within a project)
POST   /api/admin/projects/:id/media          — Upload media (multipart; server compresses + generates thumbnails)
DELETE /api/admin/projects/:id/media/:mediaId  — Delete single media item
PUT    /api/admin/projects/:id/media/reorder   — Reorder media

# Clients
GET    /api/admin/clients              — List client accounts
POST   /api/admin/clients              — Create client account (sends invite email)

# Invoices
GET    /api/admin/invoices             — List all invoices
POST   /api/admin/invoices             — Create invoice (creates in Stripe, stores locally)
PUT    /api/admin/invoices/:id/send    — Send invoice to client via Stripe
GET    /api/admin/invoices/:id         — Get invoice details

# Settings
GET    /api/admin/settings             — Get all settings
PUT    /api/admin/settings/:key        — Update a setting

# Dashboard
GET    /api/admin/dashboard            — Summary stats (active projects, pending inquiries, revenue)
```

### Client Routes (require client role)
```
GET    /api/client/projects            — List own projects
GET    /api/client/invoices            — List own invoices
POST   /api/client/invoices/:id/pay    — Pay invoice (redirects to Stripe Checkout)
```

---

## Frontend Pages & Routes

### Public
| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero image, brief intro, CTA to portfolio and contact |
| `/portfolio` | Portfolio Gallery | Filterable grid of portfolio images with lightbox view |
| `/pricing` | Pricing | Package cards + custom inquiry form |
| `/about` | About Us | Business story, team photos, mission |
| `/reviews` | Reviews | Approved reviews list + "Leave a Review" form |
| `/gallery/:token` | Client Gallery | Shared project gallery (public via token, respects expiration) |
| `/gallery/:token/:mediaId` | Image View | Full-size image view within shared gallery |

### Auth
| Route | Page |
|-------|------|
| `/login` | Login form |
| `/set-password/:token` | Set password from invite |
| `/forgot-password` | Forgot password form |
| `/reset-password/:token` | Reset password form |

### Admin (`/admin/*` — protected, admin role required)
| Route | Page |
|-------|------|
| `/admin` | Dashboard (stats overview) |
| `/admin/portfolio` | Manage portfolio items (CRUD, drag-to-reorder) |
| `/admin/pricing` | Manage pricing packages |
| `/admin/inquiries` | View/manage inquiries |
| `/admin/reviews` | Moderate reviews |
| `/admin/projects` | Project list |
| `/admin/projects/new` | Create new project |
| `/admin/projects/:id` | Project detail — upload media, manage, deliver |
| `/admin/clients` | Client list |
| `/admin/invoices` | Invoice list |
| `/admin/invoices/new` | Create invoice |
| `/admin/settings` | Site settings (contact info, about content, social links) |

### Client (`/client/*` — protected, client role required)
| Route | Page |
|-------|------|
| `/client` | Client dashboard (their projects, invoices) |
| `/client/invoices/:id` | View and pay invoice |

---

## Key Feature Specifications

### 1. Image Upload & Compression Pipeline

When media is uploaded to a project:
1. Accept the file via multipart upload on the backend.
2. Validate file type (JPEG, PNG, TIFF, HEIC, RAW formats) and size (configurable max, e.g. 50MB).
3. Store the **original** file in S3 under `projects/{project_id}/originals/{uuid}.{ext}`.
4. Generate a **compressed web version** using Pillow:
   - Convert to JPEG (or WebP if browser support is acceptable).
   - Resize longest edge to 2048px if larger.
   - Quality 80-85%.
   - Store under `projects/{project_id}/compressed/{uuid}.jpg`.
5. Generate a **thumbnail**:
   - Resize to 400px on longest edge.
   - Quality 70%.
   - Store under `projects/{project_id}/thumbnails/{uuid}.jpg`.
6. Extract and store metadata (dimensions, file size, EXIF data if relevant).
7. Save the `media` document to MongoDB.

For bulk uploads, process images asynchronously. Use a task queue (e.g., Celery with Redis, or Python `asyncio` background tasks for simpler setups). Return upload status via polling or WebSocket.

### 2. Shareable Client Gallery & Link Expiration

- Admin clicks "Deliver Project" on a project page.
- Backend generates a cryptographically random URL-safe token (e.g., `secrets.token_urlsafe(32)`).
- Admin sets an optional expiration date for the link.
- Client receives an email with the gallery link: `https://madphotography.com/gallery/{token}`.
- The gallery page:
  - Checks token validity and expiration on every load.
  - Displays a responsive image grid (thumbnails) with lazy loading.
  - Clicking an image opens a lightbox/full-view with the compressed version.
  - Client can toggle "select" on individual images.
  - "Download Selected" button generates a zip of original-resolution selected images via S3 presigned URLs.
  - "Download All" button generates a zip of all original-resolution images.
  - For large downloads, generate the zip asynchronously and email the client a download link, or stream the zip.

### 3. Project Expiration & Archival

- Each project can have a `project_expires_at` date set by admin.
- A scheduled background job (cron or periodic task) runs daily:
  - Finds projects past their expiration date.
  - Moves media from S3 Standard to S3 Glacier Deep Archive (or deletes, based on admin preference stored in settings).
  - Sets project status to `archived`.
  - Optionally notifies the client before expiration (e.g., 7 days prior).
- Archived projects are viewable in admin but the gallery link returns a "Gallery no longer available" message.

### 4. Payments & Invoicing (Stripe)

- Use **Stripe Invoicing API** for creating and sending invoices.
- Flow:
  1. Admin creates an invoice in the app, specifying line items (e.g., "Wedding Photography Package — $2,500", "Additional prints — $150").
  2. Backend creates a corresponding Stripe Invoice object via the API.
  3. Admin clicks "Send" — Stripe sends the invoice email to the client with a hosted payment page.
  4. Client pays via Stripe's hosted invoice page (supports card, ACH, etc.).
  5. Stripe fires a webhook (`invoice.paid`) — backend updates local invoice status.
- The app's invoice list shows real-time status synced from Stripe.
- Clients can also view and pay invoices from their `/client` dashboard, which redirects to the Stripe hosted page.
- **Stripe Connect is not needed** since MAD Photography is the sole merchant.

### 5. Shutterfly Export Integration

Shutterfly does not offer a public API for third-party cart injection. The recommended approach:

- **Option A — Shutterfly Open API (if available/approved):** Apply for Shutterfly's developer program. If approved, use their API to create a cart pre-populated with the client's selected images. The client is then redirected to Shutterfly to complete the order.
- **Option B — Practical fallback (recommended to start):** Provide a "Prepare for Print" feature:
  1. Client selects images in their gallery.
  2. Clicks "Export for Printing".
  3. Backend generates a zip of the selected images at full resolution (original files).
  4. Client downloads the zip.
  5. The UI displays a direct link to Shutterfly's upload page with clear instructions: "Upload your downloaded photos to Shutterfly to order prints."
  6. This is a clean UX that doesn't depend on an unstable third-party API.
- **Option C — Future enhancement:** If Shutterfly provides an embeddable widget or upload API, integrate it so images transfer directly without the client downloading first. Reassess when Shutterfly developer access is obtained.

Start with **Option B**. It delivers the "full-service feel" without a fragile third-party dependency.

### 6. Reviews System

- Public reviews page shows only approved reviews.
- Anyone can submit a review (name, email, rating 1-5, text body).
- Submitted reviews default to `is_approved: false`.
- Admin reviews page shows all reviews with approve/reject actions.
- Optional: If the reviewer's email matches a client account, the review can be linked to a project for context.

### 7. Authentication & Authorization

- **Admin accounts**: Seeded via CLI. No public registration for admin.
- **Client accounts**: Created by admin (or auto-created when a project is created for a new client email). Client receives an email invite with a set-password link.
- **JWT auth**: Short-lived access tokens (15 min), long-lived refresh tokens (7 days) stored in httpOnly cookies.
- **Role-based middleware**: `admin` and `client` roles enforced at the route level.
- **Gallery token access**: Shared gallery routes do NOT require authentication. Access is controlled solely by the token and its expiration. This allows clients to share with family/friends without requiring accounts.

---

## Project Directory Structure

```
mad-photography/
├── claude.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py                  # FastAPI app initialization
│   │   ├── config.py                # Settings from environment variables
│   │   ├── database.py              # MongoDB connection (Motor)
│   │   ├── dependencies.py          # Dependency injection (auth, db session)
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── media.py
│   │   │   ├── portfolio.py
│   │   │   ├── pricing.py
│   │   │   ├── inquiry.py
│   │   │   ├── review.py
│   │   │   ├── invoice.py
│   │   │   └── settings.py
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── media.py
│   │   │   ├── portfolio.py
│   │   │   ├── pricing.py
│   │   │   ├── inquiry.py
│   │   │   ├── review.py
│   │   │   ├── invoice.py
│   │   │   └── settings.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── public.py            # Portfolio, pricing, reviews, settings
│   │   │   ├── gallery.py           # Shared gallery routes (token-based)
│   │   │   ├── admin/
│   │   │   │   ├── portfolio.py
│   │   │   │   ├── pricing.py
│   │   │   │   ├── inquiries.py
│   │   │   │   ├── reviews.py
│   │   │   │   ├── projects.py
│   │   │   │   ├── media.py
│   │   │   │   ├── clients.py
│   │   │   │   ├── invoices.py
│   │   │   │   ├── settings.py
│   │   │   │   └── dashboard.py
│   │   │   └── client/
│   │   │       ├── projects.py
│   │   │       └── invoices.py
│   │   ├── services/
│   │   │   ├── auth.py              # JWT creation, password hashing
│   │   │   ├── s3.py                # S3 upload, presigned URLs, lifecycle
│   │   │   ├── image_processing.py  # Compression, thumbnails, format conversion
│   │   │   ├── email.py             # SendGrid/SES transactional emails
│   │   │   ├── stripe_service.py    # Stripe invoice creation, webhook handling
│   │   │   └── archival.py          # Project expiration & archival logic
│   │   ├── tasks/
│   │   │   └── background.py        # Background task definitions (image processing, archival)
│   │   ├── middleware/
│   │   │   └── auth.py              # JWT verification, role checking
│   │   └── utils/
│   │       ├── tokens.py            # Share link token generation
│   │       └── zip_stream.py        # Streaming zip creation for downloads
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_projects.py
│       ├── test_media.py
│       ├── test_gallery.py
│       ├── test_invoices.py
│       └── test_reviews.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   ├── client.ts             # Axios/fetch wrapper with auth interceptors
│       │   ├── auth.ts
│       │   ├── portfolio.ts
│       │   ├── pricing.ts
│       │   ├── reviews.ts
│       │   ├── gallery.ts
│       │   ├── projects.ts
│       │   ├── invoices.ts
│       │   └── settings.ts
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.tsx
│       │   │   ├── Footer.tsx
│       │   │   ├── AdminLayout.tsx
│       │   │   └── PublicLayout.tsx
│       │   ├── ui/                    # Reusable UI primitives
│       │   │   ├── Button.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── ImageGrid.tsx
│       │   │   ├── Lightbox.tsx
│       │   │   ├── FileUploader.tsx
│       │   │   ├── StarRating.tsx
│       │   │   └── LoadingSpinner.tsx
│       │   ├── portfolio/
│       │   │   └── PortfolioGrid.tsx
│       │   ├── gallery/
│       │   │   ├── GalleryGrid.tsx
│       │   │   ├── ImageViewer.tsx
│       │   │   └── SelectionToolbar.tsx
│       │   ├── reviews/
│       │   │   ├── ReviewCard.tsx
│       │   │   └── ReviewForm.tsx
│       │   └── admin/
│       │       ├── MediaUploader.tsx
│       │       ├── ProjectForm.tsx
│       │       ├── PricingEditor.tsx
│       │       └── InvoiceBuilder.tsx
│       ├── pages/
│       │   ├── public/
│       │   │   ├── Home.tsx
│       │   │   ├── Portfolio.tsx
│       │   │   ├── Pricing.tsx
│       │   │   ├── About.tsx
│       │   │   └── Reviews.tsx
│       │   ├── auth/
│       │   │   ├── Login.tsx
│       │   │   ├── SetPassword.tsx
│       │   │   ├── ForgotPassword.tsx
│       │   │   └── ResetPassword.tsx
│       │   ├── gallery/
│       │   │   ├── SharedGallery.tsx
│       │   │   └── ImageView.tsx
│       │   ├── admin/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── PortfolioManager.tsx
│       │   │   ├── PricingManager.tsx
│       │   │   ├── InquiryList.tsx
│       │   │   ├── ReviewManager.tsx
│       │   │   ├── ProjectList.tsx
│       │   │   ├── ProjectDetail.tsx
│       │   │   ├── ClientList.tsx
│       │   │   ├── InvoiceList.tsx
│       │   │   ├── InvoiceCreate.tsx
│       │   │   └── SiteSettings.tsx
│       │   └── client/
│       │       ├── ClientDashboard.tsx
│       │       └── InvoiceView.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useGallery.ts
│       │   └── useImageUpload.ts
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── types/
│       │   └── index.ts              # Shared TypeScript interfaces
│       ├── utils/
│       │   ├── formatCurrency.ts
│       │   └── dateHelpers.ts
│       └── styles/
│           └── globals.css
└── scripts/
    ├── seed_admin.py                  # CLI script to create initial admin user
    └── run_archival.py                # Manually trigger archival job
```

---

## Environment Variables

```env
# Backend
MONGO_URI=mongodb://localhost:27017/mad_photography
JWT_SECRET=<random-256-bit-key>
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# AWS
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_REGION=us-east-1
S3_BUCKET_NAME=mad-photography-media

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SENDGRID_API_KEY=SG....
FROM_EMAIL=hello@madphotography.com

# App
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
ADMIN_SEED_EMAIL=admin@madphotography.com
```

---

## Implementation Order

Build in this sequence to always have a working, testable system:

### Phase 1 — Foundation
1. Initialize the backend (FastAPI project scaffolding, config, MongoDB connection).
2. Initialize the frontend (Vite + React + TypeScript scaffolding, routing).
3. Implement the `users` model and auth system (register admin via seed script, login, JWT middleware).
4. Build the admin layout shell with protected routes.
5. Build the public layout shell with routing for all public pages.

### Phase 2 — Public Site & Admin Content Management
6. Implement `site_settings` CRUD (admin can edit contact info, about content).
7. Build the About Us page (renders from site_settings).
8. Implement `portfolio_items` CRUD with S3 upload (admin).
9. Build the public Portfolio Gallery page with lightbox.
10. Implement `pricing_packages` CRUD (admin).
11. Build the public Pricing page with inquiry form.
12. Implement `inquiries` submission and admin list/status management.
13. Implement `reviews` submission, admin moderation, public display.

### Phase 3 — Projects & Media
14. Implement `projects` CRUD (admin).
15. Implement media upload endpoint with image compression pipeline.
16. Build admin project detail page with media uploader (drag-and-drop, bulk upload, progress indicators).
17. Implement media reordering and deletion.
18. Build client account creation (admin-initiated, invite email flow).

### Phase 4 — Client Gallery & Delivery
19. Implement share link generation and project delivery endpoint.
20. Build the shared gallery page (token-based access, grid view, lightbox).
21. Implement image selection (client toggles selections).
22. Implement download selected (zip generation from S3 originals).
23. Implement download all.
24. Build gallery link expiration checking.
25. Implement the Shutterfly export flow (Option B — zip download + instructions).

### Phase 5 — Payments & Invoicing
26. Integrate Stripe: create invoices, send, handle webhooks.
27. Build admin invoice creation and management pages.
28. Build client invoice view and payment redirect.
29. Add payment status tracking and dashboard revenue stats.

### Phase 6 — Archival & Polish
30. Implement project expiration and archival background job.
31. Add expiration warning emails to clients.
32. Build admin dashboard with summary stats.
33. Add responsive design polish, loading states, error handling across all pages.
34. Write tests for critical paths (auth, media upload, gallery access, payments).
35. Dockerize backend and frontend, create docker-compose for local dev.

---

## Deployment (Vercel + GitHub)

- **Repository**: Single GitHub monorepo (`mad-photography`) containing both `frontend/` and `backend/`.
- **Frontend**: Deployed as a Vercel project. Vite builds to static assets. Vercel handles CDN, edge caching, and SSL automatically.
- **Backend**: Deployed as Vercel Serverless Functions (Python runtime). The FastAPI app is adapted using the `mangum`-style adapter or Vercel's native Python support (`api/` directory pattern). Each API route maps to a serverless function or a single catch-all function that delegates to FastAPI's router.
- **Auto-deploy**: Push to `main` triggers production deploy. PRs generate preview deployments for testing.
- **Environment variables**: Stored in Vercel's project settings (MongoDB URI, AWS keys, Stripe keys, JWT secret, etc.). Never committed to the repo.
- **Considerations for serverless**:
  - **Cold starts**: Keep function bundles lean. Lazy-load heavy dependencies (Pillow, boto3) where possible.
  - **Execution time limits**: Vercel Pro allows up to 300s for serverless functions. Image compression and zip generation for large batches may need to be offloaded to an external worker (e.g., AWS Lambda triggered via SQS, or a lightweight always-on service on Railway/Render for heavy background jobs).
  - **File uploads**: Vercel has a request body size limit (4.5MB on free, 50MB on Pro). For media uploads, use **presigned S3 upload URLs** — the frontend uploads directly to S3, then notifies the backend to process (compress, thumbnail) the uploaded file. This bypasses Vercel's body size limit entirely.
  - **Background tasks**: FastAPI's `BackgroundTasks` will not reliably survive after the response is sent in a serverless context. Use a separate trigger pattern: after S3 upload notification, invoke an async processing function (another Vercel function, or an external queue worker).
  - **MongoDB connection pooling**: Use a connection pool with a small `maxPoolSize` (e.g., 5) to avoid exhausting connections across serverless instances. MongoDB Atlas serverless or shared tier is recommended.
- **Domain**: Custom domain configured in Vercel (e.g., `madphotography.com`). API routes served under `/api/*`.

---

## Design & UX Guidelines

### General
- **Typography**: Clean, modern sans-serif (e.g., Inter or similar via Google Fonts).
- **Color scheme**: Neutral base (white/off-white backgrounds, dark text) with a single accent color chosen by the client. Keep it minimal so photos are the focal point.
- **Image-first design**: Portfolio and gallery pages should maximize image display area. Minimal chrome.
- **Lightbox**: Smooth transitions, keyboard navigation (arrow keys, escape), swipe on mobile.

### Client-Facing Pages (Mobile-Priority)
Clients will primarily access the public site, shared galleries, and payment pages from **mobile devices**. These pages must be optimized for touch and small screens:

- **Mobile-first responsive design**: Build layouts mobile-first, then enhance for larger screens. Use CSS container queries or breakpoints (`sm`, `md`, `lg`).
- **Touch-friendly targets**: Buttons and interactive elements minimum 44x44px tap target. Generous spacing between actionable items.
- **Image loading performance**:
  - Serve thumbnails in gallery grids, compressed versions in lightbox. Never load originals in-browser.
  - Use `loading="lazy"` and `IntersectionObserver`-based lazy loading for gallery grids.
  - Serve images in WebP format with JPEG fallback. Use `<picture>` element or `srcset` for responsive image sizes.
  - Implement progressive/skeleton loading — show blurred thumbnail placeholders while full images load.
- **Gallery navigation**: Swipe gestures for lightbox image navigation on mobile. Pinch-to-zoom support.
- **Image selection UX**: Clear visual checkmarks/overlays for selecting images. Sticky bottom toolbar showing selection count + action buttons (Download Selected, Export for Print).
- **Smooth scrolling**: Virtualized/windowed lists for galleries with 100+ images (e.g., `react-window` or `react-virtuoso`) to prevent jank.
- **Offline resilience**: Graceful handling if network drops mid-gallery-browse. Cache loaded thumbnails.
- **Download flow on mobile**: Since mobile browsers handle zip downloads differently, provide clear instructions or consider offering individual image downloads as an alternative to zip on mobile.
- **Navigation**: Bottom navigation bar or hamburger menu. Keep navigation minimal — clients care about viewing images and taking action, not exploring the site.
- **Page speed**: Target Lighthouse mobile score of 90+. Minimize JS bundle size. Code-split by route.

### Admin Pages (Desktop-Optimized)
Admin work (uploading media, managing projects, creating invoices) will primarily happen on **desktop**. Optimize for productivity on larger screens while keeping basic mobile usability:

- **Desktop-first layout**: Side navigation panel + main content area. Data tables with sortable columns, bulk actions, and inline editing where appropriate.
- **Drag-and-drop**: Portfolio and media reordering via drag-and-drop (e.g., `@dnd-kit/core`). Drag-and-drop file upload zones for media.
- **Bulk upload UX**: Multi-file upload with per-file progress bars, cancel/retry per file, overall batch progress. Upload queue that processes files in parallel (e.g., 3 concurrent uploads).
- **Responsive fallback**: Admin pages should still be *usable* on tablet/mobile (stacked layout, collapsible sidebar) for quick checks on the go, but don't optimize for mobile-first.
- **Admin UI library**: Consider Radix UI or Headless UI for accessible primitives (modals, dropdowns, tabs). Style with Tailwind CSS for utility-first consistency across public and admin.

---

## Security Considerations

- All passwords hashed with bcrypt (cost factor 12+).
- JWT access tokens are short-lived. Refresh tokens stored in httpOnly, secure, sameSite cookies.
- S3 media served via presigned URLs with short expiration (e.g., 15 minutes), not public bucket access.
- Gallery share tokens are 256-bit random values — not guessable.
- File upload validation: check MIME type, file extension, and magic bytes. Reject unexpected file types.
- Rate limiting on public endpoints (inquiry submission, review submission, auth endpoints).
- CORS configured to only allow the frontend origin.
- Stripe webhook signature verification on all webhook endpoints.
- Input sanitization on all user-submitted text (XSS prevention).
- Admin-only routes protected by role middleware, not just authentication.

---

## Open Decisions & Notes

1. **Shutterfly integration**: Starting with Option B (zip + redirect). Revisit if/when Shutterfly developer API access is obtained.
2. **Background task runner**: Node.js processes image uploads synchronously within the request handler (sharp is fast). For large batches, Vercel's 300s function timeout should be sufficient. If it becomes an issue, consider offloading to an AWS Lambda trigger via S3 event.
3. **RAW file support**: `sharp` (via libvips) supports JPEG, PNG, WebP, TIFF, HEIC. For RAW formats (CR2, NEF, ARW), a pre-processing step would be needed. Clarify with client which camera formats they shoot in.
4. **Video support**: The current spec covers photo media only. If video is needed, the compression pipeline and storage strategy will need separate handling.
5. **CDN**: For production, consider putting CloudFront in front of S3 for faster media delivery. Not required for MVP.
6. **Heavy background jobs**: Vercel serverless has execution time limits. For large batch image processing or zip generation of 100+ images, may need an external worker service (AWS Lambda via SQS, or a small always-on service on Railway/Render). Evaluate once upload volumes are understood.
7. **Vercel plan tier**: Pro plan recommended for 50MB request body limit (even though we use presigned S3 uploads), 300s function timeout, and team collaboration features. Evaluate if Hobby tier suffices for launch.

---

## Node.js Backend Migration Plan

### Motivation

The Python/FastAPI backend, while capable, requires a Python runtime that adds deployment complexity and a separate service tier. Migrating to Node.js/TypeScript aligns the entire stack to a single language, simplifies Vercel serverless deployment (Node.js is Vercel's first-class runtime), eliminates the need for Docker/uvicorn in production, and allows sharing TypeScript types between frontend and backend in the future.

**What stays the same:**
- React/Vite/TypeScript frontend (zero changes to UI or logic)
- MongoDB database and all existing data
- AWS S3 bucket and media keys
- Stripe integration
- SendGrid email integration
- All API route contracts (same URLs, same request/response shapes)

---

### New Backend Tech Stack

| Python (current) | Node.js (new) | Purpose |
|-----------------|---------------|---------|
| FastAPI | Express.js + TypeScript | HTTP framework |
| Motor / PyMongo | mongodb (official Node driver) | MongoDB async driver |
| Pydantic | zod | Request validation & schema |
| python-jose | jsonwebtoken | JWT creation & verification |
| bcrypt | bcryptjs | Password hashing (pure JS, serverless-safe) |
| boto3 | @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner | AWS S3 operations |
| Pillow | sharp | Image compression & thumbnail generation |
| stripe | stripe (Node SDK) | Stripe Invoicing API |
| sendgrid | @sendgrid/mail | Transactional emails |
| python-multipart | multer | Multipart file upload handling |
| archival / zipfile | archiver | Streaming zip creation |
| secrets.token_urlsafe | crypto.randomBytes | Secure random token generation |

---

### New Backend Directory Structure

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── api/
│   └── index.ts               # Vercel catch-all serverless entry point
└── src/
    ├── app.ts                  # Express app setup (no listen — for serverless)
    ├── server.ts               # Local dev server (calls app.listen)
    ├── config.ts               # Typed env config (process.env with validation)
    ├── database.ts             # MongoDB connection singleton (cached for serverless)
    ├── middleware/
    │   ├── auth.ts             # JWT verification, requireAdmin, requireClient
    │   └── errorHandler.ts     # Global Express error handler
    ├── models/
    │   ├── user.ts             # TypeScript interfaces + newUser() factory
    │   ├── project.ts
    │   ├── media.ts
    │   ├── portfolio.ts
    │   ├── pricing.ts
    │   ├── inquiry.ts
    │   ├── review.ts
    │   ├── invoice.ts
    │   └── settings.ts
    ├── routes/
    │   ├── auth.ts             # POST /login, /refresh, /logout, /set-password, etc.
    │   ├── public.ts           # GET /portfolio, /pricing, /reviews; POST /inquiries
    │   ├── gallery.ts          # Token-based gallery routes
    │   ├── admin/
    │   │   ├── portfolio.ts
    │   │   ├── pricing.ts
    │   │   ├── inquiries.ts
    │   │   ├── reviews.ts
    │   │   ├── projects.ts
    │   │   ├── media.ts
    │   │   ├── clients.ts
    │   │   ├── invoices.ts
    │   │   ├── settings.ts
    │   │   └── dashboard.ts
    │   └── client/
    │       ├── projects.ts
    │       └── invoices.ts
    ├── services/
    │   ├── auth.ts             # hashPassword, verifyPassword, createToken, decodeToken
    │   ├── s3.ts               # getPresignedUpload, getPresignedDownload, deleteFile
    │   ├── imageProcessing.ts  # processAndUploadImage (sharp: compress + thumbnail + watermark)
    │   ├── email.ts            # sendInviteEmail, sendGalleryLinkEmail, sendPasswordReset
    │   └── stripe.ts           # createCustomer, createInvoice, sendInvoice, getInvoice
    └── utils/
        ├── tokens.ts           # generateShareToken (crypto.randomBytes)
        └── zipStream.ts        # streamZipFromS3Keys (archiver + S3 GetObject streams)
```

---

### Vercel Deployment Strategy

The backend is deployed as a single Vercel serverless function using a catch-all route:

**`backend/api/index.ts`** (the Vercel entry point):
```typescript
import app from '../src/app';
export default app;
```

**`vercel.json`** in the repo root:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/backend/api/index" }
  ]
}
```

This routes all `/api/*` requests to the Express app running as a serverless function. The frontend (Vite) is deployed as a separate Vercel project or from the `/frontend` directory with its own build config.

**MongoDB connection caching** is critical for serverless — the connection is initialized once per cold start and reused across invocations within the same instance:
```typescript
let cachedClient: MongoClient | null = null;
export async function getDb() {
  if (!cachedClient) cachedClient = await MongoClient.connect(config.MONGO_URI);
  return cachedClient.db();
}
```

---

### Migration Phases

#### Phase 1 — Backend Scaffold
1. Create `backend/package.json` with all Node.js dependencies
2. Create `backend/tsconfig.json` (ES2022 target, Node moduleResolution)
3. Create `backend/src/config.ts` — typed env vars with validation
4. Create `backend/src/database.ts` — MongoDB connection with serverless-safe caching
5. Create `backend/src/app.ts` — Express app with CORS, cookie-parser, JSON body parser, route mounting
6. Create `backend/src/server.ts` — local dev entry point (`app.listen`)
7. Create `backend/api/index.ts` — Vercel serverless entry point
8. Create `vercel.json` — routing config at repo root
9. Add `dev` and `build` scripts; confirm local dev server starts

#### Phase 2 — Models & Auth
10. Port all 9 model factory functions to TypeScript interfaces + factory functions
11. Implement `services/auth.ts` — bcryptjs hash/verify, JWT sign/verify with access + refresh tokens, invite token, password reset token
12. Implement `middleware/auth.ts` — Express middleware: `requireAuth`, `requireAdmin`, `requireClient`, attach user to `req.user`
13. Port `routes/auth.ts` — all 6 auth endpoints (login, refresh, logout, set-password, forgot-password, reset-password)

#### Phase 3 — Core Services
14. Implement `services/s3.ts` — presigned upload URLs, presigned download URLs, upload buffer, delete file, delete by prefix using `@aws-sdk/client-s3`
15. Implement `services/imageProcessing.ts` — using `sharp`:
    - Resize to 2048px longest edge, JPEG quality 82 (compressed)
    - Resize to 400px longest edge, JPEG quality 70 (thumbnail)
    - Diagonal repeating watermark using SVG overlay composite (watermarked)
    - Upload all three variants to S3
16. Implement `services/email.ts` — SendGrid with same email templates (invite, gallery link, password reset), fallback console stub
17. Implement `services/stripe.ts` — createCustomer, createInvoice (with line items), sendInvoice, getInvoice using Stripe Node SDK
18. Implement `utils/tokens.ts` — `generateShareToken()` using `crypto.randomBytes(32).toString('base64url')`
19. Implement `utils/zipStream.ts` — streaming zip using `archiver` pulling S3 objects via GetObjectCommand stream

#### Phase 4 — Public Routes
20. Port `routes/public.ts`:
    - `GET /api/portfolio` — paginated, filterable by category
    - `GET /api/portfolio/:id`
    - `GET /api/pricing`
    - `POST /api/inquiries`
    - `GET /api/reviews` (approved only, paginated)
    - `POST /api/reviews`
    - `GET /api/settings/:key`

#### Phase 5 — Gallery Routes
21. Port `routes/gallery.ts`:
    - `GET /api/gallery/:token` — validate token, return project metadata
    - `GET /api/gallery/:token/media` — list media with watermarked presigned URLs
    - `POST /api/gallery/:token/select` — toggle image selection
    - `GET /api/gallery/:token/download-urls` — presigned URLs for selected originals
    - `GET /api/gallery/:token/download` — streaming zip of selected originals
    - `GET /api/gallery/:token/download-all` — streaming zip of all originals
    - `GET /api/gallery/:token/media/:mediaId/download-url` — single image presigned URL

#### Phase 6 — Admin Routes
22. Port `routes/admin/portfolio.ts` — CRUD with S3, reorder
23. Port `routes/admin/pricing.ts` — CRUD
24. Port `routes/admin/inquiries.ts` — list all, update status
25. Port `routes/admin/reviews.ts` — list all, approve/reject, delete
26. Port `routes/admin/projects.ts` — list, create (with client auto-creation + invite email), get, update, delete (S3 cleanup), deliver (share token + email), archive
27. Port `routes/admin/media.ts` — list media, upload (presigned URL flow + process), delete, reorder
28. Port `routes/admin/clients.ts` — list, create (send invite), update
29. Port `routes/admin/invoices.ts` — list, create (Stripe sync), send, get status
30. Port `routes/admin/settings.ts` — get all, update by key
31. Port `routes/admin/dashboard.ts` — summary stats

#### Phase 7 — Client Routes
32. Port `routes/client/projects.ts` — list own projects
33. Port `routes/client/invoices.ts` — list own invoices, Stripe payment redirect

#### Phase 8 — Middleware & Error Handling
34. Implement `middleware/errorHandler.ts` — centralized Express error handler that formats errors consistently
35. Add request validation with `zod` on all POST/PUT routes
36. Add rate limiting with `express-rate-limit` on public endpoints (inquiries, reviews, auth)

#### Phase 9 — Vercel Config & Scripts
37. Create `vercel.json` at repo root with rewrite rules
38. Update `frontend/vite.config.ts` proxy target to point to new Node backend port (if changed)
39. Update `frontend/.env.example` if API URL format changed
40. Create `scripts/seed_admin.ts` — TypeScript port of seed_admin.py CLI script

#### Phase 10 — Cleanup
41. Remove `backend/app/` (Python source)
42. Remove `backend/requirements.txt`, `backend/pyproject.toml`, `backend/Dockerfile`
43. Remove `docker-compose.yml` (or replace with Node.js dev compose if desired)
44. Update `README.md` (if it exists) to reflect new stack
45. Final end-to-end test: auth, media upload, gallery access, Stripe invoice, download

---

### Key Implementation Notes

**Sharp watermark** (replaces Pillow diagonal text):
- Use SVG with `<text>` elements at multiple positions to simulate diagonal tiling
- Composite the SVG onto the compressed image using `sharp().composite()`

**Streaming zip** (replaces Python zipfile):
- Use `archiver` library with `archiver('zip', { zlib: { level: 0 } })` (store, no compression, for speed)
- Pipe `archiver` output to Express `res` directly for streaming
- Fetch S3 originals via `GetObjectCommand`, get the `Body` stream, append each to archiver

**MongoDB in serverless**:
- Cache `MongoClient` instance in module scope — persists across warm invocations
- Use `maxPoolSize: 5` to prevent connection exhaustion across concurrent serverless instances
- Create indexes on first connection (email, share_link_token, project_id, etc.)

**Image processing on Vercel**:
- `sharp` works on Vercel Node.js functions (it ships prebuilt binaries for Linux x64)
- Processing happens synchronously within the request handler (acceptable for single-image uploads)
- For batch uploads, process sequentially or consider offloading to a background worker if timeouts occur

**bcryptjs vs bcrypt**:
- Use `bcryptjs` (pure JavaScript, no native compilation) — avoids platform/architecture issues in serverless
- Salt rounds: 12 (same as current Python implementation)

**Cookie handling**:
- Use `cookie-parser` middleware
- Refresh tokens in httpOnly, secure, sameSite=strict cookies (same as current)
- Access tokens returned in response body (same as current)

---

### Dependency List (backend/package.json)

```json
{
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "cookie-parser": "^1.4.7",
    "express-rate-limit": "^7.4.0",
    "mongodb": "^6.11.0",
    "zod": "^3.23.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "@aws-sdk/client-s3": "^3.700.0",
    "@aws-sdk/s3-request-presigner": "^3.700.0",
    "sharp": "^0.33.5",
    "archiver": "^7.0.1",
    "stripe": "^17.0.0",
    "@sendgrid/mail": "^8.1.3",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "@types/cookie-parser": "^1.4.7",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/bcryptjs": "^2.4.6",
    "@types/archiver": "^6.0.2",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "nodemon": "^3.1.0"
  }
}
```

---

## Migration Status — Node.js Backend

**Completed (2026-03-25)**

The Python/FastAPI backend has been fully replaced with a Node.js/TypeScript/Express backend.

### What Was Done
- ✅ `package.json` + `tsconfig.json` at repo root (moved from `backend/`)
- ✅ `src/` at repo root — all backend source (moved from `backend/src/`)
- ✅ `api/index.ts` at repo root — Vercel serverless entry point (moved from `backend/api/`)
- ✅ `scripts/seed_admin.ts` at repo root (moved from `backend/scripts/`)
- ✅ `src/config.ts` — typed env config with dotenv (reads `.env` at repo root)
- ✅ `src/database.ts` — MongoDB connection with serverless caching + 5s timeout + index creation
- ✅ `src/app.ts` — Express app with CORS, cookie-parser, rate limiting, all routers mounted, `express-async-errors` for safe async error handling
- ✅ `src/server.ts` — local dev entry (non-blocking startup, lazy DB connect)
- ✅ `vercel.json` — root-level routing: `/api/:path*` → `api/index.ts`, `/*` → `index.html`
- ✅ All 9 model factory functions in TypeScript
- ✅ All 5 services: auth (bcryptjs + jsonwebtoken), s3 (AWS SDK v3), imageProcessing (sharp + SVG watermark), email (SendGrid), stripe
- ✅ All utils: tokens (crypto.randomBytes), zipStream (archiver streaming)
- ✅ Auth middleware: `requireAuth`, `requireAdmin`, `requireClient`
- ✅ Global error handler with 503 for MongoDB unavailable, 500 for unexpected errors
- ✅ All 13 route files (auth, public, gallery, 10 admin, 2 client)
- ✅ Python backend fully removed (`backend/` directory deleted)
- ✅ `docker-compose.yml` updated — MongoDB only, Python backend service removed
- ✅ `VITE_API_URL` removed from Vercel env vars — frontend uses relative `/api` paths
- ✅ TypeScript compilation: **0 errors**
- ✅ Server smoke tested locally: health, auth middleware, JWT validation all working
- ✅ Vercel deployment confirmed working on staging branch
- ✅ README fully updated to reflect new root-level structure and local dev instructions

### Remaining Tasks / Known Issues

1. **Rate limiter in serverless** — `express-rate-limit` uses in-memory storage by default. In serverless, each cold start gets its own memory, so rate limits are per-instance, not global. For production, configure a Redis store (e.g., `rate-limit-redis`) if global rate limiting is required.

2. **Image upload size limit** — `multer` is set to 50MB per file. Vercel has a 4.5MB body limit on the Hobby plan and 50MB on Pro. For uploads >4.5MB on Hobby, switch to presigned S3 upload URLs (frontend uploads directly to S3, then POSTs the S3 key to the backend for processing).

3. **Remove `/api/debug-env` diagnostic route** — `src/app.ts` has a temporary `/api/debug-env` endpoint that exposes env var presence. Remove before going to production.
