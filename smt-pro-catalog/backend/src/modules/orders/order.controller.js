const orderService       = require('./order.service');
const { success, error } = require('../../shared/utils/response.util');

const ERR_MAP = {
  ORDER_NOT_FOUND:     { s: 404, m: 'Order not found' },
  ORDER_FORBIDDEN:     { s: 403, m: 'Access denied' },
  ORDER_NOT_MODIFIABLE:{ s: 409, m: 'Completed or cancelled orders cannot be modified' },
};

const resolve = (e, res) => {
  const key = e.message.split(':')[0];
  const m   = ERR_MAP[key];
  if (!m && e.message.startsWith('PRODUCT_NOT_FOUND:'))
    return error(res, `Product ${e.message.split(':')[1]} not found`, 404);
  if (!m && e.message.startsWith('INSUFFICIENT_STOCK:'))
    return error(res, `Insufficient stock for: ${e.message.split(':')[1]}`, 409);
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

const getAll = async (req, res) => {
  try {
    const result = await orderService.getAll(req.query);
    return success(res, result);
  } catch (e) { return resolve(e, res); }
};

const getMyOrders = async (req, res) => {
  try {
    const result = await orderService.getMyOrders(req.user.id, req.query);
    return success(res, result);
  } catch (e) { return resolve(e, res); }
};

const getById = async (req, res) => {
  try {
    return success(res, await orderService.getById(req.params.id, req.user));
  } catch (e) { return resolve(e, res); }
};

const create = async (req, res) => {
  try {
    const order = await orderService.create(req.user.id, req.body.items);
    return success(res, order, 'Order created', 201);
  } catch (e) { return resolve(e, res); }
};

const updateStatus = async (req, res) => {
  try {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    return success(res, order, 'Order status updated');
  } catch (e) { return resolve(e, res); }
};

module.exports = { getAll, getMyOrders, getById, create, updateStatus };
