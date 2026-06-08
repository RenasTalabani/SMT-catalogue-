import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/themes/app_colors.dart';
import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../shared/widgets/w_card.dart';

// ── Provider ───────────────────────────────────────────────────────────────────

final _dashProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final res = await ApiClient().get(ApiEndpoints.dashboard);
  return Map<String, dynamic>.from(res.data['data'] as Map);
});

// ── Screen ─────────────────────────────────────────────────────────────────────

class MainDashboardScreen extends ConsumerWidget {
  const MainDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_dashProvider);

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.cardDark,
      onRefresh: () async => ref.invalidate(_dashProvider),
      child: async.when(
        loading: () => const DarkLoader(),
        error:   (e, _) => ErrorState(message: '$e', onRetry: () => ref.invalidate(_dashProvider)),
        data:    (d) => _DashBody(data: d),
      ),
    );
  }
}

// ── Body ───────────────────────────────────────────────────────────────────────

class _DashBody extends StatelessWidget {
  final Map<String, dynamic> data;
  const _DashBody({required this.data});

  String _money(dynamic v) {
    final n = (v ?? 0.0) as num;
    if (n >= 1000000) return '\$${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000)    return '\$${(n / 1000).toStringAsFixed(1)}K';
    return '\$${n.toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context) {
    final recentOrders  = (data['recentOrders']  as List?) ?? [];
    final lowStockItems = (data['lowStockItems']  as List?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [

        // ── KPI grid (matches web 2×2 card grid) ─────────────────────────
        GridView.count(
          crossAxisCount:   2,
          shrinkWrap:       true,
          physics:          const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing:  12,
          childAspectRatio: 1.45,
          children: [
            _KpiCard(
              label:      'TOTAL PRODUCTS',
              value:      '${data['totalProducts'] ?? 0}',
              icon:       Icons.inventory_2_rounded,
              iconGrad:   [const Color(0xFF6C63FF), const Color(0xFF4A42D4)],
              valueColor: AppColors.primary,
              glow:       true,
            ),
            _KpiCard(
              label:      'TOTAL ORDERS',
              value:      '${data['totalOrders'] ?? 0}',
              icon:       Icons.shopping_cart_rounded,
              iconGrad:   [const Color(0xFF00C9A7), const Color(0xFF00917A)],
              valueColor: const Color(0xFF00C9A7),
            ),
            _KpiCard(
              label:      'REVENUE (MONTH)',
              value:      _money(data['totalRevenue']),
              icon:       Icons.trending_up_rounded,
              iconGrad:   [const Color(0xFF6C63FF), const Color(0xFF4A42D4)],
              valueColor: AppColors.primary,
            ),
            _KpiCard(
              label:      'LOW STOCK ALERTS',
              value:      '${data['lowStockCount'] ?? 0}',
              icon:       Icons.warning_amber_rounded,
              iconColor:  AppColors.warning,
              valueColor: AppColors.warning,
            ),
          ],
        ),
        const SizedBox(height: 16),

        // ── Recent Orders card ────────────────────────────────────────────
        Container(
          decoration: BoxDecoration(
            color:        AppColors.cardDark,
            borderRadius: BorderRadius.circular(16),
            border:       Border.all(color: AppColors.borderDark),
          ),
          child: Column(children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppColors.borderDark)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Recent Orders',
                      style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                  Row(children: [
                    Container(width: 6, height: 6,
                        decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle)),
                    const SizedBox(width: 5),
                    const Text('Auto-refreshing',
                        style: TextStyle(color: AppColors.success, fontSize: 11)),
                  ]),
                ],
              ),
            ),
            // Rows
            if (recentOrders.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 28),
                child: Text('No orders yet', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              )
            else
              for (final o in recentOrders)
                _OrderRow(order: Map<String, dynamic>.from(o as Map)),
          ]),
        ),
        const SizedBox(height: 16),

        // ── Low Stock card ────────────────────────────────────────────────
        Container(
          decoration: BoxDecoration(
            color:        AppColors.cardDark,
            borderRadius: BorderRadius.circular(16),
            border:       Border.all(color: AppColors.borderDark),
          ),
          child: Column(children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppColors.borderDark)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(children: [
                    const Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.warning),
                    const SizedBox(width: 6),
                    const Text('Low Stock',
                        style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                  ]),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: lowStockItems.isEmpty
                          ? AppColors.success.withAlpha(40)
                          : AppColors.warning.withAlpha(40),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      lowStockItems.isEmpty
                          ? 'All good'
                          : '${lowStockItems.length} alert${lowStockItems.length != 1 ? 's' : ''}',
                      style: TextStyle(
                        color: lowStockItems.isEmpty ? AppColors.success : AppColors.warning,
                        fontSize: 11, fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Rows
            if (lowStockItems.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 28),
                child: Column(children: [
                  Icon(Icons.inventory_2_rounded, size: 28, color: AppColors.success),
                  SizedBox(height: 8),
                  Text('All products well-stocked',
                      style: TextStyle(color: AppColors.success, fontSize: 13)),
                ]),
              )
            else
              for (final item in lowStockItems)
                _LowStockRow(item: Map<String, dynamic>.from(item as Map)),
          ]),
        ),
        const SizedBox(height: 16),

        // ── Quick nav to Products ─────────────────────────────────────────
        GestureDetector(
          onTap: () => context.go('/products'),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color:        AppColors.primary.withAlpha(15),
              borderRadius: BorderRadius.circular(16),
              border:       Border.all(color: AppColors.primary.withAlpha(60)),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.inventory_2_rounded, color: AppColors.primary, size: 18),
                SizedBox(width: 8),
                Text('View All Products →',
                    style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 14)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

class _KpiCard extends StatelessWidget {
  final String     label;
  final String     value;
  final IconData   icon;
  final List<Color>? iconGrad;
  final Color?     iconColor;
  final Color      valueColor;
  final bool       glow;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    this.iconGrad,
    this.iconColor,
    required this.valueColor,
    this.glow = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color:        AppColors.cardDark,
        borderRadius: BorderRadius.circular(16),
        border:       Border.all(color: AppColors.borderDark),
        boxShadow: glow
            ? [BoxShadow(color: AppColors.primary.withAlpha(70), blurRadius: 16, spreadRadius: 0)]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 10,
                    fontWeight: FontWeight.w600, letterSpacing: 0.8,
                  ),
                ),
              ),
              Container(
                width: 38, height: 38,
                decoration: BoxDecoration(
                  gradient: iconGrad != null
                      ? LinearGradient(colors: iconGrad!, begin: Alignment.topLeft, end: Alignment.bottomRight)
                      : null,
                  color: iconGrad == null
                      ? (iconColor ?? AppColors.primary).withAlpha(30)
                      : null,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: glow && iconGrad != null
                      ? [BoxShadow(color: AppColors.primary.withAlpha(90), blurRadius: 12)]
                      : null,
                ),
                child: Icon(icon,
                  size:  18,
                  color: iconGrad != null ? Colors.white : (iconColor ?? AppColors.primary),
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(color: valueColor, fontSize: 28, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

// ── Order Row ──────────────────────────────────────────────────────────────────

class _OrderRow extends StatelessWidget {
  final Map<String, dynamic> order;
  const _OrderRow({required this.order});

  Color _statusColor(String s) {
    switch (s) {
      case 'COMPLETED':  return AppColors.success;
      case 'CANCELLED':  return AppColors.danger;
      case 'PROCESSING': return AppColors.info;
      default:           return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = '${order['status'] ?? 'PENDING'}';
    final color  = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.borderDark)),
      ),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Order #${order['id']}',
              style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 13)),
          Text(
            order['createdAt'] != null
                ? _formatDate(order['createdAt'] as String)
                : '',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
          ),
        ])),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: color.withAlpha(35),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(status, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 10),
          Text('\$${order['finalAmount'] ?? 0}',
              style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 13)),
        ]),
      ]),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) { return ''; }
  }
}

// ── Low Stock Row ──────────────────────────────────────────────────────────────

class _LowStockRow extends StatelessWidget {
  final Map<String, dynamic> item;
  const _LowStockRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final qty    = (item['quantity'] as int?) ?? 0;
    final isOut  = qty == 0;
    final color  = isOut ? AppColors.danger : AppColors.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.borderDark)),
      ),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${item['name']}',
              style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 13),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          if (item['sku'] != null)
            Text('${item['sku']}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: color.withAlpha(40),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            isOut ? 'Out of stock' : '$qty left',
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
          ),
        ),
      ]),
    );
  }
}
