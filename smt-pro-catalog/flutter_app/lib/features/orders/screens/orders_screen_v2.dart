import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../config/themes/app_colors.dart';
import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../shared/widgets/w_card.dart';

final _orderStatusFilter = StateProvider.autoDispose<String>((_) => '');
final _orderPageProvider  = StateProvider.autoDispose<int>((_) => 1);

final ordersProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final status = ref.watch(_orderStatusFilter);
  final page   = ref.watch(_orderPageProvider);
  final client = ApiClient();
  final res = await client.get(
    '${ApiEndpoints.orders}?page=$page&limit=20${status.isNotEmpty ? '&status=$status' : ''}',
  );
  return Map<String, dynamic>.from(res.data['data'] as Map);
});

const _statuses = ['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

Color _statusColor(String s) {
  switch (s) {
    case 'COMPLETED':  return AppColors.success;
    case 'CANCELLED':  return AppColors.danger;
    case 'PROCESSING': return AppColors.info;
    default:           return AppColors.warning;
  }
}

class OrdersScreenV2 extends ConsumerWidget {
  const OrdersScreenV2({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(_orderStatusFilter);
    final page   = ref.watch(_orderPageProvider);
    final async  = ref.watch(ordersProvider);

    return Column(children: [
      // ── Status filters ─────────────────────────────────────────────────
      Container(
        color: AppColors.surfaceDark,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: _statuses.map((s) {
              final active = (s == 'ALL' && filter.isEmpty) || filter == s;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () {
                    ref.read(_orderStatusFilter.notifier).state = s == 'ALL' ? '' : s;
                    ref.read(_orderPageProvider.notifier).state = 1;
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 120),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: active ? AppColors.primary.withAlpha(30) : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: active ? AppColors.primary.withAlpha(80) : AppColors.borderDark,
                      ),
                    ),
                    child: Text(s,
                        style: TextStyle(
                          color:      active ? AppColors.primary : AppColors.textSecondary,
                          fontSize:   12,
                          fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                        )),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),

      // ── List ───────────────────────────────────────────────────────────
      Expanded(child: async.when(
        loading: () => const DarkLoader(),
        error:   (e, _) => ErrorState(message: '$e', onRetry: () => ref.invalidate(ordersProvider)),
        data: (data) {
          final orders     = (data['orders'] as List?) ?? [];
          final total      = (data['total'] as int?) ?? 0;
          final totalPages = ((total / 20).ceil()).clamp(1, 9999);
          if (orders.isEmpty) return const EmptyState(icon: Icons.receipt_long_rounded, message: 'No orders found');
          return RefreshIndicator(
            color: AppColors.primary,
            backgroundColor: AppColors.cardDark,
            onRefresh: () async => ref.invalidate(ordersProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              itemCount: orders.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                if (i == orders.length) {
                  return _PaginationRow(page: page, totalPages: totalPages, ref: ref);
                }
                return _OrderTile(order: Map<String, dynamic>.from(orders[i] as Map), ref: ref);
              },
            ),
          );
        },
      )),
    ]);
  }
}

class _OrderTile extends StatelessWidget {
  final Map<String, dynamic> order;
  final WidgetRef ref;
  const _OrderTile({required this.order, required this.ref});

  @override
  Widget build(BuildContext context) {
    final status    = '${order['status'] ?? 'PENDING'}';
    final color     = _statusColor(status);
    final fmt       = NumberFormat('#,##0.00');
    final amount    = (order['finalAmount'] as num?)?.toDouble() ?? 0.0;
    final createdAt = order['createdAt'] != null
        ? DateFormat('MMM d, y').format(DateTime.parse('${order['createdAt']}'))
        : '—';

    return WCard(
      onTap: () => context.push('/orders/${order['id']}'),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: color.withAlpha(25),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.receipt_long_rounded, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Order #${order['id']}',
                style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 3),
            Text(createdAt,
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('\$${fmt.format(amount)}',
                style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 4),
            StatusBadge(label: status, color: color),
          ]),
        ]),
      ),
    );
  }
}

class _PaginationRow extends StatelessWidget {
  final int page, totalPages;
  final WidgetRef ref;
  const _PaginationRow({required this.page, required this.totalPages, required this.ref});
  @override
  Widget build(BuildContext context) {
    if (totalPages <= 1) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        OutlinedButton(
          onPressed: page > 1 ? () => ref.read(_orderPageProvider.notifier).state = page - 1 : null,
          child: const Text('← Prev'),
        ),
        const SizedBox(width: 12),
        Text('$page / $totalPages', style: const TextStyle(color: AppColors.textSecondary)),
        const SizedBox(width: 12),
        OutlinedButton(
          onPressed: page < totalPages ? () => ref.read(_orderPageProvider.notifier).state = page + 1 : null,
          child: const Text('Next →'),
        ),
      ]),
    );
  }
}
