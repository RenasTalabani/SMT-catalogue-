import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../auth/providers/auth_provider.dart';
import '../../finance/screens/finance_screen.dart';
import '../../inventory/screens/inventory_screen.dart';
import '../../orders/screens/orders_screen.dart';
import '../../products/screens/products_screen.dart';
import '../../reports/screens/monthly_report_screen.dart';
import '../../settings/screens/settings_screen.dart';
import '../providers/dashboard_provider.dart';
import '../../../shared/widgets/stat_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    final pages = [
      const _OverviewPage(),
      const ProductsScreen(),
      const OrdersScreen(),
      const InventoryScreen(),
      const MonthlyReportScreen(),
      const FinanceScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      body: pages[_tab],
      bottomNavigationBar: _BottomNav(
        selectedIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        role: auth.user?.role ?? '',
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int    selectedIndex;
  final void Function(int) onTap;
  final String role;
  const _BottomNav({required this.selectedIndex, required this.onTap, required this.role});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Color(0x14000000), blurRadius: 20, offset: Offset(0, -4))],
      ),
      child: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: onTap,
        backgroundColor: Colors.transparent,
        elevation: 0,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2_rounded),
            label: 'Products',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_bag_outlined),
            selectedIcon: Icon(Icons.shopping_bag_rounded),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.warehouse_outlined),
            selectedIcon: Icon(Icons.warehouse_rounded),
            label: 'Inventory',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart_rounded),
            label: 'Analytics',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet_rounded),
            label: 'Finance',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings_rounded),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

// ─── Overview Page ────────────────────────────────────────────────────────────

class _OverviewPage extends StatelessWidget {
  const _OverviewPage();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final dash = context.watch<DashboardProvider>();

    return CustomScrollView(
      slivers: [
        _buildAppBar(context, auth),
        if (dash.isLoading)
          const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
        else if (dash.error != null)
          SliverFillRemaining(child: _ErrorView(message: dash.error!, onRetry: () => context.read<DashboardProvider>().load()))
        else if (dash.summary != null) ...[
          SliverToBoxAdapter(child: _KpiGrid(dash: dash)),
          SliverToBoxAdapter(child: _RevenueChart(dash: dash)),
          SliverToBoxAdapter(child: _TopProductsSection(dash: dash)),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ],
    );
  }

  SliverAppBar _buildAppBar(BuildContext context, AuthProvider auth) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    final fmt = DateFormat('EEEE, d MMM yyyy');

    return SliverAppBar(
      expandedHeight: 160,
      pinned: true,
      backgroundColor: const Color(0xFF0F172A),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
          onPressed: () => context.read<DashboardProvider>().load(),
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert_rounded, color: Colors.white70),
          onSelected: (v) {
            if (v == 'logout') context.read<AuthProvider>().logout();
          },
          itemBuilder: (_) => [
            const PopupMenuItem(value: 'logout', child: Row(
              children: [Icon(Icons.logout, size: 18), SizedBox(width: 10), Text('Sign out')],
            )),
          ],
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
            ),
          ),
          padding: const EdgeInsets.fromLTRB(20, 60, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(
                '$greeting,',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 14),
              ),
              const SizedBox(height: 2),
              Text(
                auth.user?.name ?? 'User',
                style: const TextStyle(
                  color: Colors.white, fontSize: 24,
                  fontWeight: FontWeight.bold, letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                fmt.format(DateTime.now()),
                style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  final DashboardProvider dash;
  const _KpiGrid({required this.dash});

  @override
  Widget build(BuildContext context) {
    final s   = dash.summary!;
    final fmt = NumberFormat('#,##0');
    final rev = NumberFormat('#,##0.00');

    final cards = [
      (label: 'Total Products',  value: fmt.format(s.totalProducts),         icon: Icons.inventory_2_rounded,    color: const Color(0xFF6366F1)),
      (label: 'Total Orders',    value: fmt.format(s.totalOrders),            icon: Icons.shopping_bag_rounded,   color: const Color(0xFF0EA5E9)),
      (label: 'Revenue',         value: '\$${rev.format(s.totalRevenue)}',    icon: Icons.attach_money_rounded,   color: const Color(0xFF10B981)),
      (label: 'Pending Orders',  value: fmt.format(s.pendingOrders),          icon: Icons.hourglass_top_rounded,  color: const Color(0xFFF59E0B)),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.45,
        children: cards.map((c) => StatCard(
          label: c.label,
          value: c.value,
          icon:  c.icon,
          color: c.color,
        )).toList(),
      ),
    );
  }
}

class _RevenueChart extends StatelessWidget {
  final DashboardProvider dash;
  const _RevenueChart({required this.dash});

  @override
  Widget build(BuildContext context) {
    final tops = dash.topProducts;
    if (tops.isEmpty) return const SizedBox();

    final spots = List.generate(tops.length, (i) =>
        FlSpot(i.toDouble(), tops[i].totalRevenue));
    final maxY  = tops.map((p) => p.totalRevenue).reduce((a, b) => a > b ? a : b);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 20)],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.trending_up_rounded, color: Color(0xFF10B981), size: 18),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Revenue by Product', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                    Text('Top performers', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 160,
              child: LineChart(
                LineChartData(
                  minY: 0,
                  maxY: maxY * 1.25,
                  gridData: FlGridData(
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (_) =>
                        const FlLine(color: Color(0xFFF1F5F9), strokeWidth: 1),
                  ),
                  borderData: FlBorderData(show: false),
                  titlesData: const FlTitlesData(
                    topTitles:   AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    leftTitles:  AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  lineTouchData: LineTouchData(
                    touchTooltipData: LineTouchTooltipData(
                      getTooltipItems: (spots) => spots.map((s) => LineTooltipItem(
                        '\$${s.y.toStringAsFixed(0)}',
                        const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                      )).toList(),
                    ),
                  ),
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: const Color(0xFF6366F1),
                      barWidth: 3,
                      dotData: FlDotData(
                        getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(
                          radius: 4, color: const Color(0xFF6366F1),
                          strokeWidth: 2, strokeColor: Colors.white,
                        ),
                      ),
                      belowBarData: BarAreaData(
                        show: true,
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            const Color(0xFF6366F1).withValues(alpha: 0.2),
                            const Color(0xFF6366F1).withValues(alpha: 0.0),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TopProductsSection extends StatelessWidget {
  final DashboardProvider dash;
  const _TopProductsSection({required this.dash});

  @override
  Widget build(BuildContext context) {
    final tops = dash.topProducts;
    final fmt  = NumberFormat('#,##0.00');

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 20)],
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.emoji_events_rounded, color: Color(0xFF6366F1), size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Top Products', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                      Text('By units sold', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (tops.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text('No sales data yet', style: TextStyle(color: Color(0xFF94A3B8))),
              )
            else
              ...List.generate(tops.length, (i) {
                final p       = tops[i];
                final colors  = [
                  const Color(0xFFFFD700), const Color(0xFFC0C0C0), const Color(0xFFCD7F32),
                  const Color(0xFF94A3B8), const Color(0xFF94A3B8),
                ];
                final isLast = i == tops.length - 1;
                return Column(
                  children: [
                    ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                      leading: Container(
                        width: 36, height: 36,
                        decoration: BoxDecoration(
                          color: colors[i.clamp(0, colors.length - 1)].withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: Text(
                            '${i + 1}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: colors[i.clamp(0, colors.length - 1)],
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                      title: Text(p.name,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF0F172A))),
                      subtitle: Text(p.category,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('\$${fmt.format(p.totalRevenue)}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                          Text('${p.totalSold} sold',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                        ],
                      ),
                    ),
                    if (!isLast)
                      const Divider(height: 1, indent: 20, endIndent: 20, color: Color(0xFFF1F5F9)),
                  ],
                );
              }),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String   message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.cloud_off_rounded, size: 48, color: Color(0xFFDC2626)),
            ),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF64748B))),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
