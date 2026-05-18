import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../products/models/product_model.dart';
import '../../products/providers/product_provider.dart';
import '../providers/order_provider.dart';

class CreateOrderScreen extends StatefulWidget {
  const CreateOrderScreen({super.key});
  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final List<_CartItem> _cart = [];
  bool _saving = false;

  double get _total => _cart.fold(0, (s, i) => s + i.product.price * i.quantity);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<ProductProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        title: const Text('New Order', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (_cart.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('\$${NumberFormat('#,##0.00').format(_total)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Cart summary
          if (_cart.isNotEmpty) _buildCartSummary(),
          // Product list
          Expanded(
            child: prov.loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: prov.products.length,
                    itemBuilder: (_, i) => _ProductPickerTile(
                      product: prov.products[i],
                      cartItem: _cartItemFor(prov.products[i].id),
                      onAdd:    () => _addToCart(prov.products[i]),
                      onRemove: () => _removeFromCart(prov.products[i].id),
                      onQtyChange: (q) => _setQty(prov.products[i].id, q),
                    ),
                  ),
          ),
          // Place Order button
          if (_cart.isNotEmpty)
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: _saving ? null : _placeOrder,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0EA5E9),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    icon: _saving
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.shopping_cart_checkout_rounded),
                    label: Text(_saving ? 'Placing…' : 'Place Order (${_cart.length} item${_cart.length == 1 ? '' : 's'})',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCartSummary() {
    return Container(
      color: const Color(0xFF0F172A),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _cart.map((item) => Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text('${item.product.name} ×${item.quantity}',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500)),
          )).toList(),
        ),
      ),
    );
  }

  _CartItem? _cartItemFor(int id) => _cart.cast<_CartItem?>().firstWhere((i) => i?.product.id == id, orElse: () => null);

  void _addToCart(ProductModel p) {
    setState(() {
      final existing = _cartItemFor(p.id);
      if (existing != null) {
        existing.quantity++;
      } else {
        _cart.add(_CartItem(product: p, quantity: 1));
      }
    });
  }

  void _removeFromCart(int id) {
    setState(() {
      final existing = _cartItemFor(id);
      if (existing != null) {
        if (existing.quantity > 1) { existing.quantity--; }
        else { _cart.removeWhere((i) => i.product.id == id); }
      }
    });
  }

  void _setQty(int id, int qty) {
    setState(() {
      final existing = _cartItemFor(id);
      if (existing != null) {
        if (qty <= 0) { _cart.removeWhere((i) => i.product.id == id); }
        else { existing.quantity = qty; }
      }
    });
  }

  Future<void> _placeOrder() async {
    setState(() => _saving = true);
    final items = _cart.map((i) => {'productId': i.product.id, 'quantity': i.quantity}).toList();
    final err = await context.read<OrderProvider>().createOrder(items);
    if (!mounted) return;
    setState(() => _saving = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: const Color(0xFFDC2626)));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order placed!'), backgroundColor: Color(0xFF10B981)));
      Navigator.pop(context);
    }
  }
}

class _CartItem {
  final ProductModel product;
  int quantity;
  _CartItem({required this.product, required this.quantity});
}

class _ProductPickerTile extends StatelessWidget {
  final ProductModel product;
  final _CartItem?   cartItem;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final void Function(int) onQtyChange;
  const _ProductPickerTile({required this.product, this.cartItem, required this.onAdd, required this.onRemove, required this.onQtyChange});

  @override
  Widget build(BuildContext context) {
    final fmt   = NumberFormat('#,##0.00');
    final inCart = cartItem != null;
    final qty   = cartItem?.quantity ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: inCart ? Border.all(color: const Color(0xFF0EA5E9), width: 1.5) : null,
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 12)],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.inventory_2_rounded, color: Color(0xFF6366F1), size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF0F172A)),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text('\$${fmt.format(product.price)}  ·  ${product.quantity} in stock',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                ],
              ),
            ),
            if (!inCart)
              IconButton(
                onPressed: product.quantity > 0 ? onAdd : null,
                icon: const Icon(Icons.add_circle_rounded, color: Color(0xFF0EA5E9), size: 28),
              )
            else
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    onPressed: onRemove,
                    icon: const Icon(Icons.remove_circle_rounded, color: Color(0xFFDC2626), size: 24),
                    padding: EdgeInsets.zero, constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 4),
                  SizedBox(
                    width: 36,
                    child: TextFormField(
                      initialValue: '$qty',
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(vertical: 6),
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (v) => onQtyChange(int.tryParse(v) ?? 0),
                    ),
                  ),
                  const SizedBox(width: 4),
                  IconButton(
                    onPressed: () => onQtyChange(qty + 1),
                    icon: const Icon(Icons.add_circle_rounded, color: Color(0xFF0EA5E9), size: 24),
                    padding: EdgeInsets.zero, constraints: const BoxConstraints(),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
