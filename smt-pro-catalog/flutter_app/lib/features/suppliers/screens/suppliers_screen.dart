import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/themes/app_colors.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/widgets/w_card.dart';

final suppliersProvider = FutureProvider.autoDispose<Map<String, dynamic>>((_) async {
  final res = await ApiClient().get('/api/inventory/suppliers?limit=100');
  return Map<String, dynamic>.from(res.data['data'] as Map);
});

class SuppliersScreen extends ConsumerWidget {
  const SuppliersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(suppliersProvider);

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.cardDark,
      onRefresh: () async => ref.invalidate(suppliersProvider),
      child: async.when(
        loading: () => const DarkLoader(),
        error:   (e, _) => ErrorState(message: '$e', onRetry: () => ref.invalidate(suppliersProvider)),
        data: (data) {
          final suppliers = (data['suppliers'] as List?) ?? [];
          if (suppliers.isEmpty) return const EmptyState(icon: Icons.local_shipping_rounded, message: 'No suppliers yet');
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            itemCount: suppliers.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) {
              final s = Map<String, dynamic>.from(suppliers[i] as Map);
              return WCard(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(25),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.local_shipping_rounded, color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${s['name'] ?? '—'}',
                        style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                    if (s['phone'] != null)
                      Text('${s['phone']}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    if (s['email'] != null)
                      Text('${s['email']}', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                  ])),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
                ]),
              );
            },
          );
        },
      ),
    );
  }
}
