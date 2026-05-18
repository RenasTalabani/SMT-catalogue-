class StockMovementModel {
  final int     id;
  final int     productId;
  final String  productName;
  final String  type;
  final int     quantity;
  final int     previousQty;
  final int     newQty;
  final String? notes;
  final String  employeeName;
  final DateTime createdAt;

  const StockMovementModel({
    required this.id,
    required this.productId,
    required this.productName,
    required this.type,
    required this.quantity,
    required this.previousQty,
    required this.newQty,
    this.notes,
    required this.employeeName,
    required this.createdAt,
  });

  factory StockMovementModel.fromJson(Map<String, dynamic> j) => StockMovementModel(
    id:           j['id'] as int,
    productId:    j['productId'] as int,
    productName:  (j['product'] as Map<String, dynamic>?)?['name'] as String? ?? 'Unknown',
    type:         j['type'] as String,
    quantity:     j['quantity'] as int,
    previousQty:  j['previousQty'] as int,
    newQty:       j['newQty'] as int,
    notes:        j['notes'] as String?,
    employeeName: (j['employee'] as Map<String, dynamic>?)?['name'] as String? ?? '',
    createdAt:    DateTime.parse(j['createdAt'] as String),
  );
}

class InventoryValueModel {
  final double totalValue;
  final int    totalProducts;
  final int    lowStockCount;
  final int    outOfStockCount;
  final List<LowStockItem> lowStockItems;

  const InventoryValueModel({
    required this.totalValue,
    required this.totalProducts,
    required this.lowStockCount,
    required this.outOfStockCount,
    required this.lowStockItems,
  });

  factory InventoryValueModel.fromJson(Map<String, dynamic> j) {
    final items = (j['lowStockProducts'] as List? ?? [])
        .map((e) => LowStockItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return InventoryValueModel(
      totalValue:     (j['totalInventoryValue'] as num?)?.toDouble() ?? 0,
      totalProducts:  j['totalProducts'] as int? ?? 0,
      lowStockCount:  items.where((i) => i.quantity > 0).length,
      outOfStockCount: items.where((i) => i.quantity == 0).length,
      lowStockItems:  items,
    );
  }
}

class LowStockItem {
  final int    id;
  final String name;
  final String category;
  final int    quantity;

  const LowStockItem({required this.id, required this.name, required this.category, required this.quantity});

  factory LowStockItem.fromJson(Map<String, dynamic> j) => LowStockItem(
    id:       j['id'] as int,
    name:     j['name'] as String,
    category: j['category'] as String,
    quantity: j['quantity'] as int,
  );
}
