class CategoryModel {
  final int      id;
  final String   name;
  final String?  nameAr;
  final String?  nameKu;
  final String   slug;
  final String?  description;
  final String?  imageUrl;
  final int      order;
  final bool     isActive;
  final int?     parentId;
  final DateTime createdAt;
  final List<CategoryModel> children;
  final int productCount;

  const CategoryModel({
    required this.id,
    required this.name,
    this.nameAr,
    this.nameKu,
    required this.slug,
    this.description,
    this.imageUrl,
    this.order = 0,
    this.isActive = true,
    this.parentId,
    required this.createdAt,
    this.children = const [],
    this.productCount = 0,
  });

  bool get isRoot => parentId == null;
  bool get hasChildren => children.isNotEmpty;

  String localizedName(String locale) {
    switch (locale) {
      case 'ar':
        return (nameAr != null && nameAr!.isNotEmpty) ? nameAr! : name;
      case 'ku':
        return (nameKu != null && nameKu!.isNotEmpty) ? nameKu! : name;
      default:
        return name;
    }
  }

  factory CategoryModel.fromJson(Map<String, dynamic> j) => CategoryModel(
    id:           j['id'] as int,
    name:         j['name'] as String,
    nameAr:       j['nameAr'] as String?,
    nameKu:       j['nameKu'] as String?,
    slug:         j['slug'] as String? ?? '',
    description:  j['description'] as String?,
    imageUrl:     j['imageUrl'] as String?,
    order:        (j['order'] as num?)?.toInt() ?? 0,
    isActive:     j['isActive'] as bool? ?? true,
    parentId:     (j['parentId'] as num?)?.toInt(),
    createdAt:    DateTime.parse(j['createdAt'] as String),
    productCount: (j['_count']?['products'] as num?)?.toInt() ?? 0,
    children:     (j['children'] as List<dynamic>? ?? [])
        .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
        .toList(),
  );

  Map<String, dynamic> toJson() => {
    'name':        name,
    if (nameAr != null) 'nameAr': nameAr,
    if (nameKu != null) 'nameKu': nameKu,
    'slug':        slug,
    if (description != null) 'description': description,
    if (imageUrl   != null) 'imageUrl': imageUrl,
    'order':       order,
    'isActive':    isActive,
    if (parentId   != null) 'parentId': parentId,
  };
}
