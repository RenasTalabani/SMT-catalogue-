import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../models/report_models.dart';

class ReportService {
  final _client = ApiClient();

  Future<MonthlyReportModel> getMonthlyReport(int year, int month) async {
    final lastDay = DateTime(year, month + 1, 0).day;
    final from    = '$year-${month.toString().padLeft(2, '0')}-01';
    final to      = '$year-${month.toString().padLeft(2, '0')}-${lastDay.toString().padLeft(2, '0')}';

    final res  = await _client.get(
      ApiEndpoints.salesAnalytics,
      params: {'from': from, 'to': to, 'groupBy': 'day'},
    );
    final data = (res.data as Map<String, dynamic>)['data'];
    return MonthlyReportModel.fromSalesJson(data, year, month);
  }

  Future<List<LowStockModel>> getLowStock({int threshold = 5}) async {
    final res  = await _client.get(ApiEndpoints.inventoryValue);
    final body = (res.data as Map<String, dynamic>)['data'];
    final items = body['items'] as List;
    return items
        .map((e) => LowStockModel.fromJson(e as Map<String, dynamic>))
        .where((p) => p.quantity <= threshold)
        .toList()
      ..sort((a, b) => a.quantity.compareTo(b.quantity));
  }
}
