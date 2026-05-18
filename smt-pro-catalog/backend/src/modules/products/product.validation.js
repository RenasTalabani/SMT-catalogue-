const { error } = require('../../shared/utils/response.util');

const validateProduct = (req, res, next) => {
  const { name, price, quantity, category } = req.body;
  if (!name || name.trim().length < 2)             return error(res, 'Product name must be at least 2 characters', 400);
  const p = parseFloat(price);
  if (isNaN(p) || p <= 0)                          return error(res, 'Price must be greater than 0', 400);
  const q = parseInt(quantity, 10);
  if (isNaN(q) || q < 0)                           return error(res, 'Quantity must be a non-negative integer', 400);
  if (!category || !category.trim())               return error(res, 'Category is required', 400);
  req.body.name     = name.trim();
  req.body.category = category.trim();
  req.body.price    = p;
  req.body.quantity = q;
  next();
};

const validateProductUpdate = (req, res, next) => {
  const { name, price, quantity, category } = req.body;
  if (name     !== undefined) { if (name.trim().length < 2) return error(res, 'Name must be at least 2 characters', 400); req.body.name = name.trim(); }
  if (price    !== undefined) { const p = parseFloat(price); if (isNaN(p) || p <= 0) return error(res, 'Price must be > 0', 400); req.body.price = p; }
  if (quantity !== undefined) { const q = parseInt(quantity, 10); if (isNaN(q) || q < 0) return error(res, 'Quantity must be >= 0', 400); req.body.quantity = q; }
  if (category !== undefined) { if (!category.trim()) return error(res, 'Category cannot be empty', 400); req.body.category = category.trim(); }
  next();
};

module.exports = { validateProduct, validateProductUpdate };
