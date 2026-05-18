import '../../domain/entities/product.dart';

class ProductModel extends Product {
  const ProductModel({
    required super.id,
    required super.name,
    required super.description,
    required super.slug,
    required super.price,
    super.comparePrice,
    super.category,
    super.images,
    super.stock,
    super.isActive,
    super.createdAt,
    super.updatedAt,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    // Handles both Prisma (int id, flat strings) and legacy (string _id, LocalizedText)
    final rawId = json['id'] ?? json['_id'];
    final id = rawId?.toString() ?? '';

    final rawName = json['name'];
    final name = rawName is Map<String, dynamic>
        ? LocalizedText(en: rawName['en'] as String? ?? '', ar: rawName['ar'] as String? ?? '', ku: rawName['ku'] as String? ?? '')
        : LocalizedText(en: rawName?.toString() ?? '');

    final rawDesc = json['description'];
    final description = rawDesc is Map<String, dynamic>
        ? LocalizedText(en: rawDesc['en'] as String? ?? '', ar: rawDesc['ar'] as String? ?? '', ku: rawDesc['ku'] as String? ?? '')
        : LocalizedText(en: rawDesc?.toString() ?? '');

    // Stock: new backend uses "quantity", old used "stock"
    final stock = (json['quantity'] as num?)?.toInt() ?? (json['stock'] as num?)?.toInt() ?? 0;

    // Images: new backend has single imageUrl, old had images array
    final List<ProductImage> images;
    if (json['images'] is List && (json['images'] as List).isNotEmpty) {
      images = (json['images'] as List<dynamic>)
          .map((e) => _parseImage(e as Map<String, dynamic>))
          .toList();
    } else if (json['imageUrl'] != null && (json['imageUrl'] as String).isNotEmpty) {
      images = [ProductImage(url: json['imageUrl'] as String, publicId: json['imagePublicId'] as String? ?? '')];
    } else {
      images = const [];
    }

    // Category: new backend has flat string, old had object
    CategoryRef? category;
    final rawCat = json['category'];
    if (rawCat is Map<String, dynamic>) {
      category = CategoryRef(
        id: (rawCat['_id'] ?? rawCat['id'])?.toString() ?? '',
        name: LocalizedText(en: (rawCat['name'] is Map ? rawCat['name']['en'] : rawCat['name'])?.toString() ?? ''),
        slug: rawCat['slug'] as String?,
      );
    } else if (rawCat is String && rawCat.isNotEmpty) {
      category = CategoryRef(id: rawCat, name: LocalizedText(en: rawCat));
    }

    return ProductModel(
      id:          id,
      name:        name,
      description: description,
      slug:        json['slug'] as String? ?? id,
      price:       (json['price'] as num).toDouble(),
      comparePrice: json['comparePrice'] != null ? (json['comparePrice'] as num).toDouble() : null,
      category:    category,
      images:      images,
      stock:       stock,
      isActive:    json['isActive'] as bool? ?? true,
      createdAt:   json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
      updatedAt:   json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'] as String) : null,
    );
  }

  static ProductImage _parseImage(Map<String, dynamic> json) => ProductImage(
    url:       json['url'] as String,
    publicId:  json['publicId'] as String? ?? '',
    alt:       json['alt'] as String? ?? '',
    isPrimary: json['isPrimary'] as bool? ?? false,
  );
}
