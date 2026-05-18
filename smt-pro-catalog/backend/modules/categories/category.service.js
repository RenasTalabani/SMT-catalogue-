const Category = require('./category.model');

const getCategories = async (parentId = null) => {
  return Category.find({ parent: parentId, isActive: true })
    .sort({ order: 1, 'name.en': 1 })
    .lean();
};

const getCategoriesTree = async () => {
  const all = await Category.find({ isActive: true }).sort({ order: 1 }).lean();
  const map = {};
  const roots = [];

  all.forEach((cat) => {
    map[String(cat._id)] = { ...cat, children: [] };
  });

  all.forEach((cat) => {
    if (cat.parent) {
      const parent = map[String(cat.parent)];
      if (parent) parent.children.push(map[String(cat._id)]);
    } else {
      roots.push(map[String(cat._id)]);
    }
  });

  return roots;
};

const getCategoryById = async (id) => {
  return Category.findById(id).populate('parent', 'name slug').lean();
};

const getSubcategories = async (parentId) => {
  return Category.find({ parent: parentId, isActive: true })
    .sort({ order: 1 })
    .lean();
};

const createCategory = async (data) => {
  const category = new Category(data);
  return category.save();
};

const updateCategory = async (id, data) => {
  return Category.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
};

const deleteCategory = async (id) => {
  // Cascade: deactivate subcategories
  await Category.updateMany({ parent: id }, { $set: { isActive: false } });
  return Category.findByIdAndDelete(id);
};

const getAllCategories = async () => {
  return Category.find().sort({ order: 1, 'name.en': 1 }).lean();
};

module.exports = {
  getCategories,
  getCategoriesTree,
  getCategoryById,
  getSubcategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
};
