const prisma                 = require('../../config/prisma');
const { getIO }              = require('../../config/socket');
const { get, set, invalidate } = require('../../shared/utils/cache.util');

const CACHE_TTL = 300;

const SELECT = {
  id: true, name: true, nameAr: true, nameKu: true, slug: true,
  description: true, imageUrl: true, order: true, isActive: true,
  parentId: true, createdAt: true, updatedAt: true,
};

// ─── Build tree from flat list ────────────────────────────────────────────────

const buildTree = (categories, parentId = null) => {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((cat) => ({ ...cat, children: buildTree(categories, cat.id) }));
};

// ─── Queries ──────────────────────────────────────────────────────────────────

const getTree = async ({ includeInactive = false } = {}) => {
  const cacheKey = `categories:tree:${includeInactive}`;
  const cached   = await get(cacheKey);
  if (cached) return cached;

  const where = includeInactive ? {} : { isActive: true };
  const all   = await prisma.category.findMany({ where, select: SELECT });
  const tree  = buildTree(all);

  await set(cacheKey, tree, CACHE_TTL);
  return tree;
};

const getFlat = async ({ parentId, includeInactive = false } = {}) => {
  const where = includeInactive ? {} : { isActive: true };
  if (parentId !== undefined) where.parentId = parentId === null ? null : parentId;

  return prisma.category.findMany({
    where,
    select: SELECT,
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
};

const getById = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id: parseInt(id) },
    select: {
      ...SELECT,
      parent:   { select: { id: true, name: true, slug: true } },
      children: { select: SELECT, orderBy: [{ order: 'asc' }, { name: 'asc' }] },
      _count:   { select: { products: true } },
    },
  });
  if (!category) throw new Error('CATEGORY_NOT_FOUND');
  return category;
};

const getBySlug = async (slug) => {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      ...SELECT,
      parent:   { select: { id: true, name: true, slug: true } },
      children: { select: SELECT, orderBy: [{ order: 'asc' }, { name: 'asc' }] },
      _count:   { select: { products: true } },
    },
  });
  if (!category) throw new Error('CATEGORY_NOT_FOUND');
  return category;
};

// ─── Mutations ────────────────────────────────────────────────────────────────

const create = async (data) => {
  const exists = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (exists) throw new Error('SLUG_TAKEN');

  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new Error('PARENT_NOT_FOUND');
  }

  const category = await prisma.category.create({ data, select: SELECT });

  await invalidate('categories:');
  getIO()?.to('all').emit('category:created', category);
  return category;
};

const update = async (id, updates) => {
  const existing = await prisma.category.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('CATEGORY_NOT_FOUND');

  if (updates.slug && updates.slug !== existing.slug) {
    const conflict = await prisma.category.findUnique({ where: { slug: updates.slug } });
    if (conflict) throw new Error('SLUG_TAKEN');
  }

  if (updates.parentId && updates.parentId === parseInt(id)) {
    throw new Error('CATEGORY_CANNOT_BE_OWN_PARENT');
  }

  const category = await prisma.category.update({
    where: { id: parseInt(id) },
    data:  updates,
    select: SELECT,
  });

  await invalidate('categories:');
  getIO()?.to('all').emit('category:updated', category);
  return category;
};

const remove = async (id) => {
  const existing = await prisma.category.findUnique({
    where:  { id: parseInt(id) },
    select: { id: true, _count: { select: { products: true, children: true } } },
  });
  if (!existing) throw new Error('CATEGORY_NOT_FOUND');

  if (existing._count.products > 0) throw new Error('CATEGORY_HAS_PRODUCTS');

  // Soft-deactivate children instead of cascading delete
  if (existing._count.children > 0) {
    await prisma.category.updateMany({
      where: { parentId: parseInt(id) },
      data:  { isActive: false, parentId: null },
    });
  }

  await prisma.category.delete({ where: { id: parseInt(id) } });

  await invalidate('categories:');
  getIO()?.to('all').emit('category:deleted', { id: parseInt(id) });
};

module.exports = { getTree, getFlat, getById, getBySlug, create, update, remove };
