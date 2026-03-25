import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

import authRouter from './routes/auth';
import publicRouter from './routes/public';
import galleryRouter from './routes/gallery';

import adminPortfolioRouter from './routes/admin/portfolio';
import adminPricingRouter from './routes/admin/pricing';
import adminInquiriesRouter from './routes/admin/inquiries';
import adminReviewsRouter from './routes/admin/reviews';
import adminProjectsRouter from './routes/admin/projects';
import adminMediaRouter from './routes/admin/media';
import adminClientsRouter from './routes/admin/clients';
import adminInvoicesRouter from './routes/admin/invoices';
import adminSettingsRouter from './routes/admin/settings';
import adminDashboardRouter from './routes/admin/dashboard';

import clientProjectsRouter from './routes/client/projects';
import clientInvoicesRouter from './routes/client/invoices';

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json());

// Rate limiting for public mutation endpoints
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/inquiries', publicLimiter);
app.use('/api/reviews', publicLimiter);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/auth/forgot-password', publicLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api', publicRouter);
app.use('/api/gallery', galleryRouter);

// Admin routes
app.use('/api/admin/portfolio', adminPortfolioRouter);
app.use('/api/admin/pricing', adminPricingRouter);
app.use('/api/admin/inquiries', adminInquiriesRouter);
app.use('/api/admin/reviews', adminReviewsRouter);
app.use('/api/admin/projects', adminProjectsRouter);
app.use('/api/admin/projects', adminMediaRouter);
app.use('/api/admin/clients', adminClientsRouter);
app.use('/api/admin/invoices', adminInvoicesRouter);
app.use('/api/admin/settings', adminSettingsRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);

// Client routes
app.use('/api/client/projects', clientProjectsRouter);
app.use('/api/client/invoices', clientInvoicesRouter);

// Health check
app.all('/api/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

app.use(errorHandler);

export default app;
