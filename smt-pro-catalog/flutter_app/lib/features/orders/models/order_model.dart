class OrderItemModel {
  final int    id;
  final int    productId;
  final String productName;
  final int    quantity;
  final double price;

  const OrderItemModel({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> j) => OrderItemModel(
    id:          j['id'] as int,
    productId:   j['productId'] as int,
    productName: (j['product'] as Map<String, dynamic>?)?['name'] as String? ?? 'Unknown',
    quantity:    j['quantity'] as int,
    price:       (j['price'] as num).toDouble(),
  );
}

class OrderModel {
  final int              id;
  final String           status;
  final double           totalAmount;
  final DateTime         createdAt;
  final String           userName;
  final List<OrderItemModel> items;

  const OrderModel({
    required this.id,
    required this.status,
    required this.totalAmount,
    required this.createdAt,
    required this.userName,
    required this.items,
  });

  factory OrderModel.fromJson(Map<String, dynamic> j) => OrderModel(
    id:          j['id'] as int,
    status:      j['status'] as String,
    totalAmount: (j['totalAmount'] as num).toDouble(),
    createdAt:   DateTime.parse(j['createdAt'] as String),
    userName:    (j['user'] as Map<String, dynamic>?)?['name'] as String? ?? '',
    items:       (j['items'] as List? ?? [])
        .map((e) => OrderItemModel.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}
