const productService = require('../services/product.service');
const { success, error } = require('../utils/response.util');

const ERROR_MAP = {
  PRODUCT_NOT_FOUND: { status: 404, message: 'Product not found' },
};

const resolveError = (err, res) => {
  const mapped = ERROR_MAP[err.message];
  return error(res, mapped?.message ?? err.message, mapped?.status ?? 500);
};

const getAll = async (req, res) => {
  try {
    const { category, search, page, limit } = req.query;
    const result = await productService.getAll({ category, search, page, limit });
    return success(res, result, 'Products fetched successfully');
  } catch (err) {
    return resolveError(err, res);
  }
};

const getById = async (req, res) => {
  try {
    const product = await productService.getById(req.params.id);
    return success(res, product, 'Product fetched successfully');
  } catch (err) {
    return resolveError(err, res);
  }
};

const create = async (req, res) => {
  try {
    const { name, description, price, quantity, category } = req.body;
    const imageUrl = req.file?.path ?? null;
    const imagePublicId = req.file?.filename ?? null;

    const product = await productService.create({
      name, description, price, quantity, category, imageUrl, imagePublicId,
    });
    return success(res, product, 'Product created successfully', 201);
  } catch (err) {
    return resolveError(err, res);
  }
};

const update = async (req, res) => {
  try {
    const updates = {};
    const allowed = ['name', 'description', 'price', 'quantity', 'category'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.file) {
      updates.imageUrl = req.file.path;
      updates.imagePublicId = req.file.filename;
    }

    const product = await productService.update(
      req.params.id,
      updates,
      req.file?.filename ?? null,
    );
    return success(res, product, 'Product updated successfully');
  } catch (err) {
    return resolveError(err, res);
  }
};

const remove = async (req, res) => {
  try {
    await productService.remove(req.params.id);
    return success(res, null, 'Product deleted successfully');
  } catch (err) {
    return resolveError(err, res);
  }
};

module.exports = { getAll, getById, create, update, remove };
