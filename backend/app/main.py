from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import connect_db, close_db
from app.routers import auth, public, gallery
from app.routers.admin import (
    portfolio as admin_portfolio,
    pricing as admin_pricing,
    inquiries as admin_inquiries,
    reviews as admin_reviews,
    projects as admin_projects,
    media as admin_media,
    clients as admin_clients,
    invoices as admin_invoices,
    settings as admin_settings,
    dashboard as admin_dashboard,
)
from app.routers.client import projects as client_projects, invoices as client_invoices


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(title="MAD Photography API", lifespan=lifespan)


settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(public.router, prefix="/api", tags=["public"])
app.include_router(gallery.router, prefix="/api/gallery", tags=["gallery"])

# Admin routes
app.include_router(admin_portfolio.router, prefix="/api/admin/portfolio", tags=["admin-portfolio"])
app.include_router(admin_pricing.router, prefix="/api/admin/pricing", tags=["admin-pricing"])
app.include_router(admin_inquiries.router, prefix="/api/admin/inquiries", tags=["admin-inquiries"])
app.include_router(admin_reviews.router, prefix="/api/admin/reviews", tags=["admin-reviews"])
app.include_router(admin_projects.router, prefix="/api/admin/projects", tags=["admin-projects"])
app.include_router(admin_media.router, prefix="/api/admin/projects", tags=["admin-media"])
app.include_router(admin_clients.router, prefix="/api/admin/clients", tags=["admin-clients"])
app.include_router(admin_invoices.router, prefix="/api/admin/invoices", tags=["admin-invoices"])
app.include_router(admin_settings.router, prefix="/api/admin/settings", tags=["admin-settings"])
app.include_router(admin_dashboard.router, prefix="/api/admin/dashboard", tags=["admin-dashboard"])

# Client routes
app.include_router(client_projects.router, prefix="/api/client/projects", tags=["client-projects"])
app.include_router(client_invoices.router, prefix="/api/client/invoices", tags=["client-invoices"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
