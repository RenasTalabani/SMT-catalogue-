const Product = require('./product.model');
const cloudinary = require('../../config/cloudinary');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

const buildFilter = (q) => {
  const filter = { isActive: true };
  if (q.search) filter.$text = { $search: q.search };
  if (q.category) filter.category = q.category;
  if (q.subCategory) filter.subCategory = q.subCategory;
  if (q.minPrice || q.maxPrice) {
    filter.price = {};
    if (q.minPrice) filter.price.$gte = Number(q.minPrice);
    if (q.maxPrice) filter.price.$lte = Number(q.maxPrice);
  }
  if (q.tags) {
    const tags = Array.isArray(q.tags) ? q.tags : q.tags.split(',').map((t) => t.trim());
    filter.tags = { $in: tags };
  }
  if (q.featured === 'true') filter.isFeatured = true;
  return filter;
};

const populateFields = (query) =>
  query
    .populate('category', 'name icon slug')
    .populate('subCategory', 'name icon slug')
    .select('-__v');

const getProducts = async (q) => {
  const { page, limit, skip } = getPagination(q);
  const filter = buildFilter(q);
  const sortField = q.sortBy || 'createdAt';
  const sortOrder = q.sortOrder === 'asc' ? 1 : -1;

  const [products, total] = await Promise.all([
    populateFields(
      Product.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limit).lean()
    ),
    Product.countDocuments(filter),
  ]);

  return { products, pagination: getPaginationMeta(total, page, limit) };
};

const getProductById = async (id) => {
  await Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
  return populateFields(Product.findById(id)).lean();
};

const getProductBySlug = async (slug) => {
  return populateFields(Product.findOne({ slug, isActive: true })).lean();
};

const getRelatedProducts = async (productId, categoryId, limit = 8) => {
  return Product.find({ _id: { $ne: productId }, category: categoryId, isActive: true })
    .select('name images price slug rating')
    .populate('category', 'name')
    .limit(limit)
    .lean();
};

const createProduct = async (data) => {
  const product = new Product(data);
  return (await product.save()).populate(['category', 'subCategory']);
};

const updateProduct = async (id, data) => {
  return populateFields(
    Product.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
  );
};

const deleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) return null;

  const destroyTasks = product.images.map((img) =>
    cloudinary.uploader.destroy(img.publicId).catch(() => {})
  );
  if (product.video?.publicId) {
    destroyTasks.push(
      cloudinary.uploader
        .destroy(product.video.publicId, { resource_type: 'video' })
        .catch(() => {})
    );
  }
  await Promise.allSettled(destroyTasks);
  return Product.findByIdAndDelete(id);
};

const getAllProductsAdmin = async (q) => {
  const { page, limit, skip } = getPagination(q);
  const filter = q.search ? { $text: { $search: q.search } } : {};
  if (q.isActive !== undefined) filter.isActive = q.isActive === 'true';

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { products, pagination: getPaginationMeta(total, page, limit) };
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
};
