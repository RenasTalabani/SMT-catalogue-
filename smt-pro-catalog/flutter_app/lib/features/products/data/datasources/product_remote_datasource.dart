import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../models/product_model.dart';

abstract class ProductRemoteDataSource {
  Future<({List<ProductModel> products, Map<String, dynamic> pagination})> getProducts(
      Map<String, dynamic> params);
  Future<({ProductModel product, List<ProductModel> related})> getProductById(String id);
  Future<ProductModel> createProduct(Map<String, dynamic> data);
  Future<ProductModel> updateProduct(String id, Map<String, dynamic> data);
  Future<void> deleteProduct(String id);
}

class ProductRemoteDataSourceImpl implements ProductRemoteDataSource {
  final ApiClient client;
  const ProductRemoteDataSourceImpl(this.client);

  @override
  Future<({List<ProductModel> products, Map<String, dynamic> pagination})> getProducts(
      Map<String, dynamic> params) async {
    final response = await client.get<Map<String, dynamic>>(
      ApiEndpoints.products,
      queryParameters: params,
    );
    final body = response.data!;
    final data = body['data'] as Map<String, dynamic>;
    final list = data['products'] as List<dynamic>;
    final total = (data['total'] as num?)?.toInt() ?? list.length;
    final page  = (data['page']  as num?)?.toInt() ?? 1;
    final limit = (data['limit'] as num?)?.toInt() ?? 20;

    return (
      products: list.map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList(),
      pagination: {
        'total': total,
        'page': page,
        'limit': limit,
        'hasNextPage': (page * limit) < total,
        'hasPrevPage': page > 1,
      },
    );
  }

  @override
  Future<({ProductModel product, List<ProductModel> related})> getProductById(
      String id) async {
    final response = await client.get<Map<String, dynamic>>(
      '${ApiEndpoints.products}/$id',
    );
    final data = response.data!['data'] as Map<String, dynamic>;
    return (product: ProductModel.fromJson(data), related: <ProductModel>[]);
  }

  @override
  Future<ProductModel> createProduct(Map<String, dynamic> data) async {
    final response = await client.post<Map<String, dynamic>>(
      ApiEndpoints.products,
      data: data,
    );
    return ProductModel.fromJson(response.data!['data'] as Map<String, dynamic>);
  }

  @override
  Future<ProductModel> updateProduct(String id, Map<String, dynamic> data) async {
    final response = await client.put<Map<String, dynamic>>(
      '${ApiEndpoints.products}/$id',
      data: data,
    );
    return ProductModel.fromJson(response.data!['data'] as Map<String, dynamic>);
  }

  @override
  Future<void> deleteProduct(String id) async {
    await client.delete('${ApiEndpoints.products}/$id');
  }
}
