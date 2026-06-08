import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../config/themes/app_colors.dart';
import '../../features/auth/providers/auth_riverpod.dart';

// ─── Nav item model ───────────────────────────────────────────────────────────

class _NavItem {
  final IconData icon;
  final String   label;
  final String   path;
  final List<String> roles; // empty = all authenticated
  const _NavItem(this.icon, this.label, this.path, {this.roles = const []});
}

const _navItems = [
  _NavItem(Icons.dashboard_rounded,        'Dashboard',        '/dashboard'),
  _NavItem(Icons.inventory_2_rounded,      'Products',         '/products'),
  _NavItem(Icons.category_rounded,         'Categories',       '/categories'),
  _NavItem(Icons.receipt_long_rounded,     'Orders',           '/orders'),
  _NavItem(Icons.description_rounded,      'Invoices',         '/invoices'),
  _NavItem(Icons.person_rounded,           'Customers',        '/customers'),
  _NavItem(Icons.credit_card_rounded,      'Credit',           '/credit'),
  _NavItem(Icons.local_offer_rounded,      'Coupons',          '/coupons',    roles: ['super_admin','admin']),
  _NavItem(Icons.local_shipping_rounded,   'Suppliers',        '/suppliers'),
  _NavItem(Icons.shopping_bag_rounded,     'Purchase Orders',  '/purchase-orders'),
  _NavItem(Icons.star_rounded,             'Supplier Ratings', '/supplier-ratings'),
  _NavItem(Icons.assignment_return_rounded,'Returns',          '/returns'),
  _NavItem(Icons.warehouse_rounded,        'Inventory',        '/inventory'),
  _NavItem(Icons.notifications_active_rounded,'Stock Alerts',  '/stock-alerts'),
  _NavItem(Icons.bolt_rounded,             'Flash Sales',      '/flash-sales', roles: ['super_admin','admin']),
  _NavItem(Icons.trending_up_rounded,      'Finance',          '/finance',     roles: ['super_admin','admin']),
  _NavItem(Icons.bar_chart_rounded,        'Reports',          '/reports',     roles: ['super_admin','admin']),
  _NavItem(Icons.pie_chart_rounded,        'Profit',           '/profit',      roles: ['super_admin','admin']),
  _NavItem(Icons.people_rounded,           'Users',            '/users',       roles: ['super_admin','admin']),
  _NavItem(Icons.shield_rounded,           'Audit Logs',       '/audit',       roles: ['super_admin','admin']),
  _NavItem(Icons.settings_rounded,         'Settings',         '/settings'),
];

// ─── AppShell ─────────────────────────────────────────────────────────────────

class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth     = ref.watch(authProvider);
    final role     = auth.user?.role ?? '';
    final location = GoRouterState.of(context).uri.path;

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: _AppBar(location: location),
      drawer: _Drawer(role: role, location: location),
      body: child,
    );
  }
}

// ─── AppBar ───────────────────────────────────────────────────────────────────

class _AppBar extends ConsumerWidget implements PreferredSizeWidget {
  final String location;
  const _AppBar({required this.location});

  String _title() {
    final item = _navItems.where((n) => location.startsWith(n.path)).firstOrNull;
    return item?.label ?? 'DaralIraq';
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLoggedIn = ref.watch(authProvider).isLoggedIn;

    return AppBar(
      leading: Builder(
        builder: (ctx) => IconButton(
          icon: const Icon(Icons.menu_rounded),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        ),
      ),
      title: Text(_title()),
      actions: [
        if (isLoggedIn)
          const _NotificationBell()
        else
          TextButton.icon(
            onPressed: () => context.go('/login'),
            icon: const Icon(Icons.login_rounded, size: 16, color: AppColors.primary),
            label: const Text(
              'Sign In',
              style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
            ),
          ),
      ],
    );
  }
}

class _NotificationBell extends ConsumerWidget {
  const _NotificationBell();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      icon: const Icon(Icons.notifications_none_rounded),
      onPressed: () => context.push('/notifications'),
    );
  }
}

// ─── Drawer sidebar ───────────────────────────────────────────────────────────

// Public-only nav items visible to guests
const _guestNavItems = [
  _NavItem(Icons.dashboard_rounded,   'Dashboard', '/dashboard'),
  _NavItem(Icons.inventory_2_rounded, 'Products',  '/products'),
];

class _Drawer extends ConsumerWidget {
  final String role;
  final String location;
  const _Drawer({required this.role, required this.location});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth      = ref.watch(authProvider);
    final user      = auth.user;
    final isGuest   = user == null;
    final initial   = (user?.name.isNotEmpty == true) ? user!.name[0].toUpperCase() : 'U';

    final visible = isGuest
        ? _guestNavItems
        : _navItems.where((n) => n.roles.isEmpty || n.roles.contains(role)).toList();

    return Drawer(
      width: 272,
      child: Column(
        children: [
          // ── Logo header ─────────────────────────────────────────────────
          Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.borderDark)),
            ),
            child: Row(children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.inventory_2_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 10),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('DaralIraq',
                    style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                Text('ENTERPRISE',
                    style: TextStyle(color: AppColors.borderDark, fontSize: 9, letterSpacing: 2, fontWeight: FontWeight.w600)),
              ]),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.textMuted),
                onPressed: () => Navigator.of(context).pop(),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ]),
          ),

          // ── Nav items ────────────────────────────────────────────────────
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              children: visible.map((n) {
                final active = location == n.path || location.startsWith('${n.path}/');
                return _NavTile(item: n, active: active, onTap: () {
                  Navigator.of(context).pop();
                  context.go(n.path);
                });
              }).toList(),
            ),
          ),

          // ── Footer: Sign In (guest) or user info (authenticated) ─────────
          Container(
            padding: const EdgeInsets.all(14),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.borderDark)),
            ),
            child: isGuest
                // Guest: big Sign In button
                ? SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(context).pop();
                        context.go('/login');
                      },
                      icon: const Icon(Icons.login_rounded, size: 16),
                      label: const Text('Sign In', style: TextStyle(fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  )
                // Authenticated: user info + logout
                : Row(children: [
                    Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.primary, AppColors.primaryDark],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(child: Text(initial,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14))),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(user.name,
                            style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
                            overflow: TextOverflow.ellipsis),
                        Text(user.role.replaceAll('_', ' '),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                      ],
                    )),
                    IconButton(
                      icon: const Icon(Icons.logout_rounded, size: 18, color: AppColors.textMuted),
                      onPressed: () {
                        Navigator.of(context).pop();
                        ref.read(authProvider.notifier).logout();
                      },
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ]),
          ),

          // ── Credit ───────────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.borderDark)),
            ),
            child: const Text(
              '© 2025 All rights reserved\nCreated by Renas Talabani',
              textAlign: TextAlign.center,
              style: TextStyle(
                color:    AppColors.textMuted,
                fontSize: 10,
                height:   1.6,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  final _NavItem item;
  final bool active;
  final VoidCallback onTap;
  const _NavTile({required this.item, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        margin: const EdgeInsets.symmetric(vertical: 1),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color:  active ? AppColors.primary.withAlpha(30) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: active ? AppColors.primary.withAlpha(50) : Colors.transparent,
          ),
        ),
        child: Row(children: [
          Icon(item.icon,
              size:  18,
              color: active ? AppColors.primary : AppColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(child: Text(item.label,
              style: TextStyle(
                color:      active ? AppColors.primary : AppColors.textSecondary,
                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                fontSize:   13,
              ))),
          if (active)
            Container(
              width: 6, height: 6,
              decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
            ),
        ]),
      ),
    );
  }
}
