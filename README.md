# MAD Photography

A full-service photography business web application for portfolio display, client gallery delivery, invoicing, and business management.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Deployment](#deployment)
- [Admin User Guide](#admin-user-guide)
- [Client Experience](#client-experience)
- [API Reference](#api-reference)

---

## Architecture

The application is a full-stack monorepo deployed entirely on Vercel. The frontend is a static React SPA and the backend runs as a single Node.js serverless function.

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│         (Public Site / Admin / Client Portal)            │
│              Vite + TypeScript + Tailwind                │
│                 Deployed on Vercel (static)              │
└────────────────────────┬────────────────────────────────┘
                         │  REST API (JSON)  /api/*
                         │
┌────────────────────────▼────────────────────────────────┐
│            Node.js / Express Backend                     │
│     Deployed on Vercel as a single serverless function   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │   Auth   │  │ Projects │  │  Invoicing (manual     │ │
│  │ Service  │  │ & Media  │  │  Venmo/PayPal/Zelle)   │ │
│  └──────────┘  └──────────┘  └────────────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │  S3      │  │ Gallery  │  │  Portfolio / Pricing   │ │
│  │ Service  │  │ Service  │  │  / Reviews / Settings  │ │
│  └──────────┘  └──────────┘  └────────────────────────┘ │
└────────┬────────────────────────┬───────────────────────┘
         │                        │
    ┌────▼─────┐            ┌─────▼─────┐
    │ MongoDB  │            │  AWS S3   │
    │  Atlas   │            │  (Media   │
    └──────────┘            └───────────┘
```

### Request Flow

```
Browser ──► Frontend (static assets on Vercel CDN)
Browser ──► /api/* ──► Node.js serverless function ──► MongoDB Atlas
                                                  └──► AWS S3
```

- **Frontend** is a Vite-built static bundle served from Vercel's edge CDN.
- **Backend** is a single Express app mounted at `backend/api/index.ts`, served as a Vercel serverless function for all `/api/*` requests.
- **MongoDB** runs on MongoDB Atlas. Connection is cached per serverless instance for performance.
- **S3** stores all media (originals, compressed, thumbnails, watermarked). Files are never served directly — only via short-lived presigned URLs.

### Data Flow: Project Delivery with Invoice

```
Admin clicks "Deliver Project"
         │
         ▼
┌─────────────────────┐     ┌──────────────────────┐
│  Generate share     │────►│  Create invoice       │
│  link token         │     │  (status: "sent")     │
└─────────────────────┘     └──────────────────────┘
         │                           │
         ▼                           ▼
  Email to client             Invoice token stored
  with gallery link           linked to project
         │
         ▼
┌─────────────────────────────────────────────┐
│  Client opens gallery                        │
│  - Images display normally                   │
│  - Downloads LOCKED (amber banner shown)     │
│  - "View Invoice" link → public invoice page │
│  - Pay via Venmo / PayPal / Zelle            │
└─────────────────────────────────────────────┘
         │
         ▼
  Admin marks invoice as "paid"
         │
         ▼
  Downloads unlock on next gallery load
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB Atlas (via mongodb Node driver) |
| Object Storage | AWS S3 (presigned URLs, AWS SDK v3) |
| Image Processing | sharp (compress, thumbnail, watermark) |
| Auth | JWT (access + refresh tokens, bcryptjs) |
| Payments | Manual (Venmo, PayPal, Zelle) with invoice tracking |
| Email | SendGrid (`@sendgrid/mail`) |
| File Uploads | multer (memory storage) |
| Zip Streaming | archiver |
| Deployment | Vercel (frontend static + backend serverless) |

---

## Project Structure

```
mad-photography/
├── README.md
├── CLAUDE.md                    # AI assistant project spec & migration plan
├── vercel.json                  # Vercel routing: /api/* → backend, /* → frontend
├── .env.example                 # All environment variables
│
├── backend/
│   ├── package.json             # Node.js dependencies
│   ├── tsconfig.json            # TypeScript config
│   ├── api/
│   │   └── index.ts             # Vercel serverless entry point
│   ├── scripts/
│   │   └── seed_admin.ts        # Create initial admin user (tsx scripts/seed_admin.ts)
│   └── src/
│       ├── app.ts               # Express app (CORS, middleware, all routers)
│       ├── server.ts            # Local dev entry (app.listen on port 8000)
│       ├── config.ts            # Typed env config
│       ├── database.ts          # MongoDB connection (cached for serverless)
│       ├── middleware/
│       │   ├── auth.ts          # requireAuth, requireAdmin, requireClient
│       │   └── errorHandler.ts  # Global Express error handler
│       ├── models/              # Document factory functions (9 collections)
│       │   ├── user.ts
│       │   ├── project.ts
│       │   ├── media.ts
│       │   ├── portfolio.ts
│       │   ├── pricing.ts
│       │   ├── inquiry.ts
│       │   ├── review.ts
│       │   ├── invoice.ts
│       │   └── settings.ts
│       ├── services/            # Business logic
│       │   ├── auth.ts          # bcryptjs hash/verify, JWT sign/verify
│       │   ├── s3.ts            # AWS SDK v3 S3 operations + presigned URLs
│       │   ├── imageProcessing.ts  # sharp: compress, thumbnail, watermark
│       │   ├── email.ts         # SendGrid transactional emails
│       │   └── stripe.ts        # Stripe invoice API (optional)
│       ├── routes/
│       │   ├── auth.ts          # POST /login, /refresh, /logout, /set-password, etc.
│       │   ├── public.ts        # GET /portfolio, /pricing, /reviews; POST /inquiries
│       │   ├── gallery.ts       # Token-based gallery routes
│       │   ├── admin/
│       │   │   ├── portfolio.ts
│       │   │   ├── pricing.ts
│       │   │   ├── inquiries.ts
│       │   │   ├── reviews.ts
│       │   │   ├── projects.ts
│       │   │   ├── media.ts
│       │   │   ├── clients.ts
│       │   │   ├── invoices.ts
│       │   │   ├── settings.ts
│       │   │   └── dashboard.ts
│       │   └── client/
│       │       ├── projects.ts
│       │       └── invoices.ts
│       └── utils/
│           ├── tokens.ts        # generateShareToken (crypto.randomBytes)
│           └── zipStream.ts     # Streaming zip via archiver + S3 streams
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts           # Dev proxy: /api → localhost:8000
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # All routes defined here
│       ├── api/client.ts        # Axios instance with auth interceptors
│       ├── components/          # Layout + reusable UI components
│       ├── pages/
│       │   ├── public/          # Home, Portfolio, Pricing, About, Reviews
│       │   ├── auth/            # Login, SetPassword, ForgotPassword
│       │   ├── gallery/         # SharedGallery, ImageView
│       │   ├── admin/           # Dashboard, Projects, Invoices, etc.
│       │   └── client/          # ClientDashboard, InvoiceView
│       ├── context/             # AuthContext, SettingsContext
│       ├── hooks/               # useAuth, useGallery, useImageUpload
│       ├── types/index.ts       # Shared TypeScript interfaces
│       └── utils/               # formatCurrency, dateHelpers
│
└── scripts/                     # (Legacy Python scripts — superseded by backend/scripts/)
```

---

## Environment Variables

All variables are read from the environment at runtime. Copy `.env.example` to configure.

### Backend Variables

| Variable | Description | Default / Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/mad_photography` |
| `JWT_SECRET` | Secret key for signing JWTs | `change-me-in-production` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime (minutes) | `15` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime (days) | `7` |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | |
| `AWS_REGION` | AWS region for S3 | `us-east-2` |
| `S3_BUCKET_NAME` | S3 bucket for media storage | `mad-photography-media` |
| `STRIPE_SECRET_KEY` | Stripe API key (optional) | `sk_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `SENDGRID_API_KEY` | SendGrid API key for emails | If unset, emails log to console |
| `FROM_EMAIL` | Sender email address | `hello@madphotography.com` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `BACKEND_URL` | Backend's own URL (for links in emails) | `http://localhost:8000` |
| `PORT` | Port for local dev server | `8000` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://yourdomain.com/api` |

> **Note:** If `VITE_API_URL` is not set, the frontend defaults to `/api`. In local dev, Vite proxies `/api` to `localhost:8000` automatically — no env var needed.

### Admin Seed Variables (for `npm run seed`)

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_SEED_EMAIL` | Admin account email | `admin@madphotography.com` |
| `ADMIN_SEED_PASSWORD` | Admin account password | `changeme123` |
| `ADMIN_SEED_NAME` | Admin display name | `Admin` |

---

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [MongoDB](https://www.mongodb.com/) — local install or Docker, or use a free MongoDB Atlas cluster

### Step 1: Start MongoDB

```bash
# Option A: Docker (quickest)
docker run -d -p 27017:27017 --name mad-mongo mongo:7

# Option B: MongoDB Atlas
# Create a free cluster at mongodb.com/atlas, get the connection string,
# and set MONGO_URI in your .env
```

### Step 2: Configure Environment

```bash
# From the repo root
cp .env.example backend/.env
# Edit backend/.env — set JWT_SECRET, AWS credentials, etc.
```

### Step 3: Start the Backend

```bash
cd backend
npm install
npm run dev        # starts on localhost:8000 with hot reload
```

### Step 4: Seed the Admin Account

```bash
cd backend
npm run seed
# Or with custom credentials:
ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_PASSWORD=mypassword npm run seed
```

### Step 5: Start the Frontend

```bash
cd frontend
npm install
npm run dev        # starts on localhost:5173, proxies /api to localhost:8000
```

Open `http://localhost:5173`. Log in at `/login` with the seeded admin credentials.

---

## Deployment

The entire application deploys to Vercel from a single GitHub repository. The `vercel.json` at the repo root configures routing.

### How It Works

- `/api/*` requests are routed to `backend/api/index.ts` — the Express app runs as a Node.js serverless function.
- All other requests serve the Vite-built static frontend from `frontend/dist`.

### Vercel Setup

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Vercel detects the `vercel.json` config automatically
3. Add all required environment variables in Vercel's **Project Settings → Environment Variables**

Required variables to set in Vercel:

| Variable | Notes |
|----------|-------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Strong random value (use `openssl rand -hex 32`) |
| `FRONTEND_URL` | Your Vercel production URL (for CORS + email links) |
| `AWS_ACCESS_KEY_ID` | AWS IAM key with S3 access |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret |
| `AWS_REGION` | e.g. `us-east-2` |
| `S3_BUCKET_NAME` | Your S3 bucket name |
| `SENDGRID_API_KEY` | SendGrid key (omit to stub emails to console) |
| `FROM_EMAIL` | Sender email address |

### Deployment Checklist

- [ ] MongoDB Atlas cluster provisioned and `MONGO_URI` set
- [ ] `JWT_SECRET` set to a strong random value
- [ ] `FRONTEND_URL` set to the Vercel production domain (for CORS)
- [ ] AWS S3 bucket created with proper IAM permissions; credentials set
- [ ] SendGrid API key set (or leave unset for console stub)
- [ ] Admin user seeded: `cd backend && npm run seed` (run locally pointing at production DB)

---

## Admin User Guide

### Logging In

Navigate to `/login` and sign in with the credentials created by the seed script.

<img width="1447" height="815" alt="Screenshot 2026-02-11 at 5 26 19 PM" src="https://github.com/user-attachments/assets/30967b2e-cc23-4f7f-a772-88fff7fd20f8" />

### Dashboard

The admin dashboard shows a summary of active projects, pending inquiries, and recent invoices.

<img width="1463" height="829" alt="Screenshot 2026-02-11 at 5 27 57 PM" src="https://github.com/user-attachments/assets/48c7336d-2023-4788-b570-a07b9a88563d" />

### Managing Portfolio

Navigate to **Portfolio** in the admin sidebar to add, edit, reorder, and delete portfolio items that appear on the public site.

<img width="1455" height="817" alt="Screenshot 2026-02-11 at 5 28 18 PM" src="https://github.com/user-attachments/assets/b23d4752-a449-4965-91dc-e5800f47848e" />

### Managing Pricing Packages

Navigate to **Pricing** to create and manage pricing packages displayed on the public pricing page.

<img width="1462" height="826" alt="Screenshot 2026-02-11 at 5 28 34 PM" src="https://github.com/user-attachments/assets/6b3e51f5-415b-4470-930d-f62eac4a4384" />

### Managing Inquiries

View and update the status of client inquiries submitted through the pricing page contact form.

### Managing Reviews

Approve, reject, or delete client reviews. Only approved reviews appear on the public site.

### Site Settings

Edit business contact information, social media links, payment method settings (Venmo/PayPal/Zelle usernames), and other site-wide configuration.

<img width="368" height="706" alt="Screenshot 2026-02-11 at 5 30 19 PM" src="https://github.com/user-attachments/assets/5a07b3dd-f507-4456-a32b-612cf824596f" />

---

### Projects Workflow

#### Creating a Project

1. Go to **Projects** > **New Project**
2. Enter a title, description, and the client's email address
3. If the client doesn't have an account yet, one is created automatically and they receive an invite email

#### Uploading Media

1. Open a project from the project list
2. Drag and drop images onto the upload zone (or click to browse)
3. Supported formats: JPEG, PNG, TIFF
4. Images are automatically compressed, thumbnailed, and watermarked via `sharp`

<img width="1180" height="792" alt="Screenshot 2026-02-11 at 6 12 06 PM" src="https://github.com/user-attachments/assets/9b3669e0-aabe-455e-a4b4-49040c7d374f" />

#### Delivering a Project

1. Click **Deliver Project** on the project detail page
2. Set optional gallery link expiration and project archival dates
3. Optionally check **"Create invoice for this project"** to generate an invoice:
   - Enter a due date
   - Add line items (description, dollar amount, quantity)
   - The invoice is created with "sent" status immediately
   - Gallery downloads will be locked until the invoice is marked as paid
4. Click **Deliver & Notify Client** — the client receives an email with their gallery link

<img width="530" height="728" alt="Screenshot 2026-02-11 at 6 14 06 PM" src="https://github.com/user-attachments/assets/a097ce73-0d29-4039-a1a7-e111c3307eae" />

#### Gallery Link

After delivery, the gallery link is displayed on the project detail page. Copy and share it with the client.

<img width="1166" height="213" alt="Screenshot 2026-02-11 at 6 14 17 PM" src="https://github.com/user-attachments/assets/ff5f68e1-a997-4600-b51c-cef563da02e5" />

---

### Invoices Workflow

#### Creating Standalone Invoices

1. Go to **Invoices** > **New Invoice**
2. Select a client, set due date, add line items
3. Invoices can also be created during project delivery (see above)

#### Managing Invoice Status

Update invoice status from the invoice list:
- **Draft** — invoice is being prepared
- **Sent** — client can view and pay
- **Paid** — payment received, gallery downloads unlocked
- **Void** — invoice cancelled

---

## Client Experience

### Shared Gallery

Clients receive an email with a link to their photo gallery. The gallery page shows:

- Responsive image grid with all delivered photos
- Lightbox view for full-size images
- Image selection (toggle checkmarks)
- Download Selected / Download All / Export for Printing buttons

### Downloads Locked (Unpaid Invoice)

If the project has an unpaid invoice, the gallery shows an amber banner with a link to the invoice page. All download buttons are disabled until payment is received.

### Invoice Payment

Clients click the invoice link to view their invoice with payment options:

- **Venmo** — opens Venmo with pre-filled amount
- **PayPal** — opens PayPal.me with pre-filled amount
- **Zelle** — displays Zelle recipient info

### After Payment

Once the admin marks the invoice as paid, the client can refresh the gallery and download their photos.

---

## API Reference

The backend exposes a REST API at `/api`. All responses are JSON.

### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/portfolio` | List visible portfolio items |
| GET | `/api/portfolio/:id` | Single portfolio item |
| GET | `/api/pricing` | List visible pricing packages |
| POST | `/api/inquiries` | Submit an inquiry |
| GET | `/api/reviews` | List approved reviews |
| POST | `/api/reviews` | Submit a review |
| GET | `/api/settings` | Get all public site settings |
| GET | `/api/settings/:key` | Get a single setting by key |
| GET | `/api/invoice/:token` | View invoice by public token |
| GET/HEAD | `/api/health` | Health check |

### Gallery (token-based, no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/gallery/:token` | Gallery metadata + lock status |
| GET | `/api/gallery/:token/media` | List gallery images with presigned URLs |
| POST | `/api/gallery/:token/select` | Select/deselect images |
| GET | `/api/gallery/:token/download-urls` | Presigned download URLs for selected/all |
| GET | `/api/gallery/:token/download` | Stream selected images as zip |
| GET | `/api/gallery/:token/download-all` | Stream all images as zip |
| POST | `/api/gallery/:token/shutterfly-export` | Export selected as zip for printing |
| GET | `/api/gallery/:token/media/:id/download-url` | Single original presigned URL |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (returns access token + refresh cookie) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Clear refresh token cookie |
| POST | `/api/auth/set-password` | Set password from invite token |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

### Admin (requires `Authorization: Bearer <access_token>`, admin role)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET/POST | `/api/admin/portfolio` | List/create portfolio items |
| PUT | `/api/admin/portfolio/reorder` | Reorder portfolio items |
| PUT/DELETE | `/api/admin/portfolio/:id` | Update/delete portfolio item |
| GET/POST | `/api/admin/pricing` | List/create pricing packages |
| PUT/DELETE | `/api/admin/pricing/:id` | Update/delete package |
| GET/PUT | `/api/admin/inquiries` | List inquiries / update status |
| GET/PUT/DELETE | `/api/admin/reviews` | Moderate reviews |
| GET/POST | `/api/admin/projects` | List/create projects |
| GET/PUT/DELETE | `/api/admin/projects/:id` | Get/update/delete project |
| POST | `/api/admin/projects/:id/deliver` | Deliver project + optional invoice |
| PUT | `/api/admin/projects/:id/rescind` | Rescind delivery |
| PUT | `/api/admin/projects/:id/archive` | Archive project |
| GET/POST | `/api/admin/projects/:id/media` | List/upload media |
| DELETE | `/api/admin/projects/:id/media/:mediaId` | Delete media item |
| PUT | `/api/admin/projects/:id/media/reorder` | Reorder media |
| GET/POST | `/api/admin/clients` | List/create clients |
| GET/POST | `/api/admin/invoices` | List/create invoices |
| GET | `/api/admin/invoices/:id` | Get invoice detail |
| PUT | `/api/admin/invoices/:id/status` | Update invoice status |
| GET/PUT | `/api/admin/settings` | List/update site settings |

### Client (requires `Authorization: Bearer <access_token>`, client role)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/client/projects` | List own projects |
| GET | `/api/client/invoices` | List own invoices |

---

## License

Private — all rights reserved.
