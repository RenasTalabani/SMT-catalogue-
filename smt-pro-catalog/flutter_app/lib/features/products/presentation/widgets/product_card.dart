import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../domain/entities/product.dart';
import '../../../../config/routes/app_router.dart';
import '../../../../config/themes/app_colors.dart';
import '../../../../shared/services/favorites_service.dart';

class ProductCard extends ConsumerWidget {
  final Product product;
  final bool isGrid;

  const ProductCard({super.key, required this.product, this.isGrid = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = Localizations.localeOf(context).languageCode;
    final isFav = ref.watch(favoritesProvider).contains(product.id);
    final theme = Theme.of(context);
    final name = product.name.get(locale);
    final imageUrl = product.primaryImage;

    if (isGrid) return _GridCard(product: product, name: name, imageUrl: imageUrl, isFav: isFav, ref: ref);
    return _ListCard(product: product, name: name, imageUrl: imageUrl, isFav: isFav, ref: ref, theme: theme);
  }
}

class _GridCard extends StatelessWidget {
  final Product product;
  final String name;
  final String? imageUrl;
  final bool isFav;
  final WidgetRef ref;

  const _GridCard({
    required this.product,
    required this.name,
    required this.imageUrl,
    required this.isFav,
    required this.ref,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push(AppRoutes.productDetailPath(product.id)),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _ProductImage(url: imageUrl),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: _FavButton(
                        productId: product.id, isFav: isFav, ref: ref),
                  ),
                  if (product.isFeatured)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Featured',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                  if (product.hasDiscount)
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.error,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          '-${product.discountPercentage.toStringAsFixed(0)}%',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\$${product.price.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ListCard extends StatelessWidget {
  final Product product;
  final String name;
  final String? imageUrl;
  final bool isFav;
  final WidgetRef ref;
  final ThemeData theme;

  const _ListCard({
    required this.product,
    required this.name,
    required this.imageUrl,
    required this.isFav,
    required this.ref,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).languageCode;
    return GestureDetector(
      onTap: () => context.push(AppRoutes.productDetailPath(product.id)),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            SizedBox(
              width: 120,
              height: 120,
              child: _ProductImage(url: imageUrl),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (product.category != null)
                      Text(
                        product.category!.name.get(locale),
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textSecondaryLight),
                      ),
                    const SizedBox(height: 4),
                    Text(name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          '\$${product.price.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                        const Spacer(),
                        _FavButton(
                            productId: product.id, isFav: isFav, ref: ref),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (!product.isInStock)
                      const Text('Out of Stock',
                          style: TextStyle(
                              color: AppColors.error, fontSize: 12)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductImage extends StatelessWidget {
  final String? url;
  const _ProductImage({this.url});

  @override
  Widget build(BuildContext context) {
    if (url == null) {
      return Container(
        color: Colors.grey[200],
        child: const Icon(Icons.image_not_supported_outlined,
            color: Colors.grey, size: 40),
      );
    }
    return CachedNetworkImage(
      imageUrl: url!,
      fit: BoxFit.cover,
      placeholder: (_, __) => Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: Container(color: Colors.white),
      ),
      errorWidget: (_, __, ___) => Container(
        color: Colors.grey[200],
        child: const Icon(Icons.broken_image_outlined, color: Colors.grey),
      ),
    );
  }
}

class _FavButton extends StatelessWidget {
  final String productId;
  final bool isFav;
  final WidgetRef ref;

  const _FavButton(
      {required this.productId, required this.isFav, required this.ref});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => ref.read(favoritesProvider.notifier).toggle(productId),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: Colors.white.withAlpha(230),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
                color: Colors.black.withAlpha(25),
                blurRadius: 4,
                offset: const Offset(0, 2))
          ],
        ),
        child: Icon(
          isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          size: 18,
          color: isFav ? AppColors.accent : Colors.grey,
        ),
      ),
    );
  }
}
