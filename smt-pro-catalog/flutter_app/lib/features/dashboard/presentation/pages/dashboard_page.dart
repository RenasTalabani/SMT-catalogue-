import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../config/routes/app_router.dart';
import '../../../../config/themes/app_colors.dart';
import '../../../../shared/widgets/loading_widget.dart';

final _dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ApiClient();
  final res = await client.get(ApiEndpoints.dashboard);
  return res.data['data'] as Map<String, dynamic>;
});

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(_dashboardProvider),
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingWidget(),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text('$err', textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(_dashboardProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) => _DashboardBody(data: data),
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.extended(
            heroTag: 'add_product',
            onPressed: () => context.push(AppRoutes.addProduct),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Add Product'),
            backgroundColor: AppColors.primary,
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'manage_cats',
            onPressed: () => context.push(AppRoutes.manageCategories),
            icon: const Icon(Icons.category_rounded),
            label: const Text('Categories'),
            backgroundColor: AppColors.secondary,
          ),
        ],
      ),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  final Map<String, dynamic> data;
  const _DashboardBody({required this.data});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle('Overview'),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.4,
            children: [
              _StatCard(
                label: 'Products',
                value: '${data['totalProducts'] ?? 0}',
                icon: Icons.inventory_2_rounded,
                color: AppColors.primary,
              ).animate().fadeIn(delay: 0.ms).scale(begin: const Offset(0.9, 0.9)),
              _StatCard(
                label: 'Orders',
                value: '${data['totalOrders'] ?? 0}',
                icon: Icons.receipt_long_rounded,
                color: AppColors.secondary,
              ).animate().fadeIn(delay: 80.ms).scale(begin: const Offset(0.9, 0.9)),
              _StatCard(
                label: 'Revenue',
                value: '\$${data['totalRevenue'] ?? 0}',
                icon: Icons.attach_money_rounded,
                color: AppColors.success,
              ).animate().fadeIn(delay: 160.ms).scale(begin: const Offset(0.9, 0.9)),
              _StatCard(
                label: 'Low Stock',
                value: '${data['lowStockCount'] ?? 0}',
                icon: Icons.warning_amber_rounded,
                color: AppColors.warning,
              ).animate().fadeIn(delay: 240.ms).scale(begin: const Offset(0.9, 0.9)),
            ],
          ),
          const SizedBox(height: 24),
          const _SectionTitle('Today'),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _InfoTile(label: "Today's Orders", value: '${data['todayOrders'] ?? 0}', icon: Icons.today_rounded)),
            const SizedBox(width: 12),
            Expanded(child: _InfoTile(label: 'Users', value: '${data['totalUsers'] ?? 0}', icon: Icons.people_rounded)),
          ]),
          const SizedBox(height: 24),
          const _SectionTitle('Order Status'),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _StatusTile(label: 'Pending',   value: '${data['pendingOrders']   ?? 0}', color: AppColors.warning)),
            const SizedBox(width: 8),
            Expanded(child: _StatusTile(label: 'Completed', value: '${data['completedOrders'] ?? 0}', color: AppColors.success)),
            const SizedBox(width: 8),
            Expanded(child: _StatusTile(label: 'Cancelled', value: '${data['cancelledOrders'] ?? 0}', color: AppColors.error)),
          ]),
          const SizedBox(height: 24),
          const _SectionTitle('Inventory'),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppColors.primary.withAlpha(26), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.warehouse_rounded, color: AppColors.primary),
              ),
              title: const Text('Total Stock Units', style: TextStyle(fontWeight: FontWeight.w600)),
              trailing: Text(
                '${data['totalStockUnits'] ?? 0}',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary),
              ),
            ),
          ),
          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);
  @override
  Widget build(BuildContext context) => Text(
    title,
    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
  );
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withAlpha(26), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 22),
            ),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800, color: color)),
              Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondaryLight)),
            ]),
          ],
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final String label, value;
  final IconData icon;
  const _InfoTile({required this.label, required this.value, required this.icon});
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Icon(icon, color: AppColors.primary, size: 28),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight)),
        ]),
      ]),
    ),
  );
}

class _StatusTile extends StatelessWidget {
  final String label, value;
  final Color color;
  const _StatusTile({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Column(children: [
        Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight)),
      ]),
    ),
  );
}
