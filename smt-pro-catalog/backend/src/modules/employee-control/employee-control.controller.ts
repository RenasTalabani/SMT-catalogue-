import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as empService from './employee-control.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  EMPLOYEE_NOT_FOUND:         { s: 404, m: 'Employee not found' },
  EMAIL_TAKEN:                { s: 409, m: 'Email is already in use' },
  PASSWORD_TOO_SHORT:         { s: 400, m: 'Password must be at least 6 characters' },
  INVALID_ROLE:               { s: 400, m: 'Role must be super_admin, admin or employee' },
  CANNOT_DELETE_SUPER_ADMIN:  { s: 403, m: 'Super admin accounts cannot be deleted' },
  EMPLOYEE_HAS_ORDERS:        { s: 409, m: 'Cannot delete employee with existing orders' },
  INVALID_PERCENTAGE:         { s: 400, m: 'Discount percentage must be greater than 0' },
  DISCOUNT_REQUEST_NOT_FOUND: { s: 404, m: 'Discount request not found' },
  REQUEST_ALREADY_REVIEWED:   { s: 409, m: 'This discount request has already been reviewed' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await empService.getAll({
      page:     q['page']     ? Number(q['page'])         : 1,
      limit:    q['limit']    ? Number(q['limit'])        : 20,
      role:     q['role'],
      isActive: q['isActive'] !== undefined ? q['isActive'] === 'true' : undefined,
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await empService.getDetail(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await empService.getPerformanceSummary(
      q['from'] ? new Date(q['from']) : undefined,
      q['to']   ? new Date(q['to'])   : undefined,
    ));
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { name: string; email: string; password: string; role?: string };
    if (!b.name?.trim() || !b.email?.trim() || !b.password) { error(res, 'name, email and password are required', 400); return; }
    success(res, await empService.create(b), 'Employee created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const setActive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { isActive: boolean };
    if (b.isActive === undefined) { error(res, 'isActive is required', 400); return; }
    success(res, await empService.setActive(Number(req.params['id']), Boolean(b.isActive)), b.isActive ? 'Employee activated' : 'Employee deactivated');
  } catch (e) { resolve(e as Error, res); }
};

export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { password: string };
    if (!b.password) { error(res, 'password is required', 400); return; }
    await empService.resetPassword(Number(req.params['id']), b.password);
    success(res, null, 'Password reset successfully');
  } catch (e) { resolve(e as Error, res); }
};

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { role: string };
    if (!b.role) { error(res, 'role is required', 400); return; }
    success(res, await empService.updateRole(Number(req.params['id']), b.role), 'Role updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await empService.remove(Number(req.params['id']));
    success(res, null, 'Employee deleted');
  } catch (e) { resolve(e as Error, res); }
};

export const requestDiscount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { percentage: number; reason: string; orderId?: number };
    if (!b.percentage || !b.reason?.trim()) { error(res, 'percentage and reason are required', 400); return; }
    success(res, await empService.requestDiscount(req.user.id, Number(b.percentage), b.reason, b.orderId ? Number(b.orderId) : undefined), 'Discount request submitted');
  } catch (e) { resolve(e as Error, res); }
};

export const reviewDiscount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { approved: boolean; reviewNote?: string };
    if (b.approved === undefined) { error(res, 'approved is required', 400); return; }
    success(res, await empService.reviewDiscount(Number(req.params['id']), req.user.id, Boolean(b.approved), b.reviewNote), b.approved ? 'Discount approved' : 'Discount rejected');
  } catch (e) { resolve(e as Error, res); }
};

export const getPendingDiscounts = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await empService.getPendingDiscounts()); }
  catch (e) { resolve(e as Error, res); }
};
