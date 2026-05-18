const prisma = require('../config/prisma');
const { cloudinary } = require('../config/cloudinary');

const getAll = async ({ category, search, page = 1, limit = 20 } = {}) => {
  const where = {};

  if (category) where.category = { equals: category, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true, name: true, description: true, price: true,
        quantity: true, imageUrl: true, category: true, createdAt: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page: parseInt(page), limit: take };
};

const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true, name: true, description: true, price: true,
      quantity: true, imageUrl: true, category: true, createdAt: true, updatedAt: true,
    },
  });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  return product;
};

const create = async ({ name, description, price, quantity, category, imageUrl, imagePublicId }) => {
  return prisma.product.create({
    data: { name, description, price, quantity, category, imageUrl, imagePublicId },
    select: {
      id: true, name: true, description: true, price: true,
      quantity: true, imageUrl: true, category: true, createdAt: true,
    },
  });
};

const update = async (id, updates, newImagePublicId) => {
  const existing = await prisma.product.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');

  if (newImagePublicId && existing.imagePublicId) {
    await cloudinary.uploader.destroy(existing.imagePublicId).catch(() => {});
  }

  return prisma.product.update({
    where: { id: parseInt(id) },
    data: updates,
    select: {
      id: true, name: true, description: true, price: true,
      quantity: true, imageUrl: true, category: true, updatedAt: true,
    },
  });
};

const remove = async (id) => {
  const existing = await prisma.product.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');

  if (existing.imagePublicId) {
    await cloudinary.uploader.destroy(existing.imagePublicId).catch(() => {});
  }

  await prisma.product.delete({ where: { id: parseInt(id) } });
};

module.exports = { getAll, getById, create, update, remove };
