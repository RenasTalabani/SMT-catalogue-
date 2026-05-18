import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../models/inventory_model.dart';

class InventoryService {
  final _client = ApiClient();

  Future<InventoryValueModel> getValue({int threshold = 5}) async {
    final res = await _client.get(ApiEndpoints.inventoryValue,
        params: {'lowStockThreshold': threshold});
    return InventoryValueModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<List<StockMovementModel>> getMovements({int page = 1}) async {
    final res = await _client.get(ApiEndpoints.stockMovements,
        params: {'page': page, 'limit': 50});
    final data = res.data['data'];
    final list = data is List ? data : (data as Map<String, dynamic>)['movements'] ?? data['data'] ?? [];
    return (list as List)
        .map((e) => StockMovementModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<StockMovementModel> recordMovement({
    required int    productId,
    required String type,
    required int    quantity,
    String?         notes,
  }) async {
    final res = await _client.post(ApiEndpoints.stockMovements, data: {
      'productId': productId,
      'type':      type,
      'quantity':  quantity,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    return StockMovementModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }
}
