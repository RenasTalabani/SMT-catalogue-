import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 600;

// ── Zone CRUD ─────────────────────────────────────────────────────────────────
export const getAllZones = async (activeOnly = false) => {
  const cacheKey = `delivery:zones:${String(activeOnly)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const zones = await prisma.deliveryZone.findMany({
    where:   activeOnly ? { isActive: true } : {},
    orderBy: { name: 'asc' },
    include: { rates: { where: { isActive: true }, orderBy: { minWeight: 'asc' } } },
  });

  await set(cacheKey, zones, CACHE_TTL);
  return zones;
};

export const getZoneById = async (id: number) => {
  const zone = await prisma.deliveryZone.findUnique({
    where:   { id },
    include: { rates: { orderBy: { minWeight: 'asc' } } },
  });
  if (!zone) throw new Error('ZONE_NOT_FOUND');
  return zone;
};

export const createZone = async (data: {
  name: string; nameAr?: string; nameKu?: string;
  regions: string[]; freeShippingOver?: number; estimatedDays?: string;
}) => {
  if (!data.regions.length) throw new Error('REGIONS_REQUIRED');
  const zone = await prisma.deliveryZone.create({ data: { ...data, regions: data.regions } });
  await invalidate('delivery:');
  return zone;
};

export const updateZone = async (id: number, data: {
  name?: string; nameAr?: string; nameKu?: string;
  regions?: string[]; freeShippingOver?: number | null;
  estimatedDays?: string; isActive?: boolean;
}) => {
  const existing = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!existing) throw new Error('ZONE_NOT_FOUND');
  const zone = await prisma.deliveryZone.update({ where: { id }, data });
  await invalidate('delivery:');
  return zone;
};

export const deleteZone = async (id: number): Promise<void> => {
  const existing = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!existing) throw new Error('ZONE_NOT_FOUND');
  await prisma.deliveryZone.delete({ where: { id } });
  await invalidate('delivery:');
};

// ── Shipping Rate CRUD ────────────────────────────────────────────────────────
export const addRate = async (zoneId: number, data: {
  minWeight?: number; maxWeight?: number; baseCost: number; perKgCost?: number;
}) => {
  const zone = await prisma.deliveryZone.findUnique({ where: { id: zoneId } });
  if (!zone) throw new Error('ZONE_NOT_FOUND');
  if (data.baseCost < 0) throw new Error('INVALID_COST');

  const rate = await prisma.shippingRate.create({ data: { zoneId, minWeight: data.minWeight ?? 0, maxWeight: data.maxWeight ?? null, baseCost: data.baseCost, perKgCost: data.perKgCost ?? 0 } });
  await invalidate('delivery:');
  return rate;
};

export const deleteRate = async (rateId: number): Promise<void> => {
  await prisma.shippingRate.delete({ where: { id: rateId } });
  await invalidate('delivery:');
};

// ── Calculate shipping cost ────────────────────────────────────────────────────
export const calculate = async (
  zoneId:       number,
  orderAmount:  number,
  weightKg = 0,
): Promise<{ fee: number; free: boolean; estimatedDays: string }> => {
  const zone = await prisma.deliveryZone.findUnique({
    where:   { id: zoneId, isActive: true },
    include: { rates: { where: { isActive: true }, orderBy: { minWeight: 'asc' } } },
  });
  if (!zone) throw new Error('ZONE_NOT_FOUND');

  // Free shipping check
  if (zone.freeShippingOver !== null && zone.freeShippingOver !== undefined && orderAmount >= zone.freeShippingOver) {
    return { fee: 0, free: true, estimatedDays: zone.estimatedDays };
  }

  // Find matching rate by weight
  const rate = zone.rates.find((r) => {
    const meetsMin = weightKg >= r.minWeight;
    const meetsMax = r.maxWeight === null || weightKg <= r.maxWeight;
    return meetsMin && meetsMax;
  }) ?? zone.rates[0];

  if (!rate) return { fee: 0, free: false, estimatedDays: zone.estimatedDays };

  const extraWeight = Math.max(0, weightKg - rate.minWeight);
  const fee = parseFloat((rate.baseCost + extraWeight * rate.perKgCost).toFixed(2));

  return { fee, free: false, estimatedDays: zone.estimatedDays };
};

// ── Lookup zone by region string (city/area name) ─────────────────────────────
export const findZoneByRegion = async (regionQuery: string): Promise<number | null> => {
  const zones = await prisma.deliveryZone.findMany({ where: { isActive: true } });
  for (const zone of zones) {
    const regions = (zone.regions as string[]).map((r) => r.toLowerCase());
    if (regions.some((r) => r.includes(regionQuery.toLowerCase()) || regionQuery.toLowerCase().includes(r))) {
      return zone.id;
    }
  }
  return null;
};
