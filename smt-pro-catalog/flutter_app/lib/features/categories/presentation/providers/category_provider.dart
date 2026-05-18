import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/category_remote_datasource.dart';
import '../../domain/entities/category.dart';
import '../../../products/presentation/providers/product_provider.dart';

final categoryDataSourceProvider = Provider<CategoryRemoteDataSource>(
  (ref) => CategoryRemoteDataSourceImpl(ref.watch(apiClientProvider)),
);

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final ds = ref.watch(categoryDataSourceProvider);
  return ds.getCategories(tree: true);
});

final flatCategoriesProvider = FutureProvider<List<Category>>((ref) async {
  final ds = ref.watch(categoryDataSourceProvider);
  return ds.getCategories(tree: false);
});

final categoryDetailProvider =
    FutureProvider.family<({Category category, List<Category> subcategories}), String>(
  (ref, id) async {
    final ds = ref.watch(categoryDataSourceProvider);
    return ds.getCategoryById(id);
  },
);
