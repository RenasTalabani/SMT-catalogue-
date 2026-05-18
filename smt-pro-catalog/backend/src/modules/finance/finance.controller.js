const financeService     = require('./finance.service');
const { success, error } = require('../../shared/utils/response.util');

const ERR_MAP = {
  EXPENSE_NOT_FOUND: { s: 404, m: 'Expense not found' },
  INCOME_NOT_FOUND:  { s: 404, m: 'Income record not found' },
};

const resolve = (e, res) => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

// Expenses
const getExpenses = async (req, res) => {
  try { return success(res, await financeService.getExpenses(req.query)); }
  catch (e) { return resolve(e, res); }
};

const createExpense = async (req, res) => {
  try {
    const { amount, category, notes } = req.body;
    const expense = await financeService.createExpense(req.user.id, { amount, category, notes });
    return success(res, expense, 'Expense recorded', 201);
  } catch (e) { return resolve(e, res); }
};

const deleteExpense = async (req, res) => {
  try {
    await financeService.deleteExpense(req.params.id);
    return success(res, null, 'Expense deleted');
  } catch (e) { return resolve(e, res); }
};

// Incomes
const getIncomes = async (req, res) => {
  try { return success(res, await financeService.getIncomes(req.query)); }
  catch (e) { return resolve(e, res); }
};

const createIncome = async (req, res) => {
  try {
    const { amount, source, notes } = req.body;
    const income = await financeService.createIncome(req.user.id, { amount, source, notes });
    return success(res, income, 'Income recorded', 201);
  } catch (e) { return resolve(e, res); }
};

const deleteIncome = async (req, res) => {
  try {
    await financeService.deleteIncome(req.params.id);
    return success(res, null, 'Income record deleted');
  } catch (e) { return resolve(e, res); }
};

// P&L
const getProfitLoss = async (req, res) => {
  try { return success(res, await financeService.getProfitLoss(req.query)); }
  catch (e) { return resolve(e, res); }
};

module.exports = {
  getExpenses, createExpense, deleteExpense,
  getIncomes, createIncome, deleteIncome,
  getProfitLoss,
};
