import crypto from 'crypto';
import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';
import logger from '../../shared/utils/logger.util';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5_000, 30_000, 120_000]; // 5s, 30s, 2min

export const WEBHOOK_EVENTS = [
  'order.created', 'order.completed', 'order.cancelled',
  'product.low_stock', 'product.created', 'product.updated',
  'po.created', 'po.received',
  'return.created', 'return.approved', 'return.processed',
  'backorder.fulfilled',
  'invoice.created',
  'shift.opened', 'shift.closed',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export interface CreateWebhookInput {
  name:    string;
  url:     string;
  secret:  string;
  events:  WebhookEvent[];
  headers?: Record<string, string>;
}

// ── HMAC signature ────────────────────────────────────────────────────────────
function sign(payload: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// ── Deliver to one webhook (with retry) ───────────────────────────────────────
async function deliverOne(
  webhookId: number,
  url:       string,
  secret:    string,
  extraHeaders: Record<string, string>,
  event:     string,
  payload:   Record<string, unknown>,
  attempt = 1,
): Promise<void> {
  const body      = JSON.stringify(payload);
  const signature = sign(body, secret);
  const start     = Date.now();

  let responseCode: number | null = null;
  let responseBody: string | null = null;
  let status: 'SUCCESS' | 'FAILED' = 'FAILED';

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Webhook-Event':  event,
        'X-Webhook-Signature': signature,
        'X-Delivery-Attempt': String(attempt),
        ...extraHeaders,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    responseCode = res.status;
    responseBody = (await res.text()).slice(0, 1000);
    status = res.ok ? 'SUCCESS' : 'FAILED';
  } catch (err) {
    responseBody = (err as Error).message.slice(0, 500);
  }

  const durationMs = Date.now() - start;

  await prisma.webhookDelivery.create({
    data: { webhookId, event, payload: payload as object, status, responseCode, responseBody, durationMs, attempt },
  });

  if (status === 'FAILED' && attempt < MAX_RETRIES) {
    const delay = RETRY_DELAYS[attempt - 1] ?? 120_000;
    setTimeout(() => void deliverOne(webhookId, url, secret, extraHeaders, event, payload, attempt + 1), delay);
  }

  if (status === 'FAILED') {
    logger.warn(`[webhook] delivery failed: webhookId=${webhookId} event=${event} attempt=${attempt} code=${responseCode ?? 'ERR'}`);
  }
}

// ── Fire an event to all subscribed active webhooks ───────────────────────────
export const fire = async (event: WebhookEvent, payload: Record<string, unknown>): Promise<void> => {
  const hooks = await prisma.webhook.findMany({
    where: { isActive: true },
  });

  for (const hook of hooks) {
    const subscribedEvents = hook.events.split(',').map((e) => e.trim());
    if (!subscribedEvents.includes(event)) continue;

    const extraHeaders = (hook.headers ?? {}) as Record<string, string>;
    void deliverOne(hook.id, hook.url, hook.secret, extraHeaders, event, {
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });
  }
};

// ── Admin CRUD ────────────────────────────────────────────────────────────────
export const getAll = async () => {
  const cached = await get<unknown>('webhooks:list');
  if (cached) return cached;

  const hooks = await prisma.webhook.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { deliveries: true } } },
  });

  await set('webhooks:list', hooks, 120);
  return hooks;
};

export const getById = async (id: number) => {
  const hook = await prisma.webhook.findUnique({
    where:   { id },
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take:    20,
      },
    },
  });
  if (!hook) throw new Error('WEBHOOK_NOT_FOUND');
  return hook;
};

export const create = async (data: CreateWebhookInput) => {
  if (!data.url.startsWith('https://') && !data.url.startsWith('http://')) throw new Error('INVALID_URL');
  if (!data.events.length) throw new Error('EVENTS_REQUIRED');

  const hook = await prisma.webhook.create({
    data: {
      name:    data.name,
      url:     data.url,
      secret:  data.secret,
      events:  data.events.join(','),
      headers: data.headers ?? {},
    },
  });
  await invalidate('webhooks:');
  return hook;
};

export const update = async (
  id: number,
  data: Partial<CreateWebhookInput> & { isActive?: boolean },
) => {
  const existing = await prisma.webhook.findUnique({ where: { id } });
  if (!existing) throw new Error('WEBHOOK_NOT_FOUND');

  const hook = await prisma.webhook.update({
    where: { id },
    data:  {
      ...data,
      events:  data.events ? data.events.join(',') : undefined,
      headers: data.headers ?? undefined,
    },
  });
  await invalidate('webhooks:');
  return hook;
};

export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.webhook.findUnique({ where: { id } });
  if (!existing) throw new Error('WEBHOOK_NOT_FOUND');
  await prisma.webhook.delete({ where: { id } });
  await invalidate('webhooks:');
};

// ── Re-send last delivery of a webhook (for testing) ─────────────────────────
export const resend = async (webhookId: number, deliveryId: number) => {
  const hook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!hook) throw new Error('WEBHOOK_NOT_FOUND');

  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: deliveryId, webhookId },
  });
  if (!delivery) throw new Error('DELIVERY_NOT_FOUND');

  void deliverOne(
    webhookId,
    hook.url,
    hook.secret,
    (hook.headers ?? {}) as Record<string, string>,
    delivery.event,
    delivery.payload as Record<string, unknown>,
    1,
  );

  return { queued: true, event: delivery.event };
};

// ── Delivery stats for a webhook ──────────────────────────────────────────────
export const getDeliveryStats = async (webhookId: number) => {
  const hook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!hook) throw new Error('WEBHOOK_NOT_FOUND');

  const [byStatus, last24h] = await Promise.all([
    prisma.webhookDelivery.groupBy({
      by:     ['status'],
      where:  { webhookId },
      _count: { id: true },
    }),
    prisma.webhookDelivery.count({
      where: { webhookId, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    }),
  ]);

  return { webhookId, byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })), last24h };
};
