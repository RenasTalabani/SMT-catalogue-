class DashboardModel {
  final int    totalProducts;
  final int    totalOrders;
  final double totalRevenue;
  final int    pendingOrders;
  final int    completedOrders;
  final int    cancelledOrders;

  const DashboardModel({
    required this.totalProducts,
    required this.totalOrders,
    required this.totalRevenue,
    required this.pendingOrders,
    required this.completedOrders,
    required this.cancelledOrders,
  });

  factory DashboardModel.fromJson(Map<String, dynamic> json) => DashboardModel(
        totalProducts:   json['totalProducts'],
        totalOrders:     json['totalOrders'],
        totalRevenue:    (json['totalRevenue'] as num).toDouble(),
        pendingOrders:   json['pendingOrders'],
        completedOrders: json['completedOrders'],
        cancelledOrders: json['cancelledOrders'],
      );
}

class TopProductModel {
  final int    id;
  final String name;
  final String category;
  final String? imageUrl;
  final int    totalSold;
  final double totalRevenue;

  const TopProductModel({
    required this.id,
    required this.name,
    required this.category,
    this.imageUrl,
    required this.totalSold,
    required this.totalRevenue,
  });

  factory TopProductModel.fromJson(Map<String, dynamic> json) => TopProductModel(
        id:           json['id'],
        name:         json['name'],
        category:     json['category'],
        imageUrl:     json['imageUrl'],
        totalSold:    json['totalSold'],
        totalRevenue: (json['totalRevenue'] as num).toDouble(),
      );
}
