const { error } = require('../../shared/utils/response.util');

const EXPENSE_CATEGORIES = ['SUPPLIES','RENT','UTILITIES','SALARIES','MARKETING','MAINTENANCE','OTHER'];
const INCOME_SOURCES     = ['SALES','RETURNS','OTHER'];

const validateExpense = (req, res, next) => {
  const { amount, category, notes } = req.body;
  const a = parseFloat(amount);
  if (isNaN(a) || a <= 0)                           return error(res, 'Amount must be greater than 0', 400);
  if (!category || !EXPENSE_CATEGORIES.includes(category))
    return error(res, `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`, 400);
  req.body.amount = a;
  if (notes) req.body.notes = String(notes).trim();
  next();
};

const validateIncome = (req, res, next) => {
  const { amount, source, notes } = req.body;
  const a = parseFloat(amount);
  if (isNaN(a) || a <= 0)                           return error(res, 'Amount must be greater than 0', 400);
  if (!source || !INCOME_SOURCES.includes(source))
    return error(res, `Source must be one of: ${INCOME_SOURCES.join(', ')}`, 400);
  req.body.amount = a;
  if (notes) req.body.notes = String(notes).trim();
  next();
};

module.exports = { validateExpense, validateIncome };
