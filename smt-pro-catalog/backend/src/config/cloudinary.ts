import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { UploadResult } from '../types';

const CLOUD_NAME = process.env['CLOUDINARY_CLOUD_NAME'];
const API_KEY    = process.env['CLOUDINARY_API_KEY'];
const API_SECRET = process.env['CLOUDINARY_API_SECRET'];

if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });
}

export const isCloudinaryConfigured = (): boolean =>
  Boolean(CLOUD_NAME && API_KEY && API_SECRET);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
});

export const uploadToCloudinary = (
  buffer: Buffer,
  folder  = 'products',
  mimetype = 'image/jpeg',
): Promise<UploadResult> =>
  new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith('video/') ? 'video' : 'image';
    cloudinary.uploader
      .upload_stream({ folder, resource_type: resourceType }, (err, result) => {
        if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      })
      .end(buffer);
  });

export const deleteFromCloudinary = async (publicId: string | null | undefined): Promise<void> => {
  if (!publicId || !isCloudinaryConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // ignore delete errors — don't crash if image already gone
  }
};
