require('dotenv').config();

const REQUIRED = {
  MONGODB_URI: { min: 10, msg: 'MONGODB_URI is required (mongodb://...)' },
};

const errors = [];

for (const [key, rule] of Object.entries(REQUIRED)) {
  const val = process.env[key];
  if (!val || val.length < rule.min) errors.push(`  ${key}: ${rule.msg}`);
}

const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret && jwtSecret.startsWith('change_') || jwtSecret === 'your_secret') {
  errors.push('  JWT_SECRET: must not use placeholder value in production');
}

if (errors.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing required environment variables:\n${errors.join('\n')}`);
} else if (errors.length > 0) {
  console.warn(`[env] WARNING — missing env vars (non-fatal in dev):\n${errors.join('\n')}`);
}

const corsOrigins = (() => {
  const raw = process.env.CLIENT_URL || '*';
  if (process.env.NODE_ENV === 'production' && raw === '*') {
    console.warn('[env] WARNING — CLIENT_URL is wildcard (*) in production. Set it to your domain.');
  }
  if (raw === '*') return raw;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
})();

module.exports = {
  NODE_ENV:              process.env.NODE_ENV || 'development',
  PORT:                  parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI:           process.env.MONGODB_URI || 'mongodb://localhost:27018/smt-catalog',
  CLIENT_URL:            process.env.CLIENT_URL || '*',
  CORS_ORIGINS:          corsOrigins,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY:    process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  LOG_LEVEL:             process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
};
