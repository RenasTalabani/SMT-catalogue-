import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../models/dashboard_model.dart';

class DashboardService {
  final _client = ApiClient();

  Future<DashboardModel> getSummary() async {
    final res  = await _client.get(ApiEndpoints.dashboard);
    final data = (res.data as Map<String, dynamic>)['data'];
    return DashboardModel.fromJson(data);
  }

  Future<List<TopProductModel>> getTopProducts({int limit = 5}) async {
    final res  = await _client.get(ApiEndpoints.topProducts, params: {'limit': limit});
    final list = (res.data as Map<String, dynamic>)['data'] as List;
    return list.map((e) => TopProductModel.fromJson(e)).toList();
  }
}
