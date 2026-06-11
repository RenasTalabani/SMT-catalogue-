import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as poService from './purchase-order.service';
import type { POStatus } from './purchase-order.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  PO_NOT_FOUND:         { s: 404, m: 'Purchase order not found' },
  SUPPLIER_NOT_FOUND:   { s: 404, m: 'Supplier not found' },
  PRODUCT_NOT_FOUND:    { s: 404, m: 'One or more products not found' },
  PO_ITEMS_REQUIRED:    { s: 400, m: 'At least one item is required' },
  PO_CANCELLED:         { s: 409, m: 'Purchase order is cancelled' },
  PO_ALREADY_RECEIVED:  { s: 409, m: 'Purchase order already fully received' },
  PO_NOT_SENT:          { s: 409, m: 'Purchase order must be sent before receiving goods' },
};

const resolve = (e: Error, res: Response): Response => {
  const msg = e.message;
  if (msg.startsWith('INVALID_TRANSITION:')) return error(res, `Status transition not allowed: ${msg.split(':')[1]}`, 409);
  if (msg.startsWith('EXCEEDS_ORDERED:'))   return error(res, 'Received quantity exceeds ordered quantity', 400);
  if (msg.startsWith('INVALID_QTY:'))       return error(res, 'Received quantity must be greater than zero', 400);
  if (msg.startsWith('ITEM_NOT_FOUND:'))    return error(res, 'One or more items not found in this PO', 404);
  const m = ERR_MAP[msg];
  return error(res, m?.m ?? msg, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await poService.getAll({
      page:       q['page']       ? Number(q['page'])       : 1,
      limit:      q['limit']      ? Number(q['limit'])      : 20,
      status:     q['status'],
      search:     q['search'],
      supplierId: q['supplierId'] ? Number(q['supplierId']) : undefined,
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await poService.getById(Number(req.params['id'])));
  } catch (e) { resolve(e as Error, res); }
};

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await poService.getStats());
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as {
      supplierId: number;
      notes?: string;
      expectedDate?: string;
      items: Array<{ productId: number; orderedQty: number; unitCost: number }>;
    };
    if (!b.supplierId)          { error(res, 'supplierId is required', 400); return; }
    if (!Array.isArray(b.items) || !b.items.length) { error(res, 'items array is required', 400); return; }

    const po = await poService.create(req.user.id, {
      supplierId:   Number(b.supplierId),
      notes:        b.notes,
      expectedDate: b.expectedDate,
      items: b.items.map((i) => ({
        productId:  Number(i.productId),
        orderedQty: Number(i.orderedQty),
        unitCost:   Number(i.unitCost),
      })),
    });
    success(res, po, 'Purchase order created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body as { status: POStatus };
    if (!status) { error(res, 'status is required', 400); return; }
    success(res, await poService.updateStatus(Number(req.params['id']), status), 'Status updated');
  } catch (e) { resolve(e as Error, res); }
};

export const receiveItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { items: Array<{ purchaseOrderItemId: number; receivedQty: number }> };
    if (!Array.isArray(b.items) || !b.items.length) { error(res, 'items array is required', 400); return; }
    success(res, await poService.receiveItems(Number(req.params['id']), req.user.id, b.items), 'Goods received and stock updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await poService.remove(Number(req.params['id']));
    success(res, null, 'Purchase order deleted');
  } catch (e) { resolve(e as Error, res); }
};
