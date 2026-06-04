import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 300;

// ── Submit / update a review ───────────────────────────────────────────────────
export const upsertReview = async (
  userId:    number,
  productId: number,
  data: { rating: number; title?: string; body?: string },
) => {
  if (data.rating < 1 || data.rating > 5) throw new Error('INVALID_RATING');

  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true, deletedAt: null } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  // Auto-verify if user has purchased this product
  const purchased = await prisma.orderItem.findFirst({
    where: { productId, order: { userId, status: 'COMPLETED' } },
  });

  const review = await prisma.productReview.upsert({
    where:  { productId_userId: { productId, userId } },
    create: {
      productId, userId,
      rating:     data.rating,
      title:      data.title ?? null,
      body:       data.body  ?? null,
      isVerified: !!purchased,
      isApproved: false,  // requires moderation
    },
    update: {
      rating:    data.rating,
      title:     data.title ?? null,
      body:      data.body  ?? null,
      isApproved: false,  // reset approval on edit
      updatedAt: new Date(),
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await invalidate(`reviews:product:${productId}`);
  return review;
};

// ── Get reviews for a product (public — approved only) ────────────────────────
export const getProductReviews = async (productId: number, page = 1, limit = 10) => {
  const cacheKey = `reviews:product:${productId}:${page}:${limit}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const skip = (page - 1) * limit;

  const [reviews, total, stats] = await Promise.all([
    prisma.productReview.findMany({
      where:   { productId, isApproved: true },
      orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
      skip, take: limit,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.productReview.count({ where: { productId, isApproved: true } }),
    prisma.productReview.aggregate({
      where: { productId, isApproved: true },
      _avg:  { rating: true },
      _count: { rating: true },
    }),
  ]);

  // Distribution 1–5
  const distribution = await prisma.productReview.groupBy({
    by:    ['rating'],
    where: { productId, isApproved: true },
    _count: { rating: true },
  });

  const result = {
    reviews,
    total,
    page,
    limit,
    averageRating: parseFloat((stats._avg.rating ?? 0).toFixed(1)),
    totalRatings:  stats._count.rating,
    distribution:  [1, 2, 3, 4, 5].map((r) => ({
      rating: r,
      count:  distribution.find((d) => d.rating === r)?._count.rating ?? 0,
    })),
  };

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Mark a review as helpful ───────────────────────────────────────────────────
export const markHelpful = async (reviewId: number): Promise<void> => {
  await prisma.productReview.update({
    where: { id: reviewId },
    data:  { helpfulCount: { increment: 1 } },
  });
};

// ── Report a review ────────────────────────────────────────────────────────────
export const reportReview = async (reviewId: number): Promise<void> => {
  await prisma.productReview.update({
    where: { id: reviewId },
    data:  { reportCount: { increment: 1 } },
  });
};

// ── Admin: get all pending reviews ────────────────────────────────────────────
export const getPending = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where:   { isApproved: false },
      orderBy: { createdAt: 'asc' },
      skip, take: limit,
      include: {
        user:    { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.productReview.count({ where: { isApproved: false } }),
  ]);
  return { reviews, total, page, limit };
};

// ── Admin: approve or reject ───────────────────────────────────────────────────
export const moderate = async (reviewId: number, approved: boolean) => {
  const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error('REVIEW_NOT_FOUND');

  if (!approved) {
    await prisma.productReview.delete({ where: { id: reviewId } });
    await invalidate(`reviews:product:${review.productId}`);
    return null;
  }

  const updated = await prisma.productReview.update({
    where: { id: reviewId },
    data:  { isApproved: true },
    include: { user: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } },
  });
  await invalidate(`reviews:product:${review.productId}`);
  return updated;
};

// ── Admin: delete a review ─────────────────────────────────────────────────────
export const remove = async (reviewId: number): Promise<void> => {
  const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error('REVIEW_NOT_FOUND');
  await prisma.productReview.delete({ where: { id: reviewId } });
  await invalidate(`reviews:product:${review.productId}`);
};

// ── Top rated products ─────────────────────────────────────────────────────────
export const getTopRated = async (limit = 10, minReviews = 3) => {
  const cacheKey = `reviews:top-rated:${limit}:${minReviews}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const aggregated = await prisma.productReview.groupBy({
    by:     ['productId'],
    where:  { isApproved: true },
    _avg:   { rating: true },
    _count: { rating: true },
    having: { rating: { _count: { gte: minReviews } } },
    orderBy: { _avg: { rating: 'desc' } },
    take:   limit,
  });

  const products = await prisma.product.findMany({
    where:  { id: { in: aggregated.map((a) => a.productId) }, isActive: true, deletedAt: null },
    select: { id: true, name: true, price: true, imageUrl: true, category: true, sku: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const result = aggregated
    .map((a) => ({
      product:       productMap.get(a.productId),
      averageRating: parseFloat((a._avg.rating ?? 0).toFixed(1)),
      reviewCount:   a._count.rating,
    }))
    .filter((r) => r.product);

  await set(cacheKey, result, CACHE_TTL);
  return result;
};
