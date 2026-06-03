import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as webhookService from './webhook.service';
import { WEBHOOK_EVENTS } from './webhook.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  WEBHOOK_NOT_FOUND:  { s: 404, m: 'Webhook not found' },
  DELIVERY_NOT_FOUND: { s: 404, m: 'Delivery not found' },
  INVALID_URL:        { s: 400, m: 'URL must start with http:// or https://' },
  EVENTS_REQUIRED:    { s: 400, m: 'At least one event must be selected' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getEvents = (_req: AuthRequest, res: Response): void => {
  success(res, { events: WEBHOOK_EVENTS });
};

export const getAll = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await webhookService.getAll()); }
  catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await webhookService.getById(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getDeliveryStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await webhookService.getDeliveryStats(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof webhookService.create>[0];
    if (!b.name?.trim()) { error(res, 'name is required', 400); return; }
    if (!b.url?.trim())  { error(res, 'url is required', 400); return; }
    if (!b.secret?.trim()) { error(res, 'secret is required', 400); return; }
    if (!Array.isArray(b.events) || !b.events.length) { error(res, 'events array is required', 400); return; }
    success(res, await webhookService.create(b), 'Webhook created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await webhookService.update(Number(req.params['id']), req.body as Parameters<typeof webhookService.update>[1]), 'Webhook updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await webhookService.remove(Number(req.params['id']));
    success(res, null, 'Webhook deleted');
  } catch (e) { resolve(e as Error, res); }
};

export const resend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deliveryId } = req.body as { deliveryId: number };
    if (!deliveryId) { error(res, 'deliveryId is required', 400); return; }
    success(res, await webhookService.resend(Number(req.params['id']), Number(deliveryId)), 'Delivery re-queued');
  } catch (e) { resolve(e as Error, res); }
};
