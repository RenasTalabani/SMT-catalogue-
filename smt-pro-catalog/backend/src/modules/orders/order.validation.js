const { error } = require('../../shared/utils/response.util');

const validateOrder = (req, res, next) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return error(res, 'Order must contain at least one item', 400);

  for (const item of items) {
    const productId = parseInt(item.productId, 10);
    const quantity  = parseInt(item.quantity,  10);
    if (isNaN(productId) || productId < 1)
      return error(res, 'Each item must have a valid productId', 400);
    if (isNaN(quantity) || quantity < 1)
      return error(res, 'Each item quantity must be at least 1', 400);
    item.productId = productId;
    item.quantity  = quantity;
  }
  next();
};

const validateStatusUpdate = (req, res, next) => {
  const VALID = ['PENDING', 'COMPLETED', 'CANCELLED'];
  const { status } = req.body;
  if (!status || !VALID.includes(status))
    return error(res, `Status must be one of: ${VALID.join(', ')}`, 400);
  next();
};

module.exports = { validateOrder, validateStatusUpdate };
