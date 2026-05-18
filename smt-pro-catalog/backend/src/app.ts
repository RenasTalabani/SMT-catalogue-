import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import logger from './shared/utils/logger.util';
import { apiLimiter } from './shared/middlewares/rateLimiter.middleware';
import { ApiError } from './types';

import authRoutes      from './modules/auth/auth.routes';
import categoryRoutes  from './modules/categories/category.routes';
import productRoutes   from './modules/products/product.routes';
import orderRoutes     from './modules/orders/order.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import financeRoutes   from './modules/finance/finance.routes';
import reportRoutes    from './modules/reports/reports.routes';

const app = express();
const isProd = process.env['NODE_ENV'] === 'production';

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: isProd
    ? (process.env['ALLOWED_ORIGINS'] ?? '').split(',').map((o) => o.trim()).filter(Boolean)
    : true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

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
    service:     'SMT Catalogue API',
    version:     '3.0.0',
    environment: process.env['NODE_ENV'] ?? 'development',
    timestamp:   new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/inventory',  inventoryRoutes);
app.use('/api/finance',    financeRoutes);
app.use('/api/reports',    reportRoutes);

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
