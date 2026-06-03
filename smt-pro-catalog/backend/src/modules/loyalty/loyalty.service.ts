import prisma from '../../config/prisma';

// ── Configuration ─────────────────────────────────────────────────────────────
const POINTS_PER_DOLLAR = 1;          // 1 point earned per $1 spent
const POINTS_TO_DOLLAR  = 100;        // 100 points = $1 discount

const TIERS = [
  { name: 'PLATINUM', min: 5000 },
  { name: 'GOLD',     min: 2000 },
  { name: 'SILVER',   min: 500  },
  { name: 'BRONZE',   min: 0    },
] as const;

const TIER_MULTIPLIERS: Record<string, number> = {
  BRONZE:   1.0,
  SILVER:   1.25,
  GOLD:     1.5,
  PLATINUM: 2.0,
};

function calcTier(lifetimePoints: number): string {
  return TIERS.find((t) => lifetimePoints >= t.min)?.name ?? 'BRONZE';
}

// ── Get or create account ─────────────────────────────────────────────────────
export const getOrCreate = async (customerId: number) => {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

  const existing = await prisma.loyaltyAccount.findUnique({ where: { customerId } });
  if (existing) return existing;

  return prisma.loyaltyAccount.create({ data: { customerId } });
};

// ── Get account + tier info ───────────────────────────────────────────────────
export const getAccount = async (customerId: number) => {
  const account = await getOrCreate(customerId);
  const tier = calcTier(account.lifetimePoints);
  const nextTier = TIERS.slice().reverse().find((t) => t.min > account.lifetimePoints);

  return {
    ...account,
    tier,
    multiplier:      TIER_MULTIPLIERS[tier],
    pointsValue:     parseFloat((account.points / POINTS_TO_DOLLAR).toFixed(2)),
    nextTier:        nextTier?.name ?? null,
    pointsToNextTier: nextTier ? nextTier.min - account.lifetimePoints : 0,
  };
};

// ── Earn points after order completion ────────────────────────────────────────
export const earnPoints = async (customerId: number, orderId: number, orderAmount: number) => {
  const account = await getOrCreate(customerId);
  const tier     = calcTier(account.lifetimePoints);
  const multi    = TIER_MULTIPLIERS[tier] ?? 1;
  const earned   = Math.floor(orderAmount * POINTS_PER_DOLLAR * multi);
  if (earned <= 0) return null;

  const [updated] = await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points:         { increment: earned },
        lifetimePoints: { increment: earned },
        tier:           calcTier(account.lifetimePoints + earned),
      },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type:      'EARN',
        points:    earned,
        balance:   account.points + earned,
        orderId,
        reference: `ORDER-${orderId}`,
        notes:     `Earned from order #${orderId} ($${orderAmount.toFixed(2)} × ${multi}×)`,
      },
    }),
  ]);

  return updated;
};

// ── Redeem points as discount ──────────────────────────────────────────────────
export const redeemPoints = async (
  customerId: number,
  pointsToRedeem: number,
  orderId?: number,
): Promise<{ discountAmount: number; newBalance: number }> => {
  if (pointsToRedeem <= 0) throw new Error('INVALID_POINTS');

  const account = await getOrCreate(customerId);
  if (account.points < pointsToRedeem) throw new Error('INSUFFICIENT_POINTS');

  const discountAmount = parseFloat((pointsToRedeem / POINTS_TO_DOLLAR).toFixed(2));
  const newBalance     = account.points - pointsToRedeem;

  await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data:  { points: newBalance },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type:      'REDEEM',
        points:    -pointsToRedeem,
        balance:   newBalance,
        orderId:   orderId ?? null,
        reference: orderId ? `ORDER-${orderId}` : undefined,
        notes:     `Redeemed ${pointsToRedeem} pts → $${discountAmount} discount`,
      },
    }),
  ]);

  return { discountAmount, newBalance };
};

// ── Admin manual adjustment ────────────────────────────────────────────────────
export const adjustPoints = async (
  customerId: number,
  delta: number,
  notes: string,
) => {
  const account = await getOrCreate(customerId);
  const newBalance = account.points + delta;
  if (newBalance < 0) throw new Error('NEGATIVE_BALANCE');

  const [updated] = await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points:         newBalance,
        lifetimePoints: delta > 0 ? { increment: delta } : account.lifetimePoints,
        tier:           calcTier(delta > 0 ? account.lifetimePoints + delta : account.lifetimePoints),
      },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type:      'ADJUST',
        points:    delta,
        balance:   newBalance,
        notes,
      },
    }),
  ]);
  return updated;
};

// ── Transaction history ───────────────────────────────────────────────────────
export const getHistory = async (customerId: number, page = 1, limit = 20) => {
  const account = await prisma.loyaltyAccount.findUnique({ where: { customerId } });
  if (!account) return { transactions: [], total: 0, page, limit };

  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where:   { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.loyaltyTransaction.count({ where: { accountId: account.id } }),
  ]);

  return { transactions, total, page, limit };
};

// ── Overall stats ─────────────────────────────────────────────────────────────
export const getStats = async () => {
  const [byTier, totalPointsIssued, totalRedeemed, totalAccounts] = await Promise.all([
    prisma.loyaltyAccount.groupBy({ by: ['tier'], _count: { id: true }, _sum: { points: true } }),
    prisma.loyaltyTransaction.aggregate({ where: { type: 'EARN' },   _sum: { points: true } }),
    prisma.loyaltyTransaction.aggregate({ where: { type: 'REDEEM' }, _sum: { points: true } }),
    prisma.loyaltyAccount.count(),
  ]);

  return {
    totalAccounts,
    byTier:            byTier.map((t) => ({ tier: t.tier, count: t._count.id, points: t._sum.points ?? 0 })),
    totalPointsIssued: totalPointsIssued._sum.points ?? 0,
    totalPointsRedeemed: Math.abs(totalRedeemed._sum.points ?? 0),
    config: { pointsPerDollar: POINTS_PER_DOLLAR, pointsToDollar: POINTS_TO_DOLLAR, tiers: TIERS, multipliers: TIER_MULTIPLIERS },
  };
};
