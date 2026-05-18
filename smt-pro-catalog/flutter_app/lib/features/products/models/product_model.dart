class ProductModel {
  final int     id;
  final String  name;
  final String? description;
  final double  price;
  final int     quantity;
  final String? imageUrl;
  final String  category;
  final DateTime createdAt;

  const ProductModel({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    required this.quantity,
    this.imageUrl,
    required this.category,
    required this.createdAt,
  });

  factory ProductModel.fromJson(Map<String, dynamic> j) => ProductModel(
    id:          j['id'] as int,
    name:        j['name'] as String,
    description: j['description'] as String?,
    price:       (j['price'] as num).toDouble(),
    quantity:    j['quantity'] as int,
    imageUrl:    j['imageUrl'] as String?,
    category:    j['category'] as String,
    createdAt:   DateTime.parse(j['createdAt'] as String),
  );
}
