const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, trim: true, default: '' },
      ku: { type: String, trim: true, default: '' },
    },
    slug: { type: String, unique: true, lowercase: true, index: true },
    icon: { type: String, default: null },
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
});

categorySchema.pre('save', function (next) {
  if (this.isModified('name.en')) {
    this.slug = slugify(`${this.name.en}-${Date.now()}`, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
