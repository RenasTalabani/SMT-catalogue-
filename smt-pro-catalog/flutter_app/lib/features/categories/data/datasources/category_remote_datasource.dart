import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../models/category_model.dart';

abstract class CategoryRemoteDataSource {
  Future<List<CategoryModel>> getCategories({bool tree = false});
  Future<({CategoryModel category, List<CategoryModel> subcategories})> getCategoryById(String id);
  Future<CategoryModel> createCategory(Map<String, dynamic> data);
  Future<CategoryModel> updateCategory(String id, Map<String, dynamic> data);
  Future<void> deleteCategory(String id);
}

class CategoryRemoteDataSourceImpl implements CategoryRemoteDataSource {
  final ApiClient client;
  const CategoryRemoteDataSourceImpl(this.client);

  @override
  Future<List<CategoryModel>> getCategories({bool tree = false}) async {
    final response = await client.get<Map<String, dynamic>>(
      ApiEndpoints.categories,
      queryParameters: tree ? {'tree': 'true'} : {'all': 'true'},
    );
    final data = response.data!['data'] as List<dynamic>;
    return data.map((e) => CategoryModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<({CategoryModel category, List<CategoryModel> subcategories})> getCategoryById(
      String id) async {
    final response = await client.get<Map<String, dynamic>>(
      '${ApiEndpoints.categories}/$id',
    );
    final data = response.data!['data'] as Map<String, dynamic>;
    return (
      category: CategoryModel.fromJson(data['category'] as Map<String, dynamic>),
      subcategories: (data['subcategories'] as List<dynamic>)
          .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  Future<CategoryModel> createCategory(Map<String, dynamic> data) async {
    final response = await client.post<Map<String, dynamic>>(
      ApiEndpoints.categories,
      data: data,
    );
    return CategoryModel.fromJson(response.data!['data'] as Map<String, dynamic>);
  }

  @override
  Future<CategoryModel> updateCategory(String id, Map<String, dynamic> data) async {
    final response = await client.put<Map<String, dynamic>>(
      '${ApiEndpoints.categories}/$id',
      data: data,
    );
    return CategoryModel.fromJson(response.data!['data'] as Map<String, dynamic>);
  }

  @override
  Future<void> deleteCategory(String id) async {
    await client.delete('${ApiEndpoints.categories}/$id');
  }
}
