const orderService = require('../services/order.service');
const { success, error } = require('../utils/response.util');

const resolveError = (err, res) => {
  const msg = err.message;

  if (msg.startsWith('PRODUCT_NOT_FOUND:')) {
    return error(res, `Product with id ${msg.split(':')[1]} not found`, 404);
  }
  if (msg.startsWith('INSUFFICIENT_STOCK:')) {
    const [, name, available] = msg.split(':');
    return error(res, `Insufficient stock for "${name}" — available: ${available}`, 409);
  }

  const MAP = {
    ORDER_NOT_FOUND:      { status: 404, message: 'Order not found' },
    ORDER_FORBIDDEN:      { status: 403, message: 'You do not have access to this order' },
    STATUS_UNCHANGED:     { status: 400, message: 'Order already has that status' },
    ORDER_ALREADY_CLOSED: { status: 400, message: 'Cannot change status of a completed or cancelled order' },
  };

  const mapped = MAP[msg];
  return error(res, mapped?.message ?? 'Order operation failed', mapped?.status ?? 500);
};

const createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.user.id, req.body.items);
    return success(res, order, 'Order placed successfully', 201);
  } catch (err) {
    return resolveError(err, res);
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await orderService.getMyOrders(req.user.id);
    return success(res, orders, 'Orders fetched successfully');
  } catch (err) {
    return resolveError(err, res);
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await orderService.getAllOrders({ status, page, limit });
    return success(res, result, 'All orders fetched successfully');
  } catch (err) {
    return resolveError(err, res);
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);
    return success(res, order, 'Order fetched successfully');
  } catch (err) {
    return resolveError(err, res);
  }
};

const updateStatus = async (req, res) => {
  try {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    return success(res, order, 'Order status updated');
  } catch (err) {
    return resolveError(err, res);
  }
};

module.exports = { createOrder, getMyOrders, getAllOrders, getOrderById, updateStatus };
