const { validationResult } = require('express-validator');
const svc    = require('./category.service');
const { success, error } = require('../../shared/utils/response.util');

const handleErrors = {
  CATEGORY_NOT_FOUND:          [404, 'Category not found'],
  PARENT_NOT_FOUND:            [404, 'Parent category not found'],
  SLUG_TAKEN:                  [409, 'A category with this slug already exists'],
  CATEGORY_HAS_PRODUCTS:       [409, 'Cannot delete a category that has products assigned'],
  CATEGORY_CANNOT_BE_OWN_PARENT: [400, 'A category cannot be its own parent'],
};

const respond = (res, fn) => async (...args) => {
  try {
    const data = await fn(...args);
    return success(res, data);
  } catch (err) {
    const [status, msg] = handleErrors[err.message] ?? [500, 'Internal server error'];
    return error(res, msg, status);
  }
};

const list = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 400);

  const { tree, parentId, includeInactive } = req.query;

  try {
    if (tree) {
      const data = await svc.getTree({ includeInactive });
      return success(res, data);
    }
    const data = await svc.getFlat({
      parentId: parentId !== undefined ? (parentId ? parseInt(parentId) : null) : undefined,
      includeInactive,
    });
    return success(res, data);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getOne = async (req, res) => {
  try {
    const isSlug = isNaN(parseInt(req.params.id));
    const data   = isSlug
      ? await svc.getBySlug(req.params.id)
      : await svc.getById(req.params.id);
    return success(res, data);
  } catch (err) {
    const [status, msg] = handleErrors[err.message] ?? [500, 'Internal server error'];
    return error(res, msg, status);
  }
};

const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 400);

  try {
    const data = await svc.create(req.body);
    return success(res, data, 201);
  } catch (err) {
    const [status, msg] = handleErrors[err.message] ?? [500, 'Internal server error'];
    return error(res, msg, status);
  }
};

const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 400);

  try {
    const data = await svc.update(req.params.id, req.body);
    return success(res, data);
  } catch (err) {
    const [status, msg] = handleErrors[err.message] ?? [500, 'Internal server error'];
    return error(res, msg, status);
  }
};

const remove = async (req, res) => {
  try {
    await svc.remove(req.params.id);
    return success(res, { message: 'Category deleted' });
  } catch (err) {
    const [status, msg] = handleErrors[err.message] ?? [500, 'Internal server error'];
    return error(res, msg, status);
  }
};

module.exports = { list, getOne, create, update, remove };
