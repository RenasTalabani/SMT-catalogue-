import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../config/themes/app_colors.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/widgets/w_card.dart';

final _invPageProvider = StateProvider.autoDispose<int>((_) => 1);

final inventoryMovementsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final page = ref.watch(_invPageProvider);
  final res  = await ApiClient().get('/api/inventory/movements?page=$page&limit=20');
  return Map<String, dynamic>.from(res.data['data'] as Map);
});

final inventoryValueProvider = FutureProvider.autoDispose<Map<String, dynamic>>((_) async {
  final res = await ApiClient().get('/api/inventory/value');
  return Map<String, dynamic>.from(res.data['data'] as Map);
});

class InventoryScreenV2 extends ConsumerWidget {
  const InventoryScreenV2({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final valueAsync = ref.watch(inventoryValueProvider);
    final movAsync   = ref.watch(inventoryMovementsProvider);
    final page       = ref.watch(_invPageProvider);

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.cardDark,
      onRefresh: () async {
        ref.invalidate(inventoryValueProvider);
        ref.invalidate(inventoryMovementsProvider);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        children: [
          // Value summary
          valueAsync.when(
            loading: () => const SizedBox(height: 80, child: DarkLoader()),
            error:   (_, __) => const SizedBox.shrink(),
            data: (d) => Row(children: [
              Expanded(child: StatTile(
                label: 'Total Stock Value',
                value: '\$${NumberFormat('#,##0').format((d['totalValue'] as num?) ?? 0)}',
                icon: Icons.warehouse_rounded,
                color: AppColors.primary,
              )),
              const SizedBox(width: 12),
              Expanded(child: StatTile(
                label: 'Total Items',
                value: '${(d['totalProducts'] as num?) ?? 0}',
                icon: Icons.inventory_rounded,
                color: AppColors.info,
              )),
            ]),
          ),
          const SizedBox(height: 16),

          const Text('Stock Movements',
              style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),

          movAsync.when(
            loading: () => const SizedBox(height: 200, child: DarkLoader()),
            error:   (e, _) => ErrorState(message: '$e', onRetry: () => ref.invalidate(inventoryMovementsProvider)),
            data: (data) {
              final movements  = (data['movements'] as List?) ?? [];
              final total      = (data['total'] as int?) ?? 0;
              final totalPages = ((total / 20).ceil()).clamp(1, 9999);

              if (movements.isEmpty) {
                return const EmptyState(icon: Icons.swap_vert_rounded, message: 'No stock movements yet');
              }

              return Column(children: [
                WCard(
                  child: Column(
                    children: movements.map((m) {
                      final mv = Map<String, dynamic>.from(m as Map);
                      return _MovementTile(movement: mv);
                    }).toList(),
                  ),
                ),
                if (totalPages > 1) ...[
                  const SizedBox(height: 16),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    OutlinedButton(
                      onPressed: page > 1 ? () => ref.read(_invPageProvider.notifier).state = page - 1 : null,
                      child: const Text('← Prev'),
                    ),
                    const SizedBox(width: 12),
                    Text('$page / $totalPages', style: const TextStyle(color: AppColors.textSecondary)),
                    const SizedBox(width: 12),
                    OutlinedButton(
                      onPressed: page < totalPages ? () => ref.read(_invPageProvider.notifier).state = page + 1 : null,
                      child: const Text('Next →'),
                    ),
                  ]),
                ],
              ]);
            },
          ),
        ],
      ),
    );
  }
}

class _MovementTile extends StatelessWidget {
  final Map<String, dynamic> movement;
  const _MovementTile({required this.movement});

  @override
  Widget build(BuildContext context) {
    final type  = '${movement['type'] ?? ''}';
    final qty   = (movement['quantity'] as int?) ?? 0;
    final color = type == 'IN' ? AppColors.success : type == 'OUT' ? AppColors.danger : AppColors.info;
    final date  = movement['createdAt'] != null
        ? DateFormat('MMM d, HH:mm').format(DateTime.parse('${movement['createdAt']}'))
        : '—';
    final product = movement['product'] as Map?;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.borderDark)),
      ),
      child: Row(children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: color.withAlpha(25), borderRadius: BorderRadius.circular(10)),
          child: Icon(
            type == 'IN' ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
            color: color, size: 18,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${product?['name'] ?? 'Unknown'}',
              style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(date, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${type == 'IN' ? '+' : '-'}$qty',
              style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 14)),
          StatusBadge(label: type, color: color),
        ]),
      ]),
    );
  }
}
