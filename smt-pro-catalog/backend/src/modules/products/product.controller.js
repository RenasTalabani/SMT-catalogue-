const productService     = require('./product.service');
const { success, error } = require('../../shared/utils/response.util');

const ERR_MAP = {
  PRODUCT_NOT_FOUND: { s: 404, m: 'Product not found' },
};
const resolve = (e, res) => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

const getAll = async (req, res) => {
  try {
    const result = await productService.getAll(req.query);
    return success(res, result);
  } catch (e) { return resolve(e, res); }
};

const getById = async (req, res) => {
  try {
    return success(res, await productService.getById(req.params.id));
  } catch (e) { return resolve(e, res); }
};

const create = async (req, res) => {
  try {
    const { name, description, price, quantity, category } = req.body;
    const product = await productService.create(
      { name, description, price, quantity, category },
      req.file?.buffer,
    );
    return success(res, product, 'Product created', 201);
  } catch (e) { return resolve(e, res); }
};

const update = async (req, res) => {
  try {
    const allowed = ['name', 'description', 'price', 'quantity', 'category'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const product = await productService.update(req.params.id, updates, req.file?.buffer);
    return success(res, product, 'Product updated');
  } catch (e) { return resolve(e, res); }
};

const remove = async (req, res) => {
  try {
    await productService.remove(req.params.id);
    return success(res, null, 'Product deleted');
  } catch (e) { return resolve(e, res); }
};

module.exports = { getAll, getById, create, update, remove };
