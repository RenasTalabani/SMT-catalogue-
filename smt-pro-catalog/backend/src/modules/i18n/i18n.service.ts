import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

export type Locale = 'en' | 'ar' | 'ku';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'ar', 'ku'];

const CACHE_TTL = 3600; // 1 hour

// ── Apply locale to a product ──────────────────────────────────────────────────
export function applyProductLocale<T extends { id: number; name: string; description?: string | null; translations?: Array<{ locale: string; name: string; description?: string | null }> }>(
  product: T,
  locale: Locale,
): Omit<T, 'translations'> & { localeName: string; localeDescription: string | null } {
  if (locale === 'en' || !product.translations?.length) {
    const { translations: _, ...rest } = product as T & { translations?: unknown };
    return { ...rest, localeName: product.name, localeDescription: product.description ?? null };
  }
  const t = product.translations.find((tx) => tx.locale === locale);
  const { translations: _, ...rest } = product as T & { translations?: unknown };
  return {
    ...rest,
    localeName:        t?.name        ?? product.name,
    localeDescription: t?.description ?? product.description ?? null,
  };
}

// ── Product translations CRUD ─────────────────────────────────────────────────
export const getProductTranslations = async (productId: number) => {
  const translations = await prisma.productTranslation.findMany({
    where:   { productId },
    orderBy: { locale: 'asc' },
  });
  return translations;
};

export const upsertProductTranslation = async (
  productId: number,
  locale: Locale,
  data: { name: string; description?: string },
) => {
  if (!SUPPORTED_LOCALES.includes(locale)) throw new Error('UNSUPPORTED_LOCALE');
  if (locale === 'en') throw new Error('EN_NOT_TRANSLATABLE'); // English is the base

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  const t = await prisma.productTranslation.upsert({
    where:  { productId_locale: { productId, locale } },
    create: { productId, locale, name: data.name, description: data.description ?? null },
    update: { name: data.name, description: data.description ?? null },
  });
  await invalidate(`i18n:product:${productId}`);
  return t;
};

export const deleteProductTranslation = async (productId: number, locale: Locale): Promise<void> => {
  await prisma.productTranslation.deleteMany({ where: { productId, locale } });
  await invalidate(`i18n:product:${productId}`);
};

// ── Category translations CRUD ────────────────────────────────────────────────
export const getCategoryTranslations = async (categoryId: number) => {
  return prisma.categoryTranslation.findMany({ where: { categoryId }, orderBy: { locale: 'asc' } });
};

export const upsertCategoryTranslation = async (
  categoryId: number,
  locale: Locale,
  data: { name: string; description?: string },
) => {
  if (!SUPPORTED_LOCALES.includes(locale)) throw new Error('UNSUPPORTED_LOCALE');
  if (locale === 'en') throw new Error('EN_NOT_TRANSLATABLE');

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error('CATEGORY_NOT_FOUND');

  const t = await prisma.categoryTranslation.upsert({
    where:  { categoryId_locale: { categoryId, locale } },
    create: { categoryId, locale, name: data.name, description: data.description ?? null },
    update: { name: data.name, description: data.description ?? null },
  });
  await invalidate(`i18n:category:${categoryId}`);
  return t;
};

// ── Bulk get translations for a list of products ──────────────────────────────
export const bulkGetProductTranslations = async (productIds: number[], locale: Locale) => {
  if (locale === 'en') return new Map<number, { name: string; description: string | null }>();

  const cacheKey = `i18n:bulk:products:${locale}:${productIds.sort().join(',')}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return new Map(Object.entries(cached as Record<string, { name: string; description: string | null }>).map(([k, v]) => [Number(k), v]));

  const translations = await prisma.productTranslation.findMany({
    where: { productId: { in: productIds }, locale },
    select: { productId: true, name: true, description: true },
  });

  const map = new Map(translations.map((t) => [t.productId, { name: t.name, description: t.description }]));

  const cacheObj = Object.fromEntries(map.entries());
  await set(cacheKey, cacheObj, CACHE_TTL);
  return map;
};

// ── Locale detection from request header ─────────────────────────────────────
export function detectLocale(acceptLanguage?: string): Locale {
  if (!acceptLanguage) return 'en';
  const lang = acceptLanguage.toLowerCase().split(',')[0]?.trim().split(';')[0]?.trim() ?? 'en';
  if (lang.startsWith('ar')) return 'ar';
  if (lang.startsWith('ku') || lang.startsWith('ckb') || lang.startsWith('kmr')) return 'ku';
  return 'en';
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getTranslationStats = async () => {
  const [totalProducts, translatedAr, translatedKu, totalCategories, catAr, catKu] = await Promise.all([
    prisma.product.count({ where: { isActive: true, deletedAt: null } }),
    prisma.productTranslation.count({ where: { locale: 'ar' } }),
    prisma.productTranslation.count({ where: { locale: 'ku' } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.categoryTranslation.count({ where: { locale: 'ar' } }),
    prisma.categoryTranslation.count({ where: { locale: 'ku' } }),
  ]);

  return {
    products: {
      total: totalProducts,
      ar:    translatedAr,
      ku:    translatedKu,
      missingAr: totalProducts - translatedAr,
      missingKu: totalProducts - translatedKu,
    },
    categories: {
      total: totalCategories,
      ar:    catAr,
      ku:    catKu,
      missingAr: totalCategories - catAr,
      missingKu: totalCategories - catKu,
    },
  };
};
