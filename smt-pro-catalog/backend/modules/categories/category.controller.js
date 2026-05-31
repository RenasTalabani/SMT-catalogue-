const { body } = require('express-validator');
const categoryService = require('./category.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const validate = require('../../middlewares/validate');

const categoryValidation = [
  body('name.en').notEmpty().trim().withMessage('Category name (English) is required'),
  body('parent').optional({ nullable: true }).isMongoId().withMessage('Invalid parent ID'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  validate,
];

const getCategories = async (req, res, next) => {
  try {
    const { tree, parent, all } = req.query;
    let categories;
    if (all === 'true') {
      categories = await categoryService.getAllCategories();
    } else if (tree === 'true') {
      categories = await categoryService.getCategoriesTree();
    } else {
      categories = await categoryService.getCategories(parent || null);
    }
    sendSuccess(res, categories, 'Categories fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category) return sendError(res, 'Category not found', 404);
    const subcategories = await categoryService.getSubcategories(req.params.id);
    sendSuccess(res, { category, subcategories });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);
    sendSuccess(res, category, 'Category created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    if (!category) return sendError(res, 'Category not found', 404);
    sendSuccess(res, category, 'Category updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await categoryService.deleteCategory(req.params.id);
    if (!category) return sendError(res, 'Category not found', 404);
    sendSuccess(res, null, 'Category deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  categoryValidation,
};
