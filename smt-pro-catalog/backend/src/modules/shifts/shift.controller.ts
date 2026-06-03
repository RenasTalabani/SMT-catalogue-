import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as shiftService from './shift.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  REGISTER_NOT_FOUND:    { s: 404, m: 'Register not found' },
  REGISTER_INACTIVE:     { s: 409, m: 'Register is not active' },
  REGISTER_ALREADY_OPEN: { s: 409, m: 'This register already has an open shift' },
  SHIFT_NOT_FOUND:       { s: 404, m: 'Shift not found' },
  SHIFT_NOT_OPEN:        { s: 409, m: 'Shift is not open' },
  SHIFT_UNAUTHORIZED:    { s: 403, m: 'Only the employee who opened this shift can close it' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

// ── Registers ──────────────────────────────────────────────────────────────────
export const getRegisters = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await shiftService.getRegisters()); }
  catch (e) { resolve(e as Error, res); }
};

export const createRegister = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { name: string; location?: string };
    if (!b.name?.trim()) { error(res, 'name is required', 400); return; }
    success(res, await shiftService.createRegister(b), 'Register created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const updateRegister = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await shiftService.updateRegister(Number(req.params['id']), req.body as { name?: string; location?: string; isActive?: boolean }), 'Register updated');
  } catch (e) { resolve(e as Error, res); }
};

// ── Shifts ─────────────────────────────────────────────────────────────────────
export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await shiftService.getAll({
      page:       q['page']       ? Number(q['page'])       : 1,
      limit:      q['limit']      ? Number(q['limit'])      : 20,
      registerId: q['registerId'] ? Number(q['registerId']) : undefined,
      employeeId: q['employeeId'] ? Number(q['employeeId']) : undefined,
      status:     q['status'],
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await shiftService.getById(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await shiftService.getStats()); }
  catch (e) { resolve(e as Error, res); }
};

export const getCurrentShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shift = await shiftService.getCurrentShift(Number(req.params['registerId']));
    success(res, shift);
  } catch (e) { resolve(e as Error, res); }
};

export const openShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { registerId: number; openingFloat?: number; notes?: string };
    if (!b.registerId) { error(res, 'registerId is required', 400); return; }
    success(res, await shiftService.openShift(req.user.id, {
      registerId:   Number(b.registerId),
      openingFloat: b.openingFloat ? Number(b.openingFloat) : 0,
      notes:        b.notes,
    }), 'Shift opened', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const closeShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { closingFloat: number; notes?: string };
    if (b.closingFloat === undefined) { error(res, 'closingFloat is required', 400); return; }
    success(res, await shiftService.closeShift(Number(req.params['id']), req.user.id, {
      closingFloat: Number(b.closingFloat),
      notes:        b.notes,
    }), 'Shift closed');
  } catch (e) { resolve(e as Error, res); }
};

export const addOrderToShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { orderId: number; orderAmount: number };
    if (!b.orderId || b.orderAmount === undefined) { error(res, 'orderId and orderAmount required', 400); return; }
    await shiftService.addOrderToShift(Number(req.params['id']), Number(b.orderId), Number(b.orderAmount));
    success(res, null, 'Order added to shift');
  } catch (e) { resolve(e as Error, res); }
};
