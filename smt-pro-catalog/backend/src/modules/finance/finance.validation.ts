import { Request, Response, NextFunction } from 'express';
import { error } from '../../shared/utils/response.util';

const EXPENSE_CATEGORIES = ['SUPPLIES','RENT','UTILITIES','SALARIES','MARKETING','MAINTENANCE','OTHER'];
const INCOME_SOURCES     = ['SALES','RETURNS','OTHER'];

export const validateExpense = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as Record<string, string | undefined>;
  const a = parseFloat(body['amount'] ?? '');
  if (isNaN(a) || a <= 0) { error(res, 'Amount must be greater than 0', 400); return; }
  const category = body['category'];
  if (!category || !EXPENSE_CATEGORIES.includes(category)) {
    error(res, `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`, 400);
    return;
  }
  req.body.amount = a;
  if (body['notes']) req.body.notes = String(body['notes']).trim();
  next();
};

export const validateIncome = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as Record<string, string | undefined>;
  const a = parseFloat(body['amount'] ?? '');
  if (isNaN(a) || a <= 0) { error(res, 'Amount must be greater than 0', 400); return; }
  const source = body['source'];
  if (!source || !INCOME_SOURCES.includes(source)) {
    error(res, `Source must be one of: ${INCOME_SOURCES.join(', ')}`, 400);
    return;
  }
  req.body.amount = a;
  if (body['notes']) req.body.notes = String(body['notes']).trim();
  next();
};
