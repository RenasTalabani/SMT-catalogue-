const { error } = require('../utils/response.util');

const VALID_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED'];

const validateCreateOrder = (req, res, next) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return error(res, 'Order must contain at least one item', 400);
  }

  const seenIds = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const productId = parseInt(item.productId, 10);
    if (!item.productId || isNaN(productId) || productId < 1) {
      return error(res, `Item [${i}]: productId must be a valid positive integer`, 400);
    }

    const quantity = parseInt(item.quantity, 10);
    if (!item.quantity || isNaN(quantity) || quantity < 1) {
      return error(res, `Item [${i}]: quantity must be a positive integer`, 400);
    }

    if (seenIds.has(productId)) {
      return error(res, `Duplicate productId ${productId} — combine quantities into one item`, 400);
    }

    seenIds.add(productId);
    items[i] = { productId, quantity };
  }

  next();
};

const validateStatusUpdate = (req, res, next) => {
  const { status } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return error(
      res,
      `status must be one of: ${VALID_STATUSES.join(', ')}`,
      400,
    );
  }

  next();
};

module.exports = { validateCreateOrder, validateStatusUpdate };
