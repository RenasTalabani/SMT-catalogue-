import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../config/themes/app_colors.dart';
import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../features/auth/providers/auth_riverpod.dart';
import '../../../shared/widgets/w_card.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final _productSearchProvider = StateProvider.autoDispose<String>((_) => '');
final _productPageProvider   = StateProvider.autoDispose<int>((_) => 1);

final productsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final search = ref.watch(_productSearchProvider);
  final page   = ref.watch(_productPageProvider);
  final res    = await ApiClient().get(
    '${ApiEndpoints.products}?page=$page&limit=20${search.isNotEmpty ? '&search=${Uri.encodeComponent(search)}' : ''}',
  );
  return Map<String, dynamic>.from(res.data['data'] as Map);
});

// ── Screen ────────────────────────────────────────────────────────────────────

class ProductsScreenV2 extends ConsumerStatefulWidget {
  const ProductsScreenV2({super.key});
  @override
  ConsumerState<ProductsScreenV2> createState() => _State();
}

class _State extends ConsumerState<ProductsScreenV2> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final async   = ref.watch(productsProvider);
    final page    = ref.watch(_productPageProvider);
    final isGuest = !ref.watch(authProvider).isLoggedIn;

    return Column(children: [

      // ── Toolbar: search + count + Add button ───────────────────────────
      Container(
        color: AppColors.surfaceDark,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: _searchCtrl,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search products…',
                prefixIcon: const Icon(Icons.search_rounded, size: 18, color: AppColors.textMuted),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 16, color: AppColors.textMuted),
                        onPressed: () {
                          _searchCtrl.clear();
                          ref.read(_productSearchProvider.notifier).state = '';
                          ref.read(_productPageProvider.notifier).state = 1;
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onChanged: (v) {
                ref.read(_productSearchProvider.notifier).state = v;
                ref.read(_productPageProvider.notifier).state = 1;
              },
            ),
          ),
          if (!isGuest) ...[
            const SizedBox(width: 10),
            ElevatedButton.icon(
              onPressed: () => context.push('/products/add'),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text('Add', style: TextStyle(fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              ),
            ),
          ],
        ]),
      ),

      // ── Product list ───────────────────────────────────────────────────
      Expanded(
        child: async.when(
          loading: () => const DarkLoader(),
          error:   (e, _) => ErrorState(message: '$e', onRetry: () => ref.invalidate(productsProvider)),
          data: (data) {
            final products  = (data['products'] as List?) ?? [];
            final total     = (data['total'] as int?) ?? products.length;
            final totalPages = ((total / 20).ceil()).clamp(1, 9999);

            if (products.isEmpty) {
              return const EmptyState(icon: Icons.inventory_2_rounded, message: 'No products found');
            }

            return RefreshIndicator(
              color:           AppColors.primary,
              backgroundColor: AppColors.cardDark,
              onRefresh:       () async => ref.invalidate(productsProvider),
              child: ListView.separated(
                padding:          const EdgeInsets.fromLTRB(16, 12, 16, 100),
                itemCount:        products.length + 1,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder:      (ctx, i) {
                  if (i == products.length) {
                    return _Pagination(page: page, totalPages: totalPages, ref: ref);
                  }
                  final p = Map<String, dynamic>.from(products[i] as Map);
                  return _ProductRow(product: p, isGuest: isGuest);
                },
              ),
            );
          },
        ),
      ),
    ]);
  }
}

// ── Product row — matches web table row ───────────────────────────────────────

class _ProductRow extends ConsumerWidget {
  final Map<String, dynamic> product;
  final bool isGuest;
  const _ProductRow({required this.product, required this.isGuest});

  Color _stockColor(int qty) {
    if (qty == 0) return AppColors.danger;
    if (qty <= 5) return AppColors.warning;
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name      = '${product['name'] ?? ''}';
    final desc      = '${product['description'] ?? ''}';
    final category  = '${product['category'] ?? ''}';
    final sku       = '${product['sku'] ?? ''}';
    final price     = product['price'] ?? 0;
    final qty       = (product['quantity'] as int?) ?? 0;
    final isActive  = (product['isActive'] as bool?) ?? true;
    final imageUrl  = product['imageUrl'] as String?;
    final initial   = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final stockColor = _stockColor(qty);

    return WCard(
      onTap: () => context.push('/products/${product['id']}'),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

          // ── Row 1: image + name/desc + price ──────────────────────────
          Row(children: [
            // Image with gradient fallback (like web)
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: 48, height: 48,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF6C63FF), Color(0xFF4A42D4)],
                    begin: Alignment.topLeft,
                    end:   Alignment.bottomRight,
                  ),
                ),
                child: imageUrl != null && imageUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl:    imageUrl,
                        fit:         BoxFit.cover,
                        errorWidget: (_, __, ___) => Center(
                          child: Text(initial,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                        ),
                      )
                    : Center(
                        child: Text(initial,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                      ),
              ),
            ),
            const SizedBox(width: 12),

            // Name + description
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name,
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              if (desc.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(desc,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
            ])),

            const SizedBox(width: 12),
            // Price (right-aligned like web)
            Text('\$$price',
                style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
          ]),
          const SizedBox(height: 10),

          // ── Row 2: category + SKU ──────────────────────────────────────
          Row(children: [
            if (category.isNotEmpty) ...[
              _Pill(category, color: AppColors.primary),
              const SizedBox(width: 6),
            ],
            if (sku.isNotEmpty)
              _SkuChip(sku),
          ]),
          const SizedBox(height: 10),

          // ── Row 3: stock + status + actions ───────────────────────────
          Row(children: [
            // Stock
            _Pill(
              qty == 0 ? 'Out of stock' : '$qty in stock',
              color: stockColor,
            ),
            const SizedBox(width: 6),
            // Active / Inactive
            _Pill(
              isActive ? 'Active' : 'Inactive',
              color: isActive ? AppColors.success : AppColors.danger,
            ),
            const Spacer(),
            // Action buttons — right side
            if (!isGuest) ...[
              // Sell
              SizedBox(
                height: 30,
                child: ElevatedButton.icon(
                  onPressed: () => _showSell(context, ref),
                  icon: const Icon(Icons.shopping_cart_rounded, size: 13),
                  label: const Text('Sell', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              // Edit
              _IconBtn(
                icon:    Icons.edit_rounded,
                color:   AppColors.primary,
                onTap:   () => context.push('/products/${product['id']}/edit'),
              ),
              const SizedBox(width: 4),
              // Delete
              _IconBtn(
                icon:  Icons.delete_outline_rounded,
                color: AppColors.danger,
                onTap: () => _confirmDelete(context, ref),
              ),
            ] else ...[
              // Guest: Sign In button instead of Sell
              SizedBox(
                height: 30,
                child: OutlinedButton.icon(
                  onPressed: () => context.go('/login'),
                  icon: const Icon(Icons.login_rounded, size: 13),
                  label: const Text('Sign In', style: TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
            ],
          ]),
        ]),
      ),
    );
  }

  void _showSell(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context:       context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _SellSheet(product: product, ref: ref),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref) {
    showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Product'),
        content: Text('Delete "${product['name']}"? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(context);
              try {
                await ApiClient().delete('${ApiEndpoints.products}/${product['id']}');
                ref.invalidate(productsProvider);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                }
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

// ── Sell sheet ────────────────────────────────────────────────────────────────

class _SellSheet extends StatefulWidget {
  final Map<String, dynamic> product;
  final WidgetRef ref;
  const _SellSheet({required this.product, required this.ref});

  @override
  State<_SellSheet> createState() => _SellSheetState();
}

class _SellSheetState extends State<_SellSheet> {
  int  _qty      = 1;
  bool _loading  = false;

  double get _price => (widget.product['price'] as num? ?? 0).toDouble();
  int    get _stock => (widget.product['quantity'] as int?)  ?? 0;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        // Handle
        Container(
          width: 36, height: 4,
          decoration: BoxDecoration(color: AppColors.borderDark, borderRadius: BorderRadius.circular(2)),
        ),
        const SizedBox(height: 20),
        // Title
        Text('Sell ${widget.product['name']}',
            style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 16)),
        const SizedBox(height: 6),
        Text('$_stock in stock',
            style: TextStyle(color: _stock == 0 ? AppColors.danger : AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 24),
        // Qty picker
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          _QtyBtn(Icons.remove_rounded,
              onTap: _qty > 1 ? () => setState(() => _qty--) : null),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text('$_qty',
                style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 26)),
          ),
          _QtyBtn(Icons.add_rounded,
              onTap: _qty < _stock ? () => setState(() => _qty++) : null),
        ]),
        const SizedBox(height: 16),
        Text(
          'Total: \$${(_price * _qty).toStringAsFixed(2)}',
          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 18),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: (_loading || _stock == 0) ? null : _sell,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _loading
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text('Confirm Sale · \$${(_price * _qty).toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Colors.white)),
          ),
        ),
      ]),
    );
  }

  Future<void> _sell() async {
    setState(() => _loading = true);
    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context).pop();
    try {
      await ApiClient().post(ApiEndpoints.orders, data: {
        'items': [{'productId': widget.product['id'], 'quantity': _qty}],
      });
      widget.ref.invalidate(productsProvider);
      messenger.showSnackBar(const SnackBar(
        content: Text('Sale recorded!'),
        backgroundColor: AppColors.success,
      ));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  const _QtyBtn(this.icon, {this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 100),
      width: 40, height: 40,
      decoration: BoxDecoration(
        color:        onTap != null ? AppColors.primary.withAlpha(25) : AppColors.borderDark,
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: onTap != null ? AppColors.primary.withAlpha(80) : AppColors.borderDark),
      ),
      child: Icon(icon,
          size:  18,
          color: onTap != null ? AppColors.primary : AppColors.textMuted),
    ),
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

class _Pill extends StatelessWidget {
  final String label;
  final Color  color;
  const _Pill(this.label, {required this.color});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withAlpha(35), borderRadius: BorderRadius.circular(20)),
    child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
  );
}

class _SkuChip extends StatelessWidget {
  final String sku;
  const _SkuChip(this.sku);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color:        AppColors.borderDark,
      borderRadius: BorderRadius.circular(6),
    ),
    child: Text(sku,
        style: const TextStyle(
          color:        AppColors.textSecondary,
          fontSize:     10,
          fontFamily:   'monospace',
          fontWeight:   FontWeight.w600,
          letterSpacing: 0.5,
        )),
  );
}

class _IconBtn extends StatelessWidget {
  final IconData      icon;
  final Color         color;
  final VoidCallback  onTap;
  const _IconBtn({required this.icon, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 30, height: 30,
      decoration: BoxDecoration(
        color:        color.withAlpha(25),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, size: 15, color: color),
    ),
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

class _Pagination extends StatelessWidget {
  final int page, totalPages;
  final WidgetRef ref;
  const _Pagination({required this.page, required this.totalPages, required this.ref});

  @override
  Widget build(BuildContext context) {
    if (totalPages <= 1) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        OutlinedButton(
          onPressed: page > 1 ? () => ref.read(_productPageProvider.notifier).state = page - 1 : null,
          child: const Text('← Prev'),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text('$page / $totalPages', style: const TextStyle(color: AppColors.textSecondary)),
        ),
        OutlinedButton(
          onPressed: page < totalPages ? () => ref.read(_productPageProvider.notifier).state = page + 1 : null,
          child: const Text('Next →'),
        ),
      ]),
    );
  }
}
