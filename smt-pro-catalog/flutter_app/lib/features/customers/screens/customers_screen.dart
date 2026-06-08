import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/themes/app_colors.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/widgets/w_card.dart';

final _custSearchProvider = StateProvider.autoDispose<String>((_) => '');
final _custPageProvider   = StateProvider.autoDispose<int>((_) => 1);

final customersProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final search = ref.watch(_custSearchProvider);
  final page   = ref.watch(_custPageProvider);
  final res    = await ApiClient().get(
    '/api/customers?page=$page&limit=20${search.isNotEmpty ? '&search=${Uri.encodeComponent(search)}' : ''}',
  );
  return Map<String, dynamic>.from(res.data['data'] as Map);
});

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});
  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final _ctrl = TextEditingController();
  @override void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(customersProvider);
    final page  = ref.watch(_custPageProvider);

    return Column(children: [
      // Search
      Container(
        color: AppColors.surfaceDark,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: TextField(
          controller: _ctrl,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Search customers…',
            prefixIcon: const Icon(Icons.search_rounded, size: 18, color: AppColors.textMuted),
            suffixIcon: _ctrl.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear_rounded, size: 16, color: AppColors.textMuted),
                    onPressed: () { _ctrl.clear(); ref.read(_custSearchProvider.notifier).state = ''; },
                  )
                : null,
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
          ),
          onChanged: (v) {
            ref.read(_custSearchProvider.notifier).state = v;
            ref.read(_custPageProvider.notifier).state = 1;
          },
        ),
      ),

      Expanded(child: async.when(
        loading: () => const DarkLoader(),
        error:   (e, _) => ErrorState(message: '$e', onRetry: () => ref.invalidate(customersProvider)),
        data: (data) {
          final customers  = (data['customers'] as List?) ?? [];
          final total      = (data['total'] as int?) ?? 0;
          final totalPages = ((total / 20).ceil()).clamp(1, 9999);
          if (customers.isEmpty) return const EmptyState(icon: Icons.person_rounded, message: 'No customers found');
          return RefreshIndicator(
            color: AppColors.primary,
            backgroundColor: AppColors.cardDark,
            onRefresh: () async => ref.invalidate(customersProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              itemCount: customers.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                if (i == customers.length) {
                  if (totalPages <= 1) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      OutlinedButton(
                        onPressed: page > 1 ? () => ref.read(_custPageProvider.notifier).state = page - 1 : null,
                        child: const Text('← Prev'),
                      ),
                      const SizedBox(width: 12),
                      Text('$page / $totalPages', style: const TextStyle(color: AppColors.textSecondary)),
                      const SizedBox(width: 12),
                      OutlinedButton(
                        onPressed: page < totalPages ? () => ref.read(_custPageProvider.notifier).state = page + 1 : null,
                        child: const Text('Next →'),
                      ),
                    ]),
                  );
                }
                final c = Map<String, dynamic>.from(customers[i] as Map);
                return WCard(
                  padding: const EdgeInsets.all(14),
                  child: Row(children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: AppColors.primary.withAlpha(30),
                      child: Text(
                        '${c['name']}'.isNotEmpty ? ('${c['name']}')[0].toUpperCase() : '?',
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${c['name'] ?? '—'}',
                          style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                      if (c['phone'] != null)
                        Text('${c['phone']}',
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      if (c['email'] != null)
                        Text('${c['email']}',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                    ])),
                    const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
                  ]),
                );
              },
            ),
          );
        },
      )),
    ]);
  }
}
