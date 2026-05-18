const inventoryService   = require('./inventory.service');
const { success, error } = require('../../shared/utils/response.util');

const ERR_MAP = {
  PRODUCT_NOT_FOUND:    { s: 404, m: 'Product not found' },
  INSUFFICIENT_STOCK:   { s: 409, m: 'Insufficient stock for this operation' },
  SUPPLIER_NOT_FOUND:   { s: 404, m: 'Supplier not found' },
  SUPPLIER_EMAIL_EXISTS:{ s: 409, m: 'A supplier with this email already exists' },
};

const resolve = (e, res) => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

// Stock movements
const getMovements = async (req, res) => {
  try { return success(res, await inventoryService.getMovements(req.query)); }
  catch (e) { return resolve(e, res); }
};

const recordMovement = async (req, res) => {
  try {
    const movement = await inventoryService.recordMovement(req.user.id, req.body);
    return success(res, movement, 'Stock movement recorded', 201);
  } catch (e) { return resolve(e, res); }
};

// Inventory value
const getInventoryValue = async (req, res) => {
  try { return success(res, await inventoryService.getInventoryValue()); }
  catch (e) { return resolve(e, res); }
};

// Suppliers
const getSuppliers = async (req, res) => {
  try { return success(res, await inventoryService.getSuppliers(req.query)); }
  catch (e) { return resolve(e, res); }
};

const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    const supplier = await inventoryService.createSupplier({ name, phone, email, address });
    return success(res, supplier, 'Supplier created', 201);
  } catch (e) { return resolve(e, res); }
};

const updateSupplier = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    const data = {};
    if (name    !== undefined) data.name    = name;
    if (phone   !== undefined) data.phone   = phone;
    if (email   !== undefined) data.email   = email;
    if (address !== undefined) data.address = address;
    return success(res, await inventoryService.updateSupplier(req.params.id, data), 'Supplier updated');
  } catch (e) { return resolve(e, res); }
};

const deleteSupplier = async (req, res) => {
  try {
    await inventoryService.deleteSupplier(req.params.id);
    return success(res, null, 'Supplier deleted');
  } catch (e) { return resolve(e, res); }
};

module.exports = {
  getMovements, recordMovement, getInventoryValue,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
};
