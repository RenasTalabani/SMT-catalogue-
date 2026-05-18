import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/product_provider.dart';
import '../widgets/product_card.dart';
import '../widgets/product_filters_sheet.dart';
import '../../../../shared/widgets/search_bar_widget.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart';
import '../../../../config/themes/app_colors.dart';

class ProductsPage extends ConsumerStatefulWidget {
  const ProductsPage({super.key});

  @override
  ConsumerState<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends ConsumerState<ProductsPage> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadProducts());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _loadProducts() {
    final params = ref.read(productFilterProvider).params;
    ref.read(productsProvider.notifier).fetch(params);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      final params = ref.read(productFilterProvider).params;
      ref.read(productsProvider.notifier).loadMore(params);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filterState = ref.watch(productFilterProvider);
    final productsState = ref.watch(productsProvider);

    // Reload when filter changes
    ref.listen(productFilterProvider, (prev, next) {
      if (prev?.params != next.params) {
        ref.read(productsProvider.notifier).fetch(next.params);
      }
    });

    return Scaffold(
      body: CustomScrollView(
        controller: _scrollController,
        slivers: [
          _buildAppBar(context, filterState),
          _buildSearchAndFilters(filterState),
          SliverToBoxAdapter(
            child: RefreshIndicator(
              onRefresh: () async => _loadProducts(),
              child: const SizedBox.shrink(),
            ),
          ),
          if (productsState.isLoading)
            const SliverFillRemaining(child: LoadingWidget())
          else if (productsState.error != null)
            SliverFillRemaining(
              child: AppErrorWidget(
                message: productsState.error!,
                onRetry: _loadProducts,
              ),
            )
          else if (productsState.products.isEmpty)
            SliverFillRemaining(
              child: RefreshIndicator(
                onRefresh: () async => _loadProducts(),
                child: const SingleChildScrollView(
                  physics: AlwaysScrollableScrollPhysics(),
                  child: SizedBox(height: 400, child: _EmptyProducts()),
                ),
              ),
            )
          else
            _buildProductsList(filterState, productsState),
          if (productsState.isLoadingMore)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
        ],
      ),
    );
  }

  SliverAppBar _buildAppBar(BuildContext context, ProductFilterState filter) {
    return SliverAppBar(
      floating: true,
      snap: true,
      title: const Text(
        'SMT Pro Catalog',
        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20),
      ),
      actions: [
        IconButton(
          icon: Icon(filter.isGridView ? Icons.view_list_rounded : Icons.grid_view_rounded),
          onPressed: () => ref.read(productFilterProvider.notifier).toggleLayout(),
          tooltip: filter.isGridView ? 'List view' : 'Grid view',
        ),
        IconButton(
          icon: const Icon(Icons.tune_rounded),
          onPressed: () => _showFilters(context),
        ),
      ],
    );
  }

  Widget _buildSearchAndFilters(ProductFilterState filter) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        child: SearchBarWidget(
          onChanged: (value) =>
              ref.read(productFilterProvider.notifier).updateSearch(value),
        ),
      ),
    );
  }

  Widget _buildProductsList(ProductFilterState filter, ProductsState state) {
    if (filter.isGridView) {
      return SliverPadding(
        padding: const EdgeInsets.all(16),
        sliver: SliverGrid(
          delegate: SliverChildBuilderDelegate(
            (ctx, index) => ProductCard(
              product: state.products[index],
              isGrid: true,
            ).animate().fadeIn(delay: Duration(milliseconds: index * 40)).slideY(begin: 0.1),
            childCount: state.products.length,
          ),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.72,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (ctx, index) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ProductCard(product: state.products[index], isGrid: false)
                .animate()
                .fadeIn(delay: Duration(milliseconds: index * 30))
                .slideX(begin: -0.05),
          ),
          childCount: state.products.length,
        ),
      ),
    );
  }

  void _showFilters(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ProductFiltersSheet(),
    );
  }
}

class _EmptyProducts extends StatelessWidget {
  const _EmptyProducts();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inventory_2_outlined,
              size: 72, color: AppColors.textSecondaryLight.withAlpha(128)),
          const SizedBox(height: 16),
          Text(
            'No products found',
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(color: AppColors.textSecondaryLight),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your filters',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppColors.textSecondaryLight),
          ),
        ],
      ),
    );
  }
}
