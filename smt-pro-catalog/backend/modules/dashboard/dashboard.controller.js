const Product = require('../products/product.model');
const Category = require('../categories/category.model');
const { sendSuccess } = require('../../utils/apiResponse');

const getAnalytics = async (req, res, next) => {
  try {
    const [
      totalProducts,
      activeProducts,
      featuredProducts,
      totalCategories,
      recentProducts,
      productsByCategory,
      topViewedProducts,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isFeatured: true, isActive: true }),
      Category.countDocuments({ isActive: true }),
      Product.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('category', 'name')
        .select('name price images createdAt isActive')
        .lean(),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmpty: true } },
        {
          $project: {
            categoryName: '$category.name',
            count: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Product.find({ isActive: true })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('name viewCount price images')
        .lean(),
    ]);

    sendSuccess(res, {
      overview: {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        featuredProducts,
        totalCategories,
      },
      recentProducts,
      productsByCategory,
      topViewedProducts,
    });
  } catch (err) {
    next(err);
  }
};

const getBulkUploadTemplate = (req, res) => {
  res.json({
    success: true,
    data: {
      description: 'SMT Pro Catalog — Bulk Upload Template (send as JSON array)',
      requiredFields: ['name.en', 'price', 'category'],
      fields: {
        'name.en': 'string (required)',
        'name.ar': 'string',
        'name.ku': 'string',
        'description.en': 'string',
        'description.ar': 'string',
        'description.ku': 'string',
        price: 'number (required, min: 0)',
        comparePrice: 'number',
        stock: 'number (default: 0)',
        category: 'MongoDB ObjectId (required)',
        subCategory: 'MongoDB ObjectId',
        tags: 'string[] — e.g. ["electronics","new"]',
        isActive: 'boolean (default: true)',
        isFeatured: 'boolean (default: false)',
      },
      example: [
        {
          'name.en': 'Wireless Headphones',
          'name.ar': 'سماعات لاسلكية',
          'name.ku': 'گوێگری بێ تێل',
          'description.en': 'Premium wireless headphones with noise cancellation',
          price: 129.99,
          comparePrice: 159.99,
          stock: 50,
          category: '64f8a1234567890abc123456',
          tags: ['electronics', 'audio', 'wireless'],
          isActive: true,
          isFeatured: true,
        },
      ],
    },
  });
};

module.exports = { getAnalytics, getBulkUploadTemplate };
