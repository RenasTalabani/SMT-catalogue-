import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../models/category_model.dart';

class CategoryService {
  final _client = ApiClient();

  Future<List<CategoryModel>> getTree() async {
    final res = await _client.get(ApiEndpoints.categories, params: {'tree': 'true'});
    final data = res.data['data'] as List<dynamic>;
    return data.map((e) => CategoryModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<CategoryModel>> getFlat({int? parentId}) async {
    final res = await _client.get(ApiEndpoints.categories, params: {
      if (parentId != null) 'parentId': parentId,
    });
    final data = res.data['data'] as List<dynamic>;
    return data.map((e) => CategoryModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<CategoryModel> getById(int id) async {
    final res = await _client.get('${ApiEndpoints.categories}/$id');
    return CategoryModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<CategoryModel> create(Map<String, dynamic> data) async {
    final res = await _client.post(ApiEndpoints.categories, data: data);
    return CategoryModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<CategoryModel> update(int id, Map<String, dynamic> data) async {
    final res = await _client.put('${ApiEndpoints.categories}/$id', data: data);
    return CategoryModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<void> delete(int id) async {
    await _client.delete('${ApiEndpoints.categories}/$id');
  }
}
