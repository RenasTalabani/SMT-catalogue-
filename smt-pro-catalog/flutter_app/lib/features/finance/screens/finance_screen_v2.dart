import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../config/themes/app_colors.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/widgets/w_card.dart';

final financeProvider = FutureProvider.autoDispose<Map<String, dynamic>>((_) async {
  final now      = DateTime.now();
  final from     = DateTime(now.year, now.month, 1).toIso8601String().substring(0, 10);
  final to       = now.toIso8601String().substring(0, 10);
  final res      = await ApiClient().get('/api/finance/profit-loss?from=$from&to=$to');
  return Map<String, dynamic>.from(res.data['data'] as Map);
});

final recentExpensesProvider = FutureProvider.autoDispose<List<dynamic>>((_) async {
  final res = await ApiClient().get('/api/finance/expenses?limit=10');
  return (res.data['data']['expenses'] as List?) ?? [];
});

class FinanceScreenV2 extends ConsumerWidget {
  const FinanceScreenV2({super.key});

  String _money(dynamic v) {
    final n = (v ?? 0.0) as num;
    return NumberFormat('#,##0.00').format(n);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final finAsync  = ref.watch(financeProvider);
    final expAsync  = ref.watch(recentExpensesProvider);

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.cardDark,
      onRefresh: () async {
        ref.invalidate(financeProvider);
        ref.invalidate(recentExpensesProvider);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        children: [
          const Text('Finance',
              style: TextStyle(color: AppColors.textPrimary, fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          const Text('This month\'s summary',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 20),

          finAsync.when(
            loading: () => const SizedBox(height: 200, child: DarkLoader()),
            error:   (e, _) => ErrorState(message: '$e', onRetry: () => ref.invalidate(financeProvider)),
            data: (d) => Column(children: [
              Row(children: [
                Expanded(child: StatTile(label: 'Revenue',  value: '\$${_money(d['revenue'])}',  icon: Icons.trending_up_rounded,    color: AppColors.success)),
                const SizedBox(width: 12),
                Expanded(child: StatTile(label: 'Expenses', value: '\$${_money(d['expenses'])}', icon: Icons.trending_down_rounded, color: AppColors.danger)),
              ]),
              const SizedBox(height: 12),
              StatTile(
                label: 'Net Profit',
                value: '\$${_money(d['profit'])}',
                icon: Icons.account_balance_rounded,
                color: ((d['profit'] as num?) ?? 0) >= 0 ? AppColors.success : AppColors.danger,
              ),
              const SizedBox(height: 16),
              WCard(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Breakdown', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(height: 12),
                  _Row('Total Orders', '${(d['totalOrders'] as num?) ?? 0}'),
                  _Row('Avg Order Value', '\$${_money(d['avgOrderValue'])}'),
                  _Row('Gross Margin', '${((d['grossMargin'] as num?) ?? 0).toStringAsFixed(1)}%'),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 20),

          const Text('Recent Expenses', style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          expAsync.when(
            loading: () => const SizedBox(height: 100, child: DarkLoader()),
            error:   (_, __) => const SizedBox.shrink(),
            data: (expenses) {
              if (expenses.isEmpty) return const EmptyState(icon: Icons.receipt_rounded, message: 'No expenses recorded');
              return WCard(
                child: Column(
                  children: expenses.map((e) {
                    final exp = Map<String, dynamic>.from(e as Map);
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.borderDark))),
                      child: Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${exp['description'] ?? exp['category'] ?? '—'}',
                              style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500)),
                          Text('${exp['category'] ?? ''}',
                              style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                        ])),
                        Text('\$${_money(exp['amount'])}',
                            style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700, fontSize: 14)),
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

class _Row extends StatelessWidget {
  final String label, value;
  const _Row(this.label, this.value);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
      Text(value,  style: const TextStyle(color: AppColors.textPrimary,   fontSize: 13, fontWeight: FontWeight.w600)),
    ]),
  );
}
