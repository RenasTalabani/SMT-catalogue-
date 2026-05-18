import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../models/order_model.dart';

class OrderService {
  final _client = ApiClient();

  Future<List<OrderModel>> getAll() async {
    final res = await _client.get(ApiEndpoints.orders);
    return (res.data['data'] as List)
        .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<OrderModel>> getMy() async {
    final res = await _client.get(ApiEndpoints.myOrders);
    return (res.data['data'] as List)
        .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<OrderModel> create(List<Map<String, dynamic>> items) async {
    final res = await _client.post(ApiEndpoints.orders, data: {'items': items});
    return OrderModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<OrderModel> updateStatus(int id, String status) async {
    final res = await _client.patch(
      '${ApiEndpoints.orders}/$id/status',
      data: {'status': status},
    );
    return OrderModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }
}
