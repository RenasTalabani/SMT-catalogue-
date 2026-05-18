import 'package:equatable/equatable.dart';
import '../../../../core/utils/iterable_extensions.dart';

class LocalizedText extends Equatable {
  final String en;
  final String ar;
  final String ku;

  const LocalizedText({this.en = '', this.ar = '', this.ku = ''});

  String get(String locale) {
    switch (locale) {
      case 'ar':
        return ar.isNotEmpty ? ar : en;
      case 'ku':
        return ku.isNotEmpty ? ku : en;
      default:
        return en;
    }
  }

  @override
  List<Object?> get props => [en, ar, ku];
}

class ProductImage extends Equatable {
  final String url;
  final String publicId;
  final String alt;
  final bool isPrimary;

  const ProductImage({
    required this.url,
    required this.publicId,
    this.alt = '',
    this.isPrimary = false,
  });

  @override
  List<Object?> get props => [url, publicId];
}

class ProductVideo extends Equatable {
  final String? url;
  final String? publicId;
  final String? thumbnail;

  const ProductVideo({this.url, this.publicId, this.thumbnail});

  bool get hasVideo => url != null && url!.isNotEmpty;

  @override
  List<Object?> get props => [url, publicId];
}

class ProductRating extends Equatable {
  final double average;
  final int count;

  const ProductRating({this.average = 0, this.count = 0});

  @override
  List<Object?> get props => [average, count];
}

class CategoryRef extends Equatable {
  final String id;
  final LocalizedText name;
  final String? icon;
  final String? slug;

  const CategoryRef({
    required this.id,
    required this.name,
    this.icon,
    this.slug,
  });

  @override
  List<Object?> get props => [id];
}

class Product extends Equatable {
  final String id;
  final LocalizedText name;
  final LocalizedText description;
  final String slug;
  final double price;
  final double? comparePrice;
  final CategoryRef? category;
  final CategoryRef? subCategory;
  final List<ProductImage> images;
  final ProductVideo? video;
  final int stock;
  final List<String> tags;
  final bool isActive;
  final bool isFeatured;
  final int viewCount;
  final ProductRating rating;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.slug,
    required this.price,
    this.comparePrice,
    this.category,
    this.subCategory,
    this.images = const [],
    this.video,
    this.stock = 0,
    this.tags = const [],
    this.isActive = true,
    this.isFeatured = false,
    this.viewCount = 0,
    this.rating = const ProductRating(),
    this.createdAt,
    this.updatedAt,
  });

  String? get primaryImage =>
      images.where((i) => i.isPrimary).firstOrNull?.url ?? images.firstOrNull?.url;

  bool get isInStock => stock > 0;

  bool get hasDiscount => comparePrice != null && comparePrice! > price;

  double get discountPercentage {
    if (!hasDiscount) return 0;
    return ((comparePrice! - price) / comparePrice! * 100);
  }

  @override
  List<Object?> get props => [id, slug];
}
