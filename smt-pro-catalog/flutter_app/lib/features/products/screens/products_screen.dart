import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/product_provider.dart';
import '../models/product_model.dart';
import 'add_edit_product_screen.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});
  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().load();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<ProductProvider>();
    final auth = context.watch<AuthProvider>();
    final canEdit = auth.user?.role == 'admin' || auth.user?.role == 'employee';

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      body: CustomScrollView(
        slivers: [
          _buildAppBar(prov, canEdit),
          SliverToBoxAdapter(child: _buildSearchBar(prov)),
          if (prov.category.isNotEmpty)
            SliverToBoxAdapter(child: _buildActiveFilter(prov)),
          if (prov.loading)
            const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
          else if (prov.error != null)
            SliverFillRemaining(child: _buildError(prov))
          else if (prov.products.isEmpty)
            SliverFillRemaining(child: _buildEmpty())
          else ...[
            SliverToBoxAdapter(child: _buildCountBar(prov)),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, i) => Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: _ProductCard(
                      product: prov.products[i],
                      canEdit: canEdit,
                      onEdit: () => _openEdit(prov.products[i]),
                      onDelete: () => _confirmDelete(prov.products[i]),
                    ),
                  ),
                  childCount: prov.products.length,
                ),
              ),
            ),
          ],
        ],
      ),
      floatingActionButton: canEdit
          ? FloatingActionButton.extended(
              onPressed: _openAdd,
              backgroundColor: const Color(0xFF6366F1),
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: const Text('Add Product', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }

  SliverAppBar _buildAppBar(ProductProvider prov, bool canEdit) {
    return SliverAppBar(
      pinned: true,
      backgroundColor: const Color(0xFF0F172A),
      title: const Text('Products', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      actions: [
        if (prov.categories.isNotEmpty)
          IconButton(
            icon: const Icon(Icons.filter_list_rounded, color: Colors.white70),
            onPressed: () => _showCategoryFilter(prov),
          ),
        IconButton(
          icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
          onPressed: () { _searchCtrl.clear(); prov.clearFilters(); },
        ),
      ],
    );
  }

  Widget _buildSearchBar(ProductProvider prov) {
    return Container(
      color: const Color(0xFF0F172A),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: TextField(
        controller: _searchCtrl,
        onChanged: (v) => prov.setSearch(v),
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          hintText: 'Search products…',
          hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
          prefixIcon: Icon(Icons.search_rounded, color: Colors.white.withValues(alpha: 0.5)),
          suffixIcon: _searchCtrl.text.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.clear_rounded, color: Colors.white.withValues(alpha: 0.5)),
                  onPressed: () { _searchCtrl.clear(); prov.setSearch(''); },
                )
              : null,
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.1),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
        ),
      ),
    );
  }

  Widget _buildActiveFilter(ProductProvider prov) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.label_rounded, size: 14, color: Color(0xFF6366F1)),
                const SizedBox(width: 6),
                Text(prov.category,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF6366F1), fontWeight: FontWeight.w600)),
                const SizedBox(width: 6),
                GestureDetector(
                  onTap: () => prov.setCategory(''),
                  child: const Icon(Icons.close_rounded, size: 14, color: Color(0xFF6366F1)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCountBar(ProductProvider prov) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Text(
        '${prov.products.length} product${prov.products.length == 1 ? '' : 's'}',
        style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.inventory_2_rounded, size: 52, color: Color(0xFF6366F1)),
          ),
          const SizedBox(height: 16),
          const Text('No products found',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 6),
          const Text('Add your first product using the button below',
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
        ],
      ),
    );
  }

  Widget _buildError(ProductProvider prov) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_rounded, size: 52, color: Color(0xFFCBD5E1)),
          const SizedBox(height: 12),
          Text(prov.error!, style: const TextStyle(color: Color(0xFF64748B))),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: prov.load, child: const Text('Retry')),
        ],
      ),
    );
  }

  void _showCategoryFilter(ProductProvider prov) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(2))),
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text('Filter by Category', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          ListTile(
            title: const Text('All Categories'),
            trailing: prov.category.isEmpty ? const Icon(Icons.check_rounded, color: Color(0xFF6366F1)) : null,
            onTap: () { prov.setCategory(''); Navigator.pop(context); },
          ),
          ...prov.categories.map((cat) => ListTile(
            title: Text(cat),
            trailing: prov.category == cat ? const Icon(Icons.check_rounded, color: Color(0xFF6366F1)) : null,
            onTap: () { prov.setCategory(cat); Navigator.pop(context); },
          )),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  void _openAdd() {
    final prov = context.read<ProductProvider>();
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AddEditProductScreen()),
    ).then((_) { if (mounted) prov.load(); });
  }

  void _openEdit(ProductModel product) {
    final prov = context.read<ProductProvider>();
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => AddEditProductScreen(product: product)),
    ).then((_) { if (mounted) prov.load(); });
  }

  Future<void> _confirmDelete(ProductModel product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Product'),
        content: Text('Delete "${product.name}"? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      final err = await context.read<ProductProvider>().deleteProduct(product.id);
      if (err != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
      }
    }
  }
}

// ─── Product Card ─────────────────────────────────────────────────────────────

class _ProductCard extends StatelessWidget {
  final ProductModel product;
  final bool         canEdit;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _ProductCard({required this.product, required this.canEdit, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final fmt   = NumberFormat('#,##0.00');
    final stock = product.quantity;
    final stockColor = stock == 0
        ? const Color(0xFFDC2626)
        : stock <= 5
            ? const Color(0xFFD97706)
            : const Color(0xFF10B981);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 16)],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            // Avatar / image
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: product.imageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.network(product.imageUrl!, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(Icons.inventory_2_rounded, color: Color(0xFF6366F1))),
                    )
                  : const Icon(Icons.inventory_2_rounded, color: Color(0xFF6366F1), size: 26),
            ),
            const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(product.category,
                            style: const TextStyle(fontSize: 10, color: Color(0xFF6366F1), fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: stockColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          stock == 0 ? 'Out of stock' : '$stock in stock',
                          style: TextStyle(fontSize: 10, color: stockColor, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('\$${fmt.format(product.price)}',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                ],
              ),
            ),
            // Actions
            if (canEdit)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit_rounded, size: 18, color: Color(0xFF6366F1)),
                    onPressed: onEdit,
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.08),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFDC2626)),
                    onPressed: onDelete,
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626).withValues(alpha: 0.08),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
