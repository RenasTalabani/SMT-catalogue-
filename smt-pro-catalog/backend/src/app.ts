import 'dotenv/config';
import * as Sentry from '@sentry/node';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import logger from './shared/utils/logger.util';
import { apiLimiter } from './shared/middlewares/rateLimiter.middleware';
import { ApiError } from './types';

import authRoutes         from './modules/auth/auth.routes';
import categoryRoutes     from './modules/categories/category.routes';
import productRoutes      from './modules/products/product.routes';
import orderRoutes        from './modules/orders/order.routes';
import inventoryRoutes    from './modules/inventory/inventory.routes';
import financeRoutes      from './modules/finance/finance.routes';
import reportRoutes       from './modules/reports/reports.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import invoiceRoutes      from './modules/invoices/invoice.routes';
import userRoutes         from './modules/users/user.routes';
import customerRoutes     from './modules/customers/customer.routes';
import exportRoutes       from './modules/exports/export.routes';
import searchRoutes       from './modules/search/search.routes';
import shopRoutes         from './modules/shop/shop.routes';
import purchaseOrderRoutes from './modules/purchase-orders/purchase-order.routes';
import returnRoutes        from './modules/returns/return.routes';
import couponRoutes        from './modules/coupons/coupon.routes';
import loyaltyRoutes       from './modules/loyalty/loyalty.routes';
import stocktakeRoutes     from './modules/stocktakes/stocktake.routes';

const app = express();
const isProd = process.env['NODE_ENV'] === 'production';

// ─── Trust Railway / Render reverse proxy (needed for rate-limit real-IP) ────
app.set('trust proxy', 1);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images served from /uploads
  contentSecurityPolicy: false,                           // REST API — no HTML pages to protect
}));
const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
  .split(',').map((o) => o.trim()).filter(Boolean);

app.use(cors({
  // In production: use ALLOWED_ORIGINS list; fall back to permissive if unset (allows
  // initial Railway deployment before the web URL is known, then tighten after).
  origin: isProd && allowedOrigins.length > 0 ? allowedOrigins : true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

if (isProd && allowedOrigins.length === 0) {
  logger.warn('[cors] ALLOWED_ORIGINS not set — all origins permitted. Set it to your web URL after first deploy.');
}

// ─── Performance ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.http(msg.trim()) },
}));

// ─── Static files (local image uploads) ──────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status:      'ok',
    service:     'DaralIraq API',
    version:     '3.0.0',
    environment: process.env['NODE_ENV'] ?? 'development',
    timestamp:   new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/inventory',     inventoryRoutes);
app.use('/api/finance',       financeRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invoices',     invoiceRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/customers',    customerRoutes);
app.use('/api/export',       exportRoutes);
app.use('/api/search',       searchRoutes);
app.use('/api/shop',           shopRoutes);           // public — no auth required
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/returns',         returnRoutes);
app.use('/api/coupons',         couponRoutes);
app.use('/api/loyalty',         loyaltyRoutes);
app.use('/api/stocktakes',      stocktakeRoutes);

// ─── Sentry error capture (must be before error handler) ─────────────────────
Sentry.setupExpressErrorHandler(app);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`${err.status ?? 500} — ${err.message}`, { stack: err.stack });
  res.status(err.status ?? 500).json({
    status:  'error',
    message: isProd ? 'Internal server error' : (err.message ?? 'Internal server error'),
  });
});

export default app;
