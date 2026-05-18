import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../shared/services/favorites_service.dart';
import '../../../../config/themes/app_colors.dart';
import '../../../products/presentation/providers/product_provider.dart';
import '../../../products/presentation/widgets/product_card.dart';

class FavoritesPage extends ConsumerWidget {
  const FavoritesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favoriteIds = ref.watch(favoritesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Favorites', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          if (favoriteIds.isNotEmpty)
            TextButton(
              onPressed: () => ref.read(favoritesProvider.notifier).clearAll(),
              child: const Text('Clear All',
                  style: TextStyle(color: AppColors.error)),
            ),
        ],
      ),
      body: favoriteIds.isEmpty
          ? const _EmptyFavorites()
          : _FavoritesList(ids: favoriteIds),
    );
  }
}

class _EmptyFavorites extends StatelessWidget {
  const _EmptyFavorites();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.favorite_border_rounded,
            size: 80,
            color: AppColors.textSecondaryLight.withAlpha(102),
          ).animate().scale(begin: const Offset(0.5, 0.5)).fadeIn(),
          const SizedBox(height: 20),
          Text(
            'No favorites yet',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondaryLight,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tap the heart icon on any product to save it here',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _FavoritesList extends ConsumerWidget {
  final Set<String> ids;
  const _FavoritesList({required this.ids});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Fetch products by IDs from the already-loaded list
    final productsState = ref.watch(productsProvider);
    final favProducts = productsState.products
        .where((p) => ids.contains(p.id))
        .toList();

    // If not loaded from state, show IDs count
    if (favProducts.isEmpty && ids.isNotEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.favorite_rounded,
                size: 48, color: AppColors.accent),
            const SizedBox(height: 16),
            Text(
              '${ids.length} item(s) in favorites',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            const Text('Browse products to see them here'),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.72,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: favProducts.length,
      itemBuilder: (ctx, i) => ProductCard(
        product: favProducts[i],
        isGrid: true,
      ).animate().fadeIn(delay: Duration(milliseconds: i * 50)),
    );
  }
}
