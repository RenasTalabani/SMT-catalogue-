class MonthlyReportModel {
  final int    year;
  final int    month;
  final int    totalOrders;
  final double totalRevenue;
  final Map<int, DayData> dailyBreakdown;

  const MonthlyReportModel({
    required this.year,
    required this.month,
    required this.totalOrders,
    required this.totalRevenue,
    required this.dailyBreakdown,
  });

  factory MonthlyReportModel.fromSalesJson(Map<String, dynamic> json, int year, int month) {
    final list = json['data'] as List;
    final breakdown = <int, DayData>{};
    for (final entry in list) {
      final date = entry['date'] as String; // "YYYY-MM-DD"
      final day  = int.parse(date.split('-')[2]);
      breakdown[day] = DayData(
        totalOrders:  entry['orders']  as int,
        totalRevenue: (entry['revenue'] as num).toDouble(),
      );
    }
    return MonthlyReportModel(
      year:           year,
      month:          month,
      totalOrders:    json['totalOrders'] as int,
      totalRevenue:   (json['totalRevenue'] as num).toDouble(),
      dailyBreakdown: breakdown,
    );
  }
}

class DayData {
  final int    totalOrders;
  final double totalRevenue;

  const DayData({required this.totalOrders, required this.totalRevenue});
}

class LowStockModel {
  final int    id;
  final String name;
  final String category;
  final int    quantity;

  const LowStockModel({
    required this.id,
    required this.name,
    required this.category,
    required this.quantity,
  });

  factory LowStockModel.fromJson(Map<String, dynamic> json) => LowStockModel(
        id:       json['id']       as int,
        name:     json['name']     as String,
        category: json['category'] as String,
        quantity: json['quantity'] as int,
      );
}
