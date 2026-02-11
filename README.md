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

The application is split into three independently deployable services:

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│         (Public Site / Admin / Client Portal)            │
│                 Deployed on Vercel                       │
└────────────────────────┬────────────────────────────────┘
                         │  REST API (JSON)
                         │  VITE_API_URL env var
                         │
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                       │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │   Auth   │  │ Projects │  │  Invoicing (manual     │ │
│  │ Service  │  │ & Media  │  │  Venmo/PayPal/Zelle)   │ │
│  └──────────┘  └──────────┘  └────────────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │  S3      │  │ Gallery  │  │  Portfolio / Pricing   │ │
│  │ Service  │  │ Service  │  │  / Reviews / Settings  │ │
│  └──────────┘  └──────────┘  └────────────────────────┘ │
│               Deployed on Render                        │
└────────┬────────────────────────┬───────────────────────┘
         │                        │
    ┌────▼─────┐            ┌─────▼─────┐
    │ MongoDB  │            │  AWS S3   │
    │ (Atlas   │            │  (Media   │
    │  or own  │            │  Storage) │
    │ service) │            │           │
    └──────────┘            └───────────┘
```

### Request Flow

```
Browser ──► Frontend (static assets) ──► Backend API ──► MongoDB
                                                    └──► AWS S3
```

- **Frontend** serves the React SPA. In production, it only needs the `VITE_API_URL` environment variable to know where the backend lives.
- **Backend** is a standalone FastAPI service. It connects to MongoDB via `MONGO_URI` and to S3 via AWS credentials. The `FRONTEND_URL` env var controls CORS.
- **MongoDB** runs as its own service (MongoDB Atlas, Docker, or any hosted provider).

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
| Backend | Python 3.11+ / FastAPI |
| Database | MongoDB (via Motor async driver) |
| Object Storage | AWS S3 (presigned URLs) |
| Auth | JWT (access + refresh tokens) |
| Payments | Manual (Venmo, PayPal, Zelle) with invoice tracking |
| Email | SendGrid |
| Dev Environment | Docker Compose |

---

## Project Structure

```
mad-photography/
├── README.md
├── CLAUDE.md                    # AI assistant project spec
├── docker-compose.yml           # Local dev: MongoDB + backend
├── .env.example                 # All environment variables
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI app + CORS + routers
│       ├── config.py            # Settings from env vars
│       ├── database.py          # MongoDB connection (Motor)
│       ├── dependencies.py      # Auth dependency injection
│       ├── models/              # MongoDB document factories
│       ├── schemas/             # Pydantic request/response models
│       ├── routers/
│       │   ├── auth.py          # Login, register, refresh
│       │   ├── public.py        # Portfolio, pricing, reviews, settings
│       │   ├── gallery.py       # Shared gallery (token-based)
│       │   ├── admin/           # All admin endpoints
│       │   └── client/          # Client-facing endpoints
│       ├── services/            # Business logic (auth, S3, email, etc.)
│       ├── middleware/          # JWT verification
│       └── utils/               # Tokens, zip streaming
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # All routes defined here
│       ├── api/client.ts        # Axios instance (uses VITE_API_URL)
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
└── scripts/
    └── seed_admin.py            # Create initial admin user
```

---

## Environment Variables

All variables are read from the environment at runtime. Copy `.env.example` to configure.

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/mad_photography` |
| `JWT_SECRET` | Secret key for signing JWTs | `your-256-bit-random-key` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `15` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | `7` |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | |
| `AWS_REGION` | AWS region for S3 | `us-east-2` |
| `S3_BUCKET_NAME` | S3 bucket for media storage | `mad-photography-media` |
| `STRIPE_SECRET_KEY` | Stripe API key (if using Stripe) | `sk_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `SENDGRID_API_KEY` | SendGrid API key for emails | `SG....` |
| `FROM_EMAIL` | Sender email address | `hello@madphotography.com` |
| `FRONTEND_URL` | Frontend origin for CORS | `https://yourdomain.com` |
| `BACKEND_URL` | Backend's own URL (for email links) | `https://api.yourdomain.com` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://api.yourdomain.com/api` |

> **Note:** Vite requires frontend env vars to be prefixed with `VITE_`. If `VITE_API_URL` is not set, the frontend defaults to `/api` (useful with a dev proxy).

---

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Python](https://python.org/) 3.11+
- [Docker](https://docker.com/) and Docker Compose (for MongoDB and API server, or use a local MongoDB install)

### Step 1: Start MongoDB + Backend (Docker Compose)

```bash
# 1. Clone the repo
git clone <repo-url> mad-photography
cd mad-photography

# 2. Create backend env file
cp .env.example backend/.env
# Edit backend/.env with your AWS keys, JWT secret, etc.

# 3. Start MongoDB and backend
docker compose up --build
```

This starts:
- **MongoDB** on `localhost:27017`
- **Backend** on `localhost:8000`

> You can also run MongoDB and the backend without Docker — see the manual steps below.

<details>
<summary>Manual setup (without Docker Compose)</summary>

#### Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mad-mongo mongo:7

# Or use a local MongoDB install / MongoDB Atlas connection string
```

#### Start the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env
# Edit .env — at minimum set MONGO_URI and JWT_SECRET

# Seed admin user
python ../scripts/seed_admin.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

</details>

### Step 2: Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api to localhost:8000 automatically)
npm run dev
```

The Vite dev server proxies `/api` requests to `localhost:8000`, so you don't need to set `VITE_API_URL` locally.

### Seed Admin Account

```bash
# Uses env vars for credentials (defaults shown)
ADMIN_SEED_EMAIL=admin@yoursite.com \
ADMIN_SEED_PASSWORD=PASSWORD \
ADMIN_SEED_NAME="MAD Admin" \
python scripts/seed_admin.py
```

Then log in at `http://localhost:5173/login`.

---

## Deployment

Each service is deployed independently. Set the environment variables in your hosting provider's dashboard.

### Frontend (Vercel)

The frontend is deployed to [Vercel](https://vercel.com) as a static site.

1. Connect your GitHub repo to Vercel
2. Set the **Root Directory** to `frontend`
3. Vercel auto-detects Vite — build command and output directory are configured automatically
4. Add the environment variable in Vercel's project settings:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-backend-host.com/api` |

Vercel handles SPA routing (`index.html` fallback) automatically.

### Backend

Deploy the `backend/` directory as a Python web service. Compatible with any platform that runs Python (Railway, Render, Fly.io, AWS ECS, DigitalOcean App Platform, etc.).

| Setting | Value |
|---------|-------|
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Dockerfile | `backend/Dockerfile` (if your host supports it) |

Required environment variables:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | Your MongoDB connection string |
| `JWT_SECRET` | A strong random value |
| `FRONTEND_URL` | Your Vercel frontend URL (for CORS) |
| `AWS_ACCESS_KEY_ID` | AWS IAM key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret |
| `AWS_REGION` | e.g. `us-east-2` |
| `S3_BUCKET_NAME` | Your S3 bucket name |
| `SENDGRID_API_KEY` | SendGrid key (for emails) |
| `FROM_EMAIL` | Sender email address |

### MongoDB

Use [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier available) or any hosted MongoDB provider. Copy the connection string and set it as `MONGO_URI` in the backend environment.

### Deployment Checklist

- [ ] MongoDB provisioned and accessible from backend
- [ ] `MONGO_URI` set in backend environment
- [ ] `JWT_SECRET` set to a strong random value
- [ ] `FRONTEND_URL` set in backend to the Vercel URL (for CORS)
- [ ] AWS S3 bucket created and credentials set in backend
- [ ] SendGrid API key set in backend
- [ ] `VITE_API_URL` set in Vercel to the backend's `/api` URL
- [ ] Admin user seeded (`python scripts/seed_admin.py`)

---

## Admin User Guide

### Logging In

Navigate to `/login` and sign in with the credentials created by the seed script.

<img width="1447" height="815" alt="Screenshot 2026-02-11 at 5 26 19 PM" src="https://github.com/user-attachments/assets/30967b2e-cc23-4f7f-a772-88fff7fd20f8" />

### Dashboard

The admin dashboard shows a summary of active projects, pending inquiries, and recent invoices.

> ![Dashboard screenshot]
> *`<!-- INSERT SCREENSHOT: Admin dashboard -->`*

### Managing Portfolio

Navigate to **Portfolio** in the admin sidebar to add, edit, reorder, and delete portfolio items that appear on the public site.

> ![Portfolio manager screenshot]
> *`<!-- INSERT SCREENSHOT: Admin portfolio manager -->`*

### Managing Pricing Packages

Navigate to **Pricing** to create and manage pricing packages displayed on the public pricing page.

> ![Pricing manager screenshot]
> *`<!-- INSERT SCREENSHOT: Admin pricing manager -->`*

### Managing Inquiries

View and update the status of client inquiries submitted through the pricing page contact form.

> ![Inquiry list screenshot]
> *`<!-- INSERT SCREENSHOT: Admin inquiry list -->`*

### Managing Reviews

Approve, reject, or delete client reviews. Only approved reviews appear on the public site.

> ![Review manager screenshot]
> *`<!-- INSERT SCREENSHOT: Admin review manager -->`*

### Site Settings

Edit business contact information, social media links, payment method settings (Venmo/PayPal/Zelle usernames), and other site-wide configuration.

> ![Site settings screenshot]
> *`<!-- INSERT SCREENSHOT: Admin site settings -->`*

---

### Projects Workflow

#### Creating a Project

1. Go to **Projects** > **New Project**
2. Enter a title, description, and the client's email address
3. If the client doesn't have an account yet, one is created automatically and they receive an invite email

> ![Create project screenshot]
> *`<!-- INSERT SCREENSHOT: Create project form -->`*

#### Uploading Media

1. Open a project from the project list
2. Drag and drop images onto the upload zone (or click to browse)
3. Supported formats: JPEG, PNG, TIFF
4. Images are automatically compressed and thumbnailed

> ![Project detail with media screenshot]
> *`<!-- INSERT SCREENSHOT: Project detail page with uploaded photos -->`*

#### Delivering a Project

1. Click **Deliver Project** on the project detail page
2. Set optional gallery link expiration and project archival dates
3. Optionally check **"Create invoice for this project"** to generate an invoice:
   - Enter a due date
   - Add line items (description, dollar amount, quantity)
   - The invoice is created with "sent" status immediately
   - Gallery downloads will be locked until the invoice is marked as paid
4. Click **Deliver & Notify Client** — the client receives an email with their gallery link

> ![Deliver modal screenshot]
> *`<!-- INSERT SCREENSHOT: Deliver project modal with invoice option -->`*

> ![Deliver modal with invoice screenshot]
> *`<!-- INSERT SCREENSHOT: Deliver modal with invoice fields expanded -->`*

#### Gallery Link

After delivery, the gallery link is displayed on the project detail page. Copy and share it with the client.

> ![Gallery link screenshot]
> *`<!-- INSERT SCREENSHOT: Gallery link shown on project detail page -->`*

---

### Invoices Workflow

#### Creating Standalone Invoices

1. Go to **Invoices** > **New Invoice**
2. Select a client, set due date, add line items
3. Invoices can also be created during project delivery (see above)

> ![Create invoice screenshot]
> *`<!-- INSERT SCREENSHOT: Create invoice form -->`*

#### Managing Invoice Status

Update invoice status from the invoice list:
- **Draft** — invoice is being prepared (client sees "being prepared" message)
- **Sent** — client can view and pay
- **Paid** — payment received, gallery downloads unlocked
- **Void** — invoice cancelled

> ![Invoice list screenshot]
> *`<!-- INSERT SCREENSHOT: Admin invoice list with status controls -->`*

---

## Client Experience

### Shared Gallery

Clients receive an email with a link to their photo gallery. The gallery page shows:

- Responsive image grid with all delivered photos
- Lightbox view for full-size images
- Image selection (toggle checkmarks)
- Download Selected / Download All / Export for Printing buttons

> ![Client gallery screenshot]
> *`<!-- INSERT SCREENSHOT: Client shared gallery view -->`*

### Downloads Locked (Unpaid Invoice)

If the project has an unpaid invoice, the gallery shows an amber banner with a link to the invoice page. All download buttons are disabled until payment is received.

> ![Locked gallery screenshot]
> *`<!-- INSERT SCREENSHOT: Gallery with downloads locked and payment banner -->`*

### Invoice Payment

Clients click the invoice link to view their invoice with payment options:

- **Venmo** — opens Venmo with pre-filled amount
- **PayPal** — opens PayPal.me with pre-filled amount
- **Zelle** — displays Zelle recipient info

> ![Public invoice screenshot]
> *`<!-- INSERT SCREENSHOT: Public invoice page with payment buttons -->`*

### After Payment

Once the admin marks the invoice as paid, the client can refresh the gallery and download their photos.

---

## API Reference

The backend exposes a REST API at `/api`. Full endpoint listing:

### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/portfolio` | List visible portfolio items |
| GET | `/api/pricing` | List visible pricing packages |
| POST | `/api/inquiries` | Submit an inquiry |
| GET | `/api/reviews` | List approved reviews |
| POST | `/api/reviews` | Submit a review |
| GET | `/api/settings` | Get public site settings |
| GET | `/api/settings/:key` | Get a single setting |
| GET | `/api/invoice/:token` | View invoice by token |
| GET | `/api/health` | Health check |

### Gallery (token-based, no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/gallery/:token` | Gallery metadata + lock status |
| GET | `/api/gallery/:token/media` | List gallery images |
| POST | `/api/gallery/:token/select` | Select/deselect images |
| GET | `/api/gallery/:token/download` | Download selected (zip) |
| GET | `/api/gallery/:token/download-all` | Download all (zip) |
| POST | `/api/gallery/:token/shutterfly-export` | Export for printing (zip) |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/set-password` | Set password from invite |

### Admin (requires admin JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| CRUD | `/api/admin/portfolio` | Manage portfolio items |
| CRUD | `/api/admin/pricing` | Manage pricing packages |
| GET/PUT | `/api/admin/inquiries` | Manage inquiries |
| GET/PUT/DELETE | `/api/admin/reviews` | Moderate reviews |
| CRUD | `/api/admin/projects` | Manage projects |
| POST | `/api/admin/projects/:id/deliver` | Deliver project (+ optional invoice) |
| PUT | `/api/admin/projects/:id/archive` | Archive project |
| POST/DELETE | `/api/admin/projects/:id/media` | Upload/delete media |
| GET | `/api/admin/clients` | List clients |
| GET/POST | `/api/admin/invoices` | List/create invoices |
| PUT | `/api/admin/invoices/:id/status` | Update invoice status |
| GET/PUT | `/api/admin/settings` | Manage site settings |

### Client (requires client JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/client/projects` | List own projects |
| GET | `/api/client/invoices` | List own invoices |

---

## License

Private — all rights reserved.
