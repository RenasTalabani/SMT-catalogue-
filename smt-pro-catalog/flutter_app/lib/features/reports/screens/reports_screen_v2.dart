import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/themes/app_colors.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/widgets/w_card.dart';

final reportsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((_) async {
  final res = await ApiClient().get('/api/reports/dashboard');
  return Map<String, dynamic>.from(res.data['data'] as Map);
});

final topProductsProvider = FutureProvider.autoDispose<List<dynamic>>((_) async {
  final res = await ApiClient().get('/api/reports/top-products?limit=10');
  return (res.data['data'] as List?) ?? [];
});

class ReportsScreenV2 extends ConsumerWidget {
  const ReportsScreenV2({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(reportsProvider);
    final topAsync  = ref.watch(topProductsProvider);

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.cardDark,
      onRefresh: () async {
        ref.invalidate(reportsProvider);
        ref.invalidate(topProductsProvider);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        children: [
          const Text('Reports', style: TextStyle(color: AppColors.textPrimary, fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 20),

          dashAsync.when(
            loading: () => const SizedBox(height: 180, child: DarkLoader()),
            error:   (e, _) => ErrorState(message: '$e', onRetry: () => ref.invalidate(reportsProvider)),
            data: (d) => GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.55,
              children: [
                StatTile(label: 'Total Orders',    value: '${d['totalOrders'] ?? 0}',    icon: Icons.receipt_long_rounded,   color: AppColors.primary),
                StatTile(label: 'Total Revenue',   value: '\$${d['totalRevenue'] ?? 0}', icon: Icons.attach_money_rounded,   color: AppColors.success),
                StatTile(label: 'Avg Order',       value: '\$${d['avgOrderValue'] ?? 0}',icon: Icons.bar_chart_rounded,      color: AppColors.info),
                StatTile(label: 'Customers',       value: '${d['totalCustomers'] ?? 0}', icon: Icons.people_rounded,         color: AppColors.warning),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const Text('Top Products', style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          topAsync.when(
            loading: () => const SizedBox(height: 120, child: DarkLoader()),
            error:   (_, __) => const SizedBox.shrink(),
            data: (products) {
              if (products.isEmpty) return const EmptyState(icon: Icons.bar_chart_rounded, message: 'No data');
              return WCard(
                child: Column(
                  children: products.asMap().entries.map((e) {
                    final p = Map<String, dynamic>.from(e.value as Map);
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.borderDark))),
                      child: Row(children: [
                        Container(
                          width: 28, height: 28,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withAlpha(25),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Center(child: Text('${e.key + 1}',
                              style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 12))),
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: Text('${p['name'] ?? '—'}',
                            style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
                            maxLines: 1, overflow: TextOverflow.ellipsis)),
                        Text('${p['totalSold'] ?? p['quantity'] ?? 0} sold',
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      ]),
                    );
                  }).toList(),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
