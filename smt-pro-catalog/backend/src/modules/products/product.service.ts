import prisma from '../../config/prisma';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from '../../config/cloudinary';
import { getIO } from '../../config/socket';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const PRODUCT_CACHE_TTL = 60; // 1 minute — products change frequently

const SELECT = {
  id: true, name: true, description: true,
  price: true, costPrice: true,
  quantity: true, lowStockAlert: true,
  imageUrl: true, imagePublicId: true,
  category: true, categoryId: true,
  sku: true, barcode: true, unit: true,
  isActive: true, createdAt: true, updatedAt: true,
  images: { select: { id: true, url: true, publicId: true, order: true }, orderBy: { order: 'asc' as const } },
} as const;

interface ProductFilters {
  category?: string;
  search?: string;
  page?: string | number;
  limit?: string | number;
}

interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  quantity: number;
  lowStockAlert?: number;
  category: string;
  categoryId?: number;
  sku?: string;
  barcode?: string;
  unit?: string;
  isActive?: boolean;
}

export const getAll = async ({ category, search, page = 1, limit = 20 }: ProductFilters = {}) => {
  const cacheKey = `products:list:${String(category)}:${String(search)}:${String(page)}:${String(limit)}`;
  const cached   = await get<{ products: unknown[]; total: number; page: number; limit: number }>(cacheKey);
  if (cached) return cached;

  const where: Record<string, unknown> = { deletedAt: null };
  if (category) where['category'] = { equals: category, mode: 'insensitive' };
  if (search)   where['OR'] = [
    { name:        { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
  ];
  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));
  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: SELECT }),
    prisma.product.count({ where }),
  ]);
  const result = { products, total, page: parseInt(String(page)), limit: take };
  await set(cacheKey, result, PRODUCT_CACHE_TTL);
  return result;
};

export const getByBarcode = async (code: string) => {
  const product = await prisma.product.findFirst({
    where: { OR: [{ barcode: code }, { sku: code }] },
    select: SELECT,
  });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  return product;
};

export const getById = async (id: string | number) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(String(id)) },
    select: { ...SELECT, updatedAt: true },
  });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  return product;
};

interface ImageFile { buffer: Buffer; mimetype: string; }

export const create = async (data: CreateProductInput, imageFiles: ImageFile[] = []) => {
  let imageUrl: string | null = null;
  let imagePublicId: string | null = null;
  const extraImages: { url: string; publicId: string; order: number }[] = [];

  if (imageFiles.length > 0 && isCloudinaryConfigured()) {
    const uploads = await Promise.all(
      imageFiles.map((f) => uploadToCloudinary(f.buffer, 'products', f.mimetype)),
    );
    imageUrl      = uploads[0]!.url;
    imagePublicId = uploads[0]!.publicId;
    uploads.forEach((u, i) => extraImages.push({ url: u.url, publicId: u.publicId, order: i }));
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      imageUrl,
      imagePublicId,
      images: extraImages.length > 0 ? { create: extraImages } : undefined,
    },
    select: SELECT,
  });
  await invalidate('products:');
  getIO()?.to('all').emit('product:created', product);
  return product;
};

export const update = async (
  id: string | number,
  updates: Partial<CreateProductInput> & { imageUrl?: string; imagePublicId?: string },
  imageFiles: ImageFile[] = [],
) => {
  const pid = parseInt(String(id));
  const existing = await prisma.product.findUnique({
    where: { id: pid },
    include: { images: true },
  });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');

  if (imageFiles.length > 0 && isCloudinaryConfigured()) {
    // Delete old images from storage
    await Promise.all([
      deleteFromCloudinary(existing.imagePublicId),
      ...existing.images.map((img) => deleteFromCloudinary(img.publicId)),
    ]);
    // Upload new images
    const uploads = await Promise.all(
      imageFiles.map((f) => uploadToCloudinary(f.buffer, 'products', f.mimetype)),
    );
    updates.imageUrl      = uploads[0]!.url;
    updates.imagePublicId = uploads[0]!.publicId;

    // Replace all ProductImage rows
    await prisma.productImage.deleteMany({ where: { productId: pid } });
    await prisma.productImage.createMany({
      data: uploads.map((u, i) => ({ productId: pid, url: u.url, publicId: u.publicId, order: i })),
    });
  }

  const product = await prisma.product.update({
    where: { id: pid },
    data: updates,
    select: SELECT,
  });
  await invalidate('products:');
  getIO()?.to('all').emit('product:updated', product);
  return product;
};

export const remove = async (id: string | number): Promise<void> => {
  const pid = parseInt(String(id));
  const existing = await prisma.product.findUnique({ where: { id: pid } });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');
  await prisma.product.update({ where: { id: pid }, data: { deletedAt: new Date(), isActive: false } });
  await invalidate('products:');
  getIO()?.to('all').emit('product:deleted', { id: pid });
};

export const restore = async (id: string | number) => {
  const pid = parseInt(String(id));
  const existing = await prisma.product.findUnique({ where: { id: pid } });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');
  if (!existing.deletedAt) throw new Error('PRODUCT_NOT_DELETED');
  const product = await prisma.product.update({
    where: { id: pid },
    data: { deletedAt: null, isActive: true },
    select: SELECT,
  });
  await invalidate('products:');
  getIO()?.to('all').emit('product:restored', product);
  return product;
};

export const getDeleted = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const where = { deletedAt: { not: null } };
  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { deletedAt: 'desc' }, skip, take: limit, select: { ...SELECT, deletedAt: true } }),
    prisma.product.count({ where }),
  ]);
  return { products, total, page, limit };
};

export const permanentDelete = async (id: string | number): Promise<void> => {
  const pid = parseInt(String(id));
  const existing = await prisma.product.findUnique({ where: { id: pid } });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');
  await deleteFromCloudinary(existing.imagePublicId);
  await prisma.product.delete({ where: { id: pid } });
  await invalidate('products:');
};
