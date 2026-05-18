const { error } = require('../utils/response.util');

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const validateDailyReport = (req, res, next) => {
  const { date } = req.query;

  if (!date) return error(res, 'Query param "date" is required (YYYY-MM-DD)', 400);
  if (!DATE_REGEX.test(date)) return error(res, 'Invalid date format. Use YYYY-MM-DD', 400);

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return error(res, 'Invalid date value', 400);

  next();
};

const validateMonthlyReport = (req, res, next) => {
  const { year, month } = req.query;

  if (!year || !month) return error(res, 'Query params "year" and "month" are required', 400);

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);

  if (isNaN(y) || y < 2000 || y > 2100) {
    return error(res, 'year must be a valid integer between 2000 and 2100', 400);
  }
  if (isNaN(m) || m < 1 || m > 12) {
    return error(res, 'month must be an integer between 1 and 12', 400);
  }

  req.query.year = y;
  req.query.month = m;

  next();
};

const validateLowStock = (req, res, next) => {
  const raw = req.query.threshold;

  if (raw !== undefined) {
    const t = parseInt(raw, 10);
    if (isNaN(t) || t < 1) {
      return error(res, 'threshold must be a positive integer', 400);
    }
    req.query.threshold = t;
  } else {
    req.query.threshold = 5;
  }

  next();
};

module.exports = { validateDailyReport, validateMonthlyReport, validateLowStock };
