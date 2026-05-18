import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../models/product_model.dart';

class ProductService {
  final _client = ApiClient();

  Future<List<ProductModel>> getAll({String? search, String? category}) async {
    final res = await _client.get(ApiEndpoints.products, params: {
      if (search   != null && search.isNotEmpty)   'search':   search,
      if (category != null && category.isNotEmpty) 'category': category,
      'limit': 100,
    });
    final data = res.data['data'] as Map<String, dynamic>;
    return (data['products'] as List)
        .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ProductModel> create({
    required String name,
    required double price,
    required int    quantity,
    required String category,
    String?         description,
  }) async {
    final res = await _client.post(ApiEndpoints.products, data: {
      'name':        name,
      'price':       price,
      'quantity':    quantity,
      'category':    category,
      if (description != null && description.isNotEmpty) 'description': description,
    });
    return ProductModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<ProductModel> update(int id, Map<String, dynamic> updates) async {
    final res = await _client.put('${ApiEndpoints.products}/$id', data: updates);
    return ProductModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<void> delete(int id) async {
    await _client.delete('${ApiEndpoints.products}/$id');
  }
}
