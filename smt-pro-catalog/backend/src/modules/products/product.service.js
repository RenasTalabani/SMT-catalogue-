const prisma                              = require('../../config/prisma');
const { uploadToCloudinary,
        deleteFromCloudinary }            = require('../../config/cloudinary');
const { getIO }                           = require('../../config/socket');

const SELECT = {
  id: true, name: true, description: true, price: true,
  quantity: true, imageUrl: true, category: true, createdAt: true,
};

const getAll = async ({ category, search, page = 1, limit = 20 } = {}) => {
  const where = {};
  if (category) where.category = { equals: category, mode: 'insensitive' };
  if (search)   where.OR = [
    { name:        { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
  ];
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: SELECT }),
    prisma.product.count({ where }),
  ]);
  return { products, total, page: parseInt(page), limit: take };
};

const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    select: { ...SELECT, updatedAt: true },
  });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  return product;
};

const create = async (data, imageBuffer) => {
  let imageUrl = null, imagePublicId = null;
  if (imageBuffer) {
    const result = await uploadToCloudinary(imageBuffer);
    imageUrl = result.url; imagePublicId = result.publicId;
  }
  const product = await prisma.product.create({
    data: { ...data, imageUrl, imagePublicId },
    select: SELECT,
  });
  getIO()?.to('all').emit('product:created', product);
  return product;
};

const update = async (id, updates, imageBuffer) => {
  const existing = await prisma.product.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');

  if (imageBuffer) {
    await deleteFromCloudinary(existing.imagePublicId);
    const result = await uploadToCloudinary(imageBuffer);
    updates.imageUrl = result.url;
    updates.imagePublicId = result.publicId;
  }
  const product = await prisma.product.update({
    where: { id: parseInt(id) }, data: updates, select: SELECT,
  });
  getIO()?.to('all').emit('product:updated', product);
  return product;
};

const remove = async (id) => {
  const existing = await prisma.product.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');
  await deleteFromCloudinary(existing.imagePublicId);
  await prisma.product.delete({ where: { id: parseInt(id) } });
  getIO()?.to('all').emit('product:deleted', { id: parseInt(id) });
};

module.exports = { getAll, getById, create, update, remove };
