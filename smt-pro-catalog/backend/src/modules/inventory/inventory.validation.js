const { error } = require('../../shared/utils/response.util');

const VALID_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'];

const validateStockMovement = (req, res, next) => {
  const { productId, type, quantity, notes } = req.body;

  const pid = parseInt(productId, 10);
  if (isNaN(pid) || pid < 1)
    return error(res, 'Valid productId is required', 400);

  if (!type || !VALID_TYPES.includes(type))
    return error(res, `Type must be one of: ${VALID_TYPES.join(', ')}`, 400);

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1)
    return error(res, 'Quantity must be at least 1', 400);

  req.body.productId = pid;
  req.body.quantity  = qty;
  if (notes) req.body.notes = String(notes).trim();
  next();
};

const validateSupplier = (req, res, next) => {
  const { name, phone, email, address } = req.body;
  if (!name || String(name).trim().length < 2)
    return error(res, 'Supplier name must be at least 2 characters', 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return error(res, 'Invalid email format', 400);
  req.body.name = String(name).trim();
  if (phone)   req.body.phone   = String(phone).trim();
  if (email)   req.body.email   = String(email).trim().toLowerCase();
  if (address) req.body.address = String(address).trim();
  next();
};

module.exports = { validateStockMovement, validateSupplier };
