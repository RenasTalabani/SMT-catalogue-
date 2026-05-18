const env = require('./config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const { errorHandler, notFound } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const productRoutes  = require('./modules/products/product.routes');
const categoryRoutes = require('./modules/categories/category.routes');
const uploadRoutes   = require('./modules/uploads/upload.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const app = express();

// ── Request ID (trace every request) ─────────────────────────────────────────
app.use((req, _res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ── Body parsing & compression ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ── HTTP logging (http level — not info — so it can be filtered separately) ───
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: () => env.NODE_ENV === 'test',
  })
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/products',   productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/upload',     uploadRoutes);
app.use('/api/v1/dashboard',  dashboardRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
