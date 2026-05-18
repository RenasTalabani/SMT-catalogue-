import prisma from '../../config/prisma';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from '../../config/cloudinary';
import { getIO } from '../../config/socket';

const SELECT = {
  id: true, name: true, description: true, price: true,
  quantity: true, imageUrl: true, category: true, createdAt: true,
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
  quantity: number;
  category: string;
}

export const getAll = async ({ category, search, page = 1, limit = 20 }: ProductFilters = {}) => {
  const where: Record<string, unknown> = {};
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
  return { products, total, page: parseInt(String(page)), limit: take };
};

export const getById = async (id: string | number) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(String(id)) },
    select: { ...SELECT, updatedAt: true },
  });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  return product;
};

export const create = async (data: CreateProductInput, imageBuffer?: Buffer, mimetype?: string) => {
  let imageUrl: string | null = null;
  let imagePublicId: string | null = null;

  if (imageBuffer && isCloudinaryConfigured()) {
    const result = await uploadToCloudinary(imageBuffer, 'products', mimetype);
    imageUrl = result.url;
    imagePublicId = result.publicId;
  }

  const product = await prisma.product.create({
    data: { ...data, imageUrl, imagePublicId },
    select: SELECT,
  });
  getIO()?.to('all').emit('product:created', product);
  return product;
};

export const update = async (
  id: string | number,
  updates: Partial<CreateProductInput> & { imageUrl?: string; imagePublicId?: string },
  imageBuffer?: Buffer,
) => {
  const existing = await prisma.product.findUnique({ where: { id: parseInt(String(id)) } });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');

  if (imageBuffer && isCloudinaryConfigured()) {
    await deleteFromCloudinary(existing.imagePublicId);
    const result = await uploadToCloudinary(imageBuffer);
    updates.imageUrl      = result.url;
    updates.imagePublicId = result.publicId;
  }

  const product = await prisma.product.update({
    where: { id: parseInt(String(id)) },
    data: updates,
    select: SELECT,
  });
  getIO()?.to('all').emit('product:updated', product);
  return product;
};

export const remove = async (id: string | number): Promise<void> => {
  const existing = await prisma.product.findUnique({ where: { id: parseInt(String(id)) } });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');
  await deleteFromCloudinary(existing.imagePublicId);
  await prisma.product.delete({ where: { id: parseInt(String(id)) } });
  getIO()?.to('all').emit('product:deleted', { id: parseInt(String(id)) });
};
