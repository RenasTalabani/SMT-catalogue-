import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/category_model.dart';
import '../services/category_service.dart';
import '../../../core/providers/realtime_provider.dart';

final _categoryService = CategoryService();

/// Tree of all active categories — invalidated by real-time socket events.
final categoryTreeProvider = FutureProvider<List<CategoryModel>>((ref) async {
  ref.watch(categoryRealtimeProvider); // rebuild on any category change
  return _categoryService.getTree();
});

/// Flat list of all active categories.
final categoryFlatProvider = FutureProvider<List<CategoryModel>>((ref) async {
  ref.watch(categoryRealtimeProvider);
  return _categoryService.getFlat();
});

/// Single category detail (by int id).
final categoryDetailProvider = FutureProvider.family<CategoryModel, int>((ref, id) async {
  ref.watch(categoryRealtimeProvider);
  return _categoryService.getById(id);
});

// ─── Mutations ────────────────────────────────────────────────────────────────

class CategoryNotifier extends AsyncNotifier<List<CategoryModel>> {
  final _svc = CategoryService();

  @override
  Future<List<CategoryModel>> build() => _svc.getTree();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_svc.getTree);
  }

  Future<void> createCategory(Map<String, dynamic> data) async {
    await _svc.create(data);
    await refresh();
  }

  Future<void> updateCategory(int id, Map<String, dynamic> data) async {
    await _svc.update(id, data);
    await refresh();
  }

  Future<void> deleteCategory(int id) async {
    await _svc.delete(id);
    await refresh();
  }
}

final categoryNotifierProvider =
    AsyncNotifierProvider<CategoryNotifier, List<CategoryModel>>(CategoryNotifier.new);
