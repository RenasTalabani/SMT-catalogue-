import fs   from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { UploadResult } from '../types';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES    = 5 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
});

// ─── Local storage (works everywhere, no account needed) ──────────────────────

const getBaseUrl = (): string => {
  const port = process.env['PORT'] ?? '3000';
  const host = process.env['PUBLIC_URL'] ?? `http://192.168.1.73:${port}`;
  return host;
};

const extFromMime: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg':  '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
};

export const uploadToCloudinary = (
  buffer: Buffer,
  _folder = 'products',
  mimetype = 'image/jpeg',
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    try {
      const ext      = extFromMime[mimetype] ?? '.jpg';
      const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const filepath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filepath, buffer);
      const url = `${getBaseUrl()}/uploads/products/${filename}`;
      resolve({ url, publicId: filename });
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteFromCloudinary = async (publicId: string | null | undefined): Promise<void> => {
  if (!publicId) return;
  try {
    const filepath = path.join(UPLOADS_DIR, publicId);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch {
    // ignore delete errors
  }
};

export const isCloudinaryConfigured = (): boolean => true;
