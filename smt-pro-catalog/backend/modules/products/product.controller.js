const { body } = require('express-validator');
const productService = require('./product.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/apiResponse');
const validate = require('../../middlewares/validate');

// Validation rules
const productValidation = [
  body('name.en').notEmpty().trim().withMessage('Product name (English) is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isMongoId().withMessage('Invalid category ID'),
  body('subCategory').optional({ nullable: true }).isMongoId().withMessage('Invalid subCategory ID'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('comparePrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Compare price must be positive'),
  validate,
];

const getProducts = async (req, res, next) => {
  try {
    const { products, pagination } = await productService.getProducts(req.query);
    sendPaginated(res, products, pagination, 'Products fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404);

    const related = await productService.getRelatedProducts(
      product._id,
      product.category?._id
    );
    sendSuccess(res, { product, related });
  } catch (err) {
    next(err);
  }
};

const getProductBySlug = async (req, res, next) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    if (!product) return sendError(res, 'Product not found', 404);
    const related = await productService.getRelatedProducts(product._id, product.category?._id);
    sendSuccess(res, { product, related });
  } catch (err) {
    next(err);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    sendSuccess(res, product, 'Product created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    if (!product) return sendError(res, 'Product not found', 404);
    sendSuccess(res, product, 'Product updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await productService.deleteProduct(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404);
    sendSuccess(res, null, 'Product deleted successfully');
  } catch (err) {
    next(err);
  }
};

const getDashboardProducts = async (req, res, next) => {
  try {
    const { products, pagination } = await productService.getAllProductsAdmin(req.query);
    sendPaginated(res, products, pagination, 'Dashboard products fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getDashboardProducts,
  productValidation,
};
