import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as budgetService from './budget.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  BUDGET_NOT_FOUND: { s: 404, m: 'Budget not found' },
  BUDGET_EXISTS:    { s: 409, m: 'A budget for this category/period already exists' },
  INVALID_AMOUNT:   { s: 400, m: 'Budget amount must be greater than zero' },
  MONTH_REQUIRED:   { s: 400, m: 'month (1-12) is required for MONTHLY budgets' },
  QUARTER_REQUIRED: { s: 400, m: 'quarter (1-4) is required for QUARTERLY budgets' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now   = new Date();
    const q     = req.query as Record<string, string>;
    const year  = q['year']  ? Number(q['year'])  : now.getFullYear();
    const month = q['month'] ? Number(q['month']) : now.getMonth() + 1;
    success(res, await budgetService.getDashboard(year, month));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await budgetService.getById(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof budgetService.create>[0];
    if (!b.category?.trim())  { error(res, 'category is required', 400); return; }
    if (!b.amount)            { error(res, 'amount is required', 400); return; }
    if (!b.period)            { error(res, 'period is required', 400); return; }
    if (!b.year)              { error(res, 'year is required', 400); return; }
    success(res, await budgetService.create(b), 'Budget created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await budgetService.update(Number(req.params['id']), req.body as Parameters<typeof budgetService.update>[1]), 'Budget updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await budgetService.remove(Number(req.params['id']));
    success(res, null, 'Budget deleted');
  } catch (e) { resolve(e as Error, res); }
};
