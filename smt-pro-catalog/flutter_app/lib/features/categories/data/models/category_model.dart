import '../../../products/domain/entities/product.dart';
import '../../domain/entities/category.dart';

class CategoryModel extends Category {
  const CategoryModel({
    required super.id,
    required super.name,
    super.icon,
    super.imageUrl,
    super.parentId,
    super.slug,
    super.order,
    super.isActive,
    super.productCount,
    super.children,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    final childrenJson = json['children'] as List<dynamic>?;
    final nameEn = json['name'] as String? ?? '';
    return CategoryModel(
      id:           json['id'].toString(),
      name:         LocalizedText(
                      en: nameEn,
                      ar: json['nameAr'] as String? ?? nameEn,
                      ku: json['nameKu'] as String? ?? nameEn,
                    ),
      icon:         null,
      imageUrl:     json['imageUrl'] as String?,
      parentId:     json['parentId']?.toString(),
      slug:         json['slug'] as String? ?? '',
      order:        (json['order'] as num?)?.toInt() ?? 0,
      isActive:     json['isActive'] as bool? ?? true,
      productCount: (json['productCount'] as num?)?.toInt() ?? 0,
      children:     childrenJson
                      ?.map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
                      .toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': {'en': name.en, 'ar': name.ar, 'ku': name.ku},
      if (icon != null) 'icon': icon,
      if (parentId != null) 'parent': parentId,
      'order': order,
      'isActive': isActive,
    };
  }
}
