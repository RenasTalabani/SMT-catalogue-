import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 600;

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── Get all tags with product counts ──────────────────────────────────────────
export const getAll = async () => {
  const cached = await get<unknown>('tags:all');
  if (cached) return cached;

  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  await set('tags:all', tags, CACHE_TTL);
  return tags;
};

// ── Get one tag ────────────────────────────────────────────────────────────────
export const getById = async (id: number) => {
  const tag = await prisma.tag.findUnique({
    where:   { id },
    include: { _count: { select: { products: true } } },
  });
  if (!tag) throw new Error('TAG_NOT_FOUND');
  return tag;
};

// ── Get products by tag slug ───────────────────────────────────────────────────
export const getProductsByTag = async (slug: string, page = 1, limit = 20) => {
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) throw new Error('TAG_NOT_FOUND');

  const skip = (page - 1) * limit;
  const where = { tags: { some: { tagId: tag.id } }, deletedAt: null };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, name: true, price: true, quantity: true,
        imageUrl: true, category: true, sku: true, unit: true,
        tags: { include: { tag: { select: { id: true, name: true, color: true, slug: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { tag, products, total, page, limit };
};

// ── Create tag ─────────────────────────────────────────────────────────────────
export const create = async (data: { name: string; color?: string }) => {
  const slug = toSlug(data.name);
  const existing = await prisma.tag.findFirst({ where: { OR: [{ name: data.name }, { slug }] } });
  if (existing) throw new Error('TAG_EXISTS');

  const tag = await prisma.tag.create({ data: { name: data.name, slug, color: data.color ?? '#6366f1' } });
  await invalidate('tags:');
  return tag;
};

// ── Update tag ─────────────────────────────────────────────────────────────────
export const update = async (id: number, data: { name?: string; color?: string }) => {
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) throw new Error('TAG_NOT_FOUND');

  const updateData: { name?: string; slug?: string; color?: string } = {};
  if (data.name) {
    const slug     = toSlug(data.name);
    const conflict = await prisma.tag.findFirst({ where: { OR: [{ name: data.name }, { slug }], id: { not: id } } });
    if (conflict) throw new Error('TAG_EXISTS');
    updateData.name = data.name;
    updateData.slug = slug;
  }
  if (data.color) updateData.color = data.color;

  const tag = await prisma.tag.update({ where: { id }, data: updateData });
  await invalidate('tags:');
  return tag;
};

// ── Delete tag ─────────────────────────────────────────────────────────────────
export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) throw new Error('TAG_NOT_FOUND');
  await prisma.tag.delete({ where: { id } });
  await invalidate('tags:');
  await invalidate('products:');
};

// ── Set tags on a product (replaces all existing tags) ────────────────────────
export const setProductTags = async (productId: number, tagIds: number[]) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  await prisma.$transaction(async (tx) => {
    await tx.productTag.deleteMany({ where: { productId } });
    if (tagIds.length) {
      await tx.productTag.createMany({
        data: tagIds.map((tagId) => ({ productId, tagId })),
        skipDuplicates: true,
      });
    }
  });

  await invalidate('tags:');
  await invalidate('products:');

  return prisma.product.findUnique({
    where:   { id: productId },
    include: { tags: { include: { tag: true } } },
  });
};

// ── Add single tag to product ──────────────────────────────────────────────────
export const addTag = async (productId: number, tagId: number) => {
  const [product, tag] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.tag.findUnique({ where: { id: tagId } }),
  ]);
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  if (!tag)     throw new Error('TAG_NOT_FOUND');

  await prisma.productTag.upsert({
    where:  { productId_tagId: { productId, tagId } },
    create: { productId, tagId },
    update: {},
  });
  await invalidate('tags:');
  return tag;
};

// ── Remove single tag from product ────────────────────────────────────────────
export const removeTag = async (productId: number, tagId: number): Promise<void> => {
  await prisma.productTag.deleteMany({ where: { productId, tagId } });
  await invalidate('tags:');
};

// ── Bulk tag multiple products at once ────────────────────────────────────────
export const bulkTag = async (productIds: number[], tagIds: number[]): Promise<number> => {
  const pairs = productIds.flatMap((pid) => tagIds.map((tid) => ({ productId: pid, tagId: tid })));
  const result = await prisma.productTag.createMany({ data: pairs, skipDuplicates: true });
  await invalidate('tags:');
  await invalidate('products:');
  return result.count;
};
