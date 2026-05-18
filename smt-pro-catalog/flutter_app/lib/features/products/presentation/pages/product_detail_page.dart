import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../providers/product_provider.dart';
import '../../../../shared/widgets/image_gallery_widget.dart';
import '../../../../shared/widgets/video_player_widget.dart';
import '../../../../shared/services/favorites_service.dart';
import '../../../../config/themes/app_colors.dart';
import '../../../products/domain/entities/product.dart';
import '../widgets/product_card.dart';

class ProductDetailPage extends ConsumerWidget {
  final String id;
  const ProductDetailPage({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncData = ref.watch(productDetailProvider(id));
    final locale = Localizations.localeOf(context).languageCode;
    final favorites = ref.watch(favoritesProvider);
    final isFav = favorites.contains(id);

    return asyncData.when(
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (err, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Error: $err')),
      ),
      data: (data) {
        final product = data.product;
        final related = data.related;
        final name = product.name.get(locale);
        final description = product.description.get(locale);

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              _buildAppBar(context, ref, product, isFav, name),
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Image gallery
                    if (product.images.isNotEmpty)
                      ImageGalleryWidget(
                        images: product.images.map((i) => i.url).toList(),
                      ).animate().fadeIn(),

                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Category chip
                          if (product.category != null)
                            Chip(
                              label: Text(product.category!.name.get(locale),
                                  style: const TextStyle(fontSize: 12)),
                              visualDensity: VisualDensity.compact,
                              backgroundColor:
                                  AppColors.primary.withAlpha(26),
                              side: BorderSide.none,
                            ),
                          const SizedBox(height: 8),

                          // Name
                          Text(
                            name,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ).animate().fadeIn().slideY(begin: 0.1),

                          const SizedBox(height: 12),

                          // Price row
                          _PriceRow(product: product),

                          const SizedBox(height: 16),

                          // Stock indicator
                          _StockBadge(stock: product.stock),

                          // Tags
                          if (product.tags.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: product.tags
                                  .map((t) => Chip(
                                        label: Text('#$t',
                                            style: const TextStyle(fontSize: 11)),
                                        visualDensity: VisualDensity.compact,
                                        side: BorderSide.none,
                                      ))
                                  .toList(),
                            ),
                          ],

                          // Description
                          if (description.isNotEmpty) ...[
                            const SizedBox(height: 24),
                            Text(
                              'Description',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 8),
                            Text(description,
                                style: Theme.of(context).textTheme.bodyLarge),
                          ],

                          // Video player
                          if (product.video?.hasVideo == true) ...[
                            const SizedBox(height: 24),
                            Text(
                              'Video',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 12),
                            VideoPlayerWidget(url: product.video!.url!),
                          ],

                          // Related products
                          if (related.isNotEmpty) ...[
                            const SizedBox(height: 32),
                            Text(
                              'Related Products',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              height: 240,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: related.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(width: 12),
                                itemBuilder: (ctx, i) => SizedBox(
                                  width: 160,
                                  child: ProductCard(
                                    product: related[i],
                                    isGrid: true,
                                  ),
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  SliverAppBar _buildAppBar(
    BuildContext context,
    WidgetRef ref,
    Product product,
    bool isFav,
    String name,
  ) {
    return SliverAppBar(
      pinned: true,
      title: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded),
        onPressed: () => context.pop(),
      ),
      actions: [
        IconButton(
          icon: Icon(
            isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
            color: isFav ? AppColors.accent : null,
          ),
          onPressed: () =>
              ref.read(favoritesProvider.notifier).toggle(product.id),
        ),
      ],
    );
  }
}

class _PriceRow extends StatelessWidget {
  final Product product;
  const _PriceRow({required this.product});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0.##');
    return Row(
      children: [
        Text(
          '\$${fmt.format(product.price)}',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
              ),
        ),
        if (product.hasDiscount) ...[
          const SizedBox(width: 12),
          Text(
            '\$${fmt.format(product.comparePrice)}',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.grey,
                  decoration: TextDecoration.lineThrough,
                ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.error,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '-${product.discountPercentage.toStringAsFixed(0)}%',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ],
    );
  }
}

class _StockBadge extends StatelessWidget {
  final int stock;
  const _StockBadge({required this.stock});

  @override
  Widget build(BuildContext context) {
    final inStock = stock > 0;
    return Row(
      children: [
        Icon(
          inStock ? Icons.check_circle_rounded : Icons.cancel_rounded,
          size: 16,
          color: inStock ? AppColors.success : AppColors.error,
        ),
        const SizedBox(width: 6),
        Text(
          inStock ? 'In Stock ($stock available)' : 'Out of Stock',
          style: TextStyle(
            color: inStock ? AppColors.success : AppColors.error,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
