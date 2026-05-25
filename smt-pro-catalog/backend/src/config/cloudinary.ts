import { createClient, SupabaseClient } from '@supabase/supabase-js';
import multer from 'multer';
import { UploadResult } from '../types';

const SUPABASE_URL        = process.env['SUPABASE_URL'];
const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SERVICE_KEY'];
const BUCKET = 'products';

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export const isCloudinaryConfigured = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

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

export const uploadToCloudinary = async (
  buffer: Buffer,
  folder   = 'products',
  mimetype = 'image/jpeg',
): Promise<UploadResult> => {
  if (!supabase) throw new Error('Supabase storage is not configured');

  const ext      = mimetype.split('/')[1] ?? 'jpg';
  const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: mimetype, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return { url: data.publicUrl, publicId: fileName };
};

export const deleteFromCloudinary = async (publicId: string | null | undefined): Promise<void> => {
  if (!publicId || !supabase) return;
  try {
    await supabase.storage.from(BUCKET).remove([publicId]);
  } catch {
    // ignore delete errors — don't crash if image already gone
  }
};