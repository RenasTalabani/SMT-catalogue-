import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/order_model.dart';
import '../providers/order_provider.dart';
import 'create_order_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final isAdmin = auth.user?.role == 'admin' || auth.user?.role == 'manager' || auth.user?.role == 'employee';
      context.read<OrderProvider>().load(adminView: isAdmin);
    });
  }

  static const _filters = ['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'];

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<OrderProvider>();
    final auth = context.watch<AuthProvider>();
    final canManage = ['admin','manager','employee'].contains(auth.user?.role);

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      body: CustomScrollView(
        slivers: [
          _buildAppBar(prov, canManage),
          SliverToBoxAdapter(child: _buildFilters(prov)),
          if (prov.loading)
            const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
          else if (prov.error != null)
            SliverFillRemaining(child: _buildError(prov, canManage))
          else if (prov.orders.isEmpty)
            SliverFillRemaining(child: _buildEmpty())
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, i) => Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: _OrderCard(order: prov.orders[i], canManage: canManage,
                        onStatusChange: (status) => _changeStatus(prov.orders[i].id, status, prov)),
                  ),
                  childCount: prov.orders.length,
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          final prov2 = context.read<OrderProvider>();
          final auth2 = context.read<AuthProvider>();
          Navigator.push(context,
            MaterialPageRoute(builder: (_) => const CreateOrderScreen()),
          ).then((_) {
            if (mounted) {
              final isAdmin = ['admin','manager','employee'].contains(auth2.user?.role);
              prov2.load(adminView: isAdmin);
            }
          });
        },
        backgroundColor: const Color(0xFF0EA5E9),
        icon: const Icon(Icons.add_shopping_cart_rounded, color: Colors.white),
        label: const Text('New Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  SliverAppBar _buildAppBar(OrderProvider prov, bool canManage) {
    return SliverAppBar(
      pinned: true,
      backgroundColor: const Color(0xFF0F172A),
      title: const Text('Orders', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
          onPressed: () {
            final auth = context.read<AuthProvider>();
            prov.load(adminView: ['admin','manager','employee'].contains(auth.user?.role));
          },
        ),
      ],
    );
  }

  Widget _buildFilters(OrderProvider prov) {
    return Container(
      color: const Color(0xFF0F172A),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _filters.map((f) {
            final selected = prov.filter == f;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => prov.setFilter(f),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: selected ? Colors.white : Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(f,
                    style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.bold,
                      color: selected ? _statusColor(f) : Colors.white70,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Future<void> _changeStatus(int id, String status, OrderProvider prov) async {
    final err = await prov.updateStatus(id, status);
    if (err != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: const Color(0xFFDC2626)));
    }
  }

  Widget _buildEmpty() => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: const Color(0xFF0EA5E9).withValues(alpha: 0.08), shape: BoxShape.circle),
        child: const Icon(Icons.shopping_bag_outlined, size: 52, color: Color(0xFF0EA5E9)),
      ),
      const SizedBox(height: 16),
      const Text('No orders yet', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
      const SizedBox(height: 6),
      const Text('Tap + New Order to create one', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
    ]),
  );

  Widget _buildError(OrderProvider prov, bool canManage) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.cloud_off_rounded, size: 52, color: Color(0xFFCBD5E1)),
      const SizedBox(height: 12),
      Text(prov.error!, style: const TextStyle(color: Color(0xFF64748B))),
      const SizedBox(height: 16),
      ElevatedButton(onPressed: () => prov.load(adminView: canManage), child: const Text('Retry')),
    ]),
  );

  Color _statusColor(String s) {
    switch (s) {
      case 'PENDING':   return const Color(0xFFD97706);
      case 'COMPLETED': return const Color(0xFF10B981);
      case 'CANCELLED': return const Color(0xFFDC2626);
      default:          return const Color(0xFF6366F1);
    }
  }
}

// ─── Order Card ───────────────────────────────────────────────────────────────

class _OrderCard extends StatelessWidget {
  final OrderModel   order;
  final bool         canManage;
  final void Function(String) onStatusChange;
  const _OrderCard({required this.order, required this.canManage, required this.onStatusChange});

  Color get _color {
    switch (order.status) {
      case 'PENDING':   return const Color(0xFFD97706);
      case 'COMPLETED': return const Color(0xFF10B981);
      case 'CANCELLED': return const Color(0xFFDC2626);
      default:          return const Color(0xFF6366F1);
    }
  }

  IconData get _icon {
    switch (order.status) {
      case 'PENDING':   return Icons.hourglass_top_rounded;
      case 'COMPLETED': return Icons.check_circle_rounded;
      case 'CANCELLED': return Icons.cancel_rounded;
      default:          return Icons.shopping_bag_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt     = NumberFormat('#,##0.00');
    final dateFmt = DateFormat('d MMM yyyy · HH:mm');

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 16)],
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: _color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(_icon, color: _color, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Text('Order #${order.id}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: _color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(order.status,
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _color)),
                        ),
                      ]),
                      const SizedBox(height: 3),
                      Text(dateFmt.format(order.createdAt),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ],
                  ),
                ),
                Text('\$${fmt.format(order.totalAmount)}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              ],
            ),
          ),
          // Items
          if (order.items.isNotEmpty) ...[
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
              child: Column(
                children: order.items.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Container(width: 6, height: 6,
                          decoration: const BoxDecoration(color: Color(0xFF94A3B8), shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(item.productName,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF374151)))),
                      Text('×${item.quantity}  \$${NumberFormat('#,##0.00').format(item.price * item.quantity)}',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    ],
                  ),
                )).toList(),
              ),
            ),
          ],
          // Actions (admin/manager/employee)
          if (canManage && order.status == 'PENDING') ...[
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => onStatusChange('CANCELLED'),
                      icon: const Icon(Icons.close_rounded, size: 16),
                      label: const Text('Cancel'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFDC2626),
                        side: const BorderSide(color: Color(0xFFDC2626)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => onStatusChange('COMPLETED'),
                      icon: const Icon(Icons.check_rounded, size: 16),
                      label: const Text('Complete'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
