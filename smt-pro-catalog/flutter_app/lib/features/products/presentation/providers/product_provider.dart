import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../data/datasources/product_remote_datasource.dart';
import '../../data/repositories/product_repository_impl.dart';
import '../../domain/entities/product.dart';
import '../../domain/repositories/product_repository.dart';
import '../../domain/usecases/get_products.dart';

// ─── Dependency providers ───────────────────────────────────────────────────

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final productDataSourceProvider = Provider<ProductRemoteDataSource>(
  (ref) => ProductRemoteDataSourceImpl(ref.watch(apiClientProvider)),
);

final productRepositoryProvider = Provider<ProductRepository>(
  (ref) => ProductRepositoryImpl(ref.watch(productDataSourceProvider)),
);

final getProductsUseCaseProvider = Provider<GetProducts>(
  (ref) => GetProducts(ref.watch(productRepositoryProvider)),
);

// ─── Filter state ────────────────────────────────────────────────────────────

class ProductFilterState {
  final GetProductsParams params;
  final bool isGridView;

  const ProductFilterState({
    this.params = const GetProductsParams(),
    this.isGridView = true,
  });

  ProductFilterState copyWith({GetProductsParams? params, bool? isGridView}) {
    return ProductFilterState(
      params: params ?? this.params,
      isGridView: isGridView ?? this.isGridView,
    );
  }
}

class ProductFilterNotifier extends StateNotifier<ProductFilterState> {
  ProductFilterNotifier() : super(const ProductFilterState());

  void updateSearch(String search) {
    state = state.copyWith(
      params: state.params.copyWith(search: search, page: 1),
    );
  }

  void updateCategory(String? categoryId) {
    state = state.copyWith(
      params: state.params.copyWith(category: categoryId, subCategory: null, page: 1),
    );
  }

  void updatePriceRange(double? min, double? max) {
    state = state.copyWith(
      params: state.params.copyWith(minPrice: min, maxPrice: max, page: 1),
    );
  }

  void updateSort(String sortBy, String sortOrder) {
    state = state.copyWith(
      params: state.params.copyWith(sortBy: sortBy, sortOrder: sortOrder),
    );
  }

  void nextPage() {
    state = state.copyWith(
      params: state.params.copyWith(page: state.params.page + 1),
    );
  }

  void toggleLayout() {
    state = state.copyWith(isGridView: !state.isGridView);
  }

  void reset() {
    state = const ProductFilterState();
  }
}

final productFilterProvider =
    StateNotifierProvider<ProductFilterNotifier, ProductFilterState>(
  (ref) => ProductFilterNotifier(),
);

// ─── Products list ────────────────────────────────────────────────────────────

class ProductsState {
  final List<Product> products;
  final Map<String, dynamic> pagination;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;

  const ProductsState({
    this.products = const [],
    this.pagination = const {},
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
  });

  bool get hasMore => pagination['hasNextPage'] == true;
  int get currentPage => (pagination['page'] as num?)?.toInt() ?? 1;

  ProductsState copyWith({
    List<Product>? products,
    Map<String, dynamic>? pagination,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
  }) {
    return ProductsState(
      products: products ?? this.products,
      pagination: pagination ?? this.pagination,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: error,
    );
  }
}

class ProductsNotifier extends StateNotifier<ProductsState> {
  final GetProducts _useCase;
  ProductsNotifier(this._useCase) : super(const ProductsState());

  Future<void> fetch(GetProductsParams params) async {
    state = state.copyWith(isLoading: true, error: null);
    final result = await _useCase(params);
    result.fold(
      (failure) => state = state.copyWith(isLoading: false, error: failure.message),
      (data) => state = state.copyWith(
        isLoading: false,
        products: data.products,
        pagination: data.pagination,
      ),
    );
  }

  Future<void> loadMore(GetProductsParams params) async {
    if (!state.hasMore || state.isLoadingMore) return;
    state = state.copyWith(isLoadingMore: true);
    final nextParams = params.copyWith(page: state.currentPage + 1);
    final result = await _useCase(nextParams);
    result.fold(
      (failure) => state = state.copyWith(isLoadingMore: false, error: failure.message),
      (data) => state = state.copyWith(
        isLoadingMore: false,
        products: [...state.products, ...data.products],
        pagination: data.pagination,
      ),
    );
  }
}

final productsProvider =
    StateNotifierProvider<ProductsNotifier, ProductsState>(
  (ref) => ProductsNotifier(ref.watch(getProductsUseCaseProvider)),
);

// ─── Product detail ────────────────────────────────────────────────────────────

final productDetailProvider = FutureProvider.family<
    ({Product product, List<Product> related}), String>((ref, id) async {
  final repo = ref.watch(productRepositoryProvider);
  final result = await repo.getProductById(id);
  return result.fold(
    (failure) => throw Exception(failure.message),
    (data) => data,
  );
});
