const { error } = require('../utils/response.util');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return error(res, 'Name must be at least 2 characters', 400);
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return error(res, 'A valid email address is required', 400);
  }

  if (!password || password.length < 8) {
    return error(res, 'Password must be at least 8 characters', 400);
  }

  req.body.name = name.trim();
  req.body.email = email.toLowerCase().trim();

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return error(res, 'A valid email address is required', 400);
  }

  if (!password) {
    return error(res, 'Password is required', 400);
  }

  req.body.email = email.toLowerCase().trim();

  next();
};

const validateProduct = (req, res, next) => {
  const { name, price, quantity, category } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return error(res, 'Product name must be at least 2 characters', 400);
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return error(res, 'Price must be a number greater than 0', 400);
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty < 0) {
    return error(res, 'Quantity must be a non-negative integer', 400);
  }

  if (!category || typeof category !== 'string' || category.trim().length < 1) {
    return error(res, 'Category is required', 400);
  }

  req.body.name = name.trim();
  req.body.category = category.trim();
  req.body.price = parsedPrice;
  req.body.quantity = parsedQty;

  next();
};

const validateProductUpdate = (req, res, next) => {
  const { name, price, quantity, category } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      return error(res, 'Product name must be at least 2 characters', 400);
    }
    req.body.name = name.trim();
  }

  if (price !== undefined) {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return error(res, 'Price must be a number greater than 0', 400);
    }
    req.body.price = parsedPrice;
  }

  if (quantity !== undefined) {
    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      return error(res, 'Quantity must be a non-negative integer', 400);
    }
    req.body.quantity = parsedQty;
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || category.trim().length < 1) {
      return error(res, 'Category cannot be empty', 400);
    }
    req.body.category = category.trim();
  }

  next();
};

module.exports = { validateRegister, validateLogin, validateProduct, validateProductUpdate };
