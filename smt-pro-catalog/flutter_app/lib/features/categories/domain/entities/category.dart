import 'package:equatable/equatable.dart';
import '../../../products/domain/entities/product.dart';

class Category extends Equatable {
  final String id;
  final LocalizedText name;
  final String? icon;
  final String? imageUrl;
  final String? parentId;
  final String slug;
  final int order;
  final bool isActive;
  final int productCount;
  final List<Category> children;

  const Category({
    required this.id,
    required this.name,
    this.icon,
    this.imageUrl,
    this.parentId,
    this.slug = '',
    this.order = 0,
    this.isActive = true,
    this.productCount = 0,
    this.children = const [],
  });

  bool get isRoot => parentId == null;
  bool get hasChildren => children.isNotEmpty;

  @override
  List<Object?> get props => [id];
}
