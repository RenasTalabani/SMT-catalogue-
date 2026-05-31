const mongoose = require('mongoose');
const slugify = require('slugify');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const localizedSchema = {
  en: { type: String, default: '' },
  ar: { type: String, default: '' },
  ku: { type: String, default: '' },
};

const productSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, trim: true, default: '' },
      ku: { type: String, trim: true, default: '' },
    },
    slug: { type: String, unique: true, lowercase: true, index: true },
    description: localizedSchema,
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0, default: null },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    images: { type: [imageSchema], default: [] },
    video: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
      thumbnail: { type: String, default: null },
    },
    stock: { type: Number, default: 0, min: 0 },
    tags: [{ type: String, lowercase: true, trim: true }],
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Full-text search index
productSchema.index({
  'name.en': 'text',
  'name.ar': 'text',
  'name.ku': 'text',
  'description.en': 'text',
  tags: 'text',
});
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

// Auto-generate slug before save
productSchema.pre('save', function (next) {
  if (this.isModified('name.en')) {
    this.slug = slugify(`${this.name.en}-${Date.now()}`, {
      lower: true,
      strict: true,
    });
  }
  // Ensure first image is primary when none set
  if (this.images.length > 0 && !this.images.some((img) => img.isPrimary)) {
    this.images[0].isPrimary = true;
  }
  next();
});

// Keep Category.productCount in sync
const updateCategoryCount = async (categoryId) => {
  if (!categoryId) return;
  const count = await mongoose.model('Product').countDocuments({ category: categoryId, isActive: true });
  await mongoose.model('Category').findByIdAndUpdate(categoryId, { productCount: count });
};

productSchema.post('save', async function () {
  await updateCategoryCount(this.category);
});

productSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await updateCategoryCount(doc.category);
});

productSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) await updateCategoryCount(doc.category);
});

module.exports = mongoose.model('Product', productSchema);
