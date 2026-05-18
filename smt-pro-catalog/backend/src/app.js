const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const compression  = require('compression');
const logger       = require('./shared/utils/logger.util');
const { apiLimiter } = require('./shared/middlewares/rateLimiter.middleware');

const authRoutes       = require('./modules/auth/auth.routes');
const categoryRoutes   = require('./modules/categories/category.routes');
const productRoutes    = require('./modules/products/product.routes');
const orderRoutes      = require('./modules/orders/order.routes');
const inventoryRoutes  = require('./modules/inventory/inventory.routes');
const financeRoutes    = require('./modules/finance/finance.routes');
const reportRoutes     = require('./modules/reports/reports.routes');

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());

const isProd = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProd
    ? (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
    : true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

// ─── Performance ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:      'ok',
    service:     'SMT Catalogue API',
    version:     '2.0.0',
    environment: process.env.NODE_ENV || 'development',
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
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`${err.status ?? 500} — ${err.message}`, { stack: err.stack });
  res.status(err.status ?? 500).json({
    status:  'error',
    message: isProd ? 'Internal server error' : (err.message ?? 'Internal server error'),
  });
});

module.exports = app;
