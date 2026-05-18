import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 300;

const SELECT = {
  id: true, name: true, nameAr: true, nameKu: true, slug: true,
  description: true, imageUrl: true, order: true, isActive: true,
  parentId: true, createdAt: true, updatedAt: true,
} as const;

type CategoryRow = {
  id: number;
  name: string;
  nameAr: string | null;
  nameKu: string | null;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  order: number;
  isActive: boolean;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type CategoryTree = CategoryRow & { children: CategoryTree[] };

const buildTree = (categories: CategoryRow[], parentId: number | null = null): CategoryTree[] =>
  categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((cat) => ({ ...cat, children: buildTree(categories, cat.id) }));

export const getTree = async ({ includeInactive = false } = {}): Promise<CategoryTree[]> => {
  const cacheKey = `categories:tree:${String(includeInactive)}`;
  const cached   = await get<CategoryTree[]>(cacheKey);
  if (cached) return cached;

  const where = includeInactive ? {} : { isActive: true };
  const all   = await prisma.category.findMany({ where, select: SELECT });
  const tree  = buildTree(all as CategoryRow[]);

  await set(cacheKey, tree, CACHE_TTL);
  return tree;
};

export const getFlat = async ({
  parentId,
  includeInactive = false,
}: { parentId?: number | null; includeInactive?: boolean } = {}): Promise<CategoryRow[]> => {
  const where: Record<string, unknown> = includeInactive ? {} : { isActive: true };
  if (parentId !== undefined) where['parentId'] = parentId;

  return prisma.category.findMany({
    where,
    select: SELECT,
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  }) as Promise<CategoryRow[]>;
};

export const getById = async (id: string | number): Promise<unknown> => {
  const category = await prisma.category.findUnique({
    where: { id: parseInt(String(id)) },
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

export const getBySlug = async (slug: string): Promise<unknown> => {
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

export const create = async (data: Record<string, unknown>): Promise<CategoryRow> => {
  const exists = await prisma.category.findUnique({ where: { slug: data['slug'] as string } });
  if (exists) throw new Error('SLUG_TAKEN');

  if (data['parentId']) {
    const parent = await prisma.category.findUnique({ where: { id: data['parentId'] as number } });
    if (!parent) throw new Error('PARENT_NOT_FOUND');
  }

  const category = await prisma.category.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
    select: SELECT,
  }) as CategoryRow;

  await invalidate('categories:');
  getIO()?.to('all').emit('category:created', category);
  return category;
};

export const update = async (id: string | number, updates: Record<string, unknown>): Promise<CategoryRow> => {
  const numId = parseInt(String(id));
  const existing = await prisma.category.findUnique({ where: { id: numId } });
  if (!existing) throw new Error('CATEGORY_NOT_FOUND');

  if (updates['slug'] && updates['slug'] !== existing.slug) {
    const conflict = await prisma.category.findUnique({ where: { slug: updates['slug'] as string } });
    if (conflict) throw new Error('SLUG_TAKEN');
  }

  if (updates['parentId'] && updates['parentId'] === numId) {
    throw new Error('CATEGORY_CANNOT_BE_OWN_PARENT');
  }

  const category = await prisma.category.update({
    where: { id: numId },
    data:  updates,
    select: SELECT,
  }) as CategoryRow;

  await invalidate('categories:');
  getIO()?.to('all').emit('category:updated', category);
  return category;
};

export const remove = async (id: string | number): Promise<void> => {
  const numId = parseInt(String(id));
  const existing = await prisma.category.findUnique({
    where:  { id: numId },
    select: { id: true, _count: { select: { products: true, children: true } } },
  });
  if (!existing) throw new Error('CATEGORY_NOT_FOUND');

  if (existing._count.products > 0) throw new Error('CATEGORY_HAS_PRODUCTS');

  if (existing._count.children > 0) {
    await prisma.category.updateMany({
      where: { parentId: numId },
      data:  { isActive: false, parentId: null },
    });
  }

  await prisma.category.delete({ where: { id: numId } });

  await invalidate('categories:');
  getIO()?.to('all').emit('category:deleted', { id: numId });
};
