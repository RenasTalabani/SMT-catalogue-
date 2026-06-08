import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/providers/auth_riverpod.dart';

// v2 screens
import '../../features/dashboard/screens/main_dashboard_screen.dart';
import '../../features/products/screens/products_screen_v2.dart';
import '../../features/orders/screens/orders_screen_v2.dart';
import '../../features/inventory/screens/inventory_screen_v2.dart';
import '../../features/finance/screens/finance_screen_v2.dart';
import '../../features/reports/screens/reports_screen_v2.dart';
import '../../features/settings/screens/settings_screen_v2.dart';
import '../../features/customers/screens/customers_screen.dart';
import '../../features/suppliers/screens/suppliers_screen.dart';

// legacy screens (still needed)
import '../../features/products/presentation/pages/product_detail_page.dart';
import '../../features/dashboard/presentation/pages/add_product_page.dart';
import '../../features/dashboard/presentation/pages/manage_categories_page.dart';
import '../../features/barcode/barcode_scanner_screen.dart';

import '../../shared/widgets/app_shell.dart';

class AppRoutes {
  static const login    = '/login';
  static const home     = '/dashboard';
  static const dashboard = '/dashboard';
  static const products  = '/products';
  static const orders    = '/orders';
  static const inventory = '/inventory';
  static const finance   = '/finance';
  static const reports   = '/reports';
  static const settings  = '/settings';
  static const customers = '/customers';
  static const suppliers = '/suppliers';

  // coming-soon routes (screens not yet built)
  static const invoices         = '/invoices';
  static const credit           = '/credit';
  static const coupons          = '/coupons';
  static const purchaseOrders   = '/purchase-orders';
  static const supplierRatings  = '/supplier-ratings';
  static const returns          = '/returns';
  static const stockAlerts      = '/stock-alerts';
  static const flashSales       = '/flash-sales';
  static const profit           = '/profit';
  static const users            = '/users';
  static const audit            = '/audit';
  static const notifications    = '/notifications';

  // detail / action routes
  static const productDetail     = '/products/:id';
  static const addProduct        = '/products/add';
  static const editProduct       = '/products/:id/edit';
  static const manageCategories  = '/categories';
  static const barcodeScanner    = '/barcode-scanner';

  static String productDetailPath(String id) => '/products/$id';
  static String editProductPath(String id)    => '/products/$id/edit';
}

final _rootNavigatorKey  = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    navigatorKey:    _rootNavigatorKey,
    initialLocation: AppRoutes.home,
    redirect: (context, state) {
      if (auth.isLoading) return null;
      final loggedIn = auth.isLoggedIn;
      final location = state.matchedLocation;
      final onLogin  = location == AppRoutes.login;

      // Public showcase routes — visible without login
      const publicRoutes = [AppRoutes.dashboard, AppRoutes.products];
      final isPublic = publicRoutes.any((r) => location == r || location.startsWith('$r/'));

      if (!loggedIn && !onLogin && !isPublic) return AppRoutes.dashboard;
      if (loggedIn  &&  onLogin) return AppRoutes.home;
      return null;
    },
    routes: [
      // ── Auth ──────────────────────────────────────────────────────────────
      GoRoute(
        path: AppRoutes.login,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const LoginScreen(),
      ),

      // ── Shell (AppShell wraps all main screens with drawer nav) ───────────
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(path: AppRoutes.dashboard,  builder: (_, __) => const MainDashboardScreen()),
          GoRoute(path: AppRoutes.products,   builder: (_, __) => const ProductsScreenV2()),
          GoRoute(path: AppRoutes.orders,     builder: (_, __) => const OrdersScreenV2()),
          GoRoute(path: AppRoutes.inventory,  builder: (_, __) => const InventoryScreenV2()),
          GoRoute(path: AppRoutes.finance,    builder: (_, __) => const FinanceScreenV2()),
          GoRoute(path: AppRoutes.reports,    builder: (_, __) => const ReportsScreenV2()),
          GoRoute(path: AppRoutes.settings,   builder: (_, __) => const SettingsScreenV2()),
          GoRoute(path: AppRoutes.customers,  builder: (_, __) => const CustomersScreen()),
          GoRoute(path: AppRoutes.suppliers,  builder: (_, __) => const SuppliersScreen()),
          GoRoute(path: AppRoutes.manageCategories, builder: (_, __) => const ManageCategoriesPage()),
          // coming-soon stubs — prevent GoRouter crash for unbuilt screens
          GoRoute(path: AppRoutes.invoices,        builder: (_, __) => const _ComingSoonScreen('Invoices')),
          GoRoute(path: AppRoutes.credit,          builder: (_, __) => const _ComingSoonScreen('Customer Credit')),
          GoRoute(path: AppRoutes.coupons,         builder: (_, __) => const _ComingSoonScreen('Coupons')),
          GoRoute(path: AppRoutes.purchaseOrders,  builder: (_, __) => const _ComingSoonScreen('Purchase Orders')),
          GoRoute(path: AppRoutes.supplierRatings, builder: (_, __) => const _ComingSoonScreen('Supplier Ratings')),
          GoRoute(path: AppRoutes.returns,         builder: (_, __) => const _ComingSoonScreen('Returns')),
          GoRoute(path: AppRoutes.stockAlerts,     builder: (_, __) => const _ComingSoonScreen('Stock Alerts')),
          GoRoute(path: AppRoutes.flashSales,      builder: (_, __) => const _ComingSoonScreen('Flash Sales')),
          GoRoute(path: AppRoutes.profit,          builder: (_, __) => const _ComingSoonScreen('Profit')),
          GoRoute(path: AppRoutes.users,           builder: (_, __) => const _ComingSoonScreen('Users')),
          GoRoute(path: AppRoutes.audit,           builder: (_, __) => const _ComingSoonScreen('Audit Logs')),
          GoRoute(path: AppRoutes.notifications,   builder: (_, __) => const _ComingSoonScreen('Notifications')),
        ],
      ),

      // ── Full-screen overlays (no shell) ───────────────────────────────────
      GoRoute(
        path: AppRoutes.addProduct,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const AddProductPage(),
      ),
      GoRoute(
        path: AppRoutes.productDetail,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) => ProductDetailPage(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.editProduct,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) => AddProductPage(productId: state.pathParameters['id']),
      ),
      GoRoute(
        path: AppRoutes.barcodeScanner,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const BarcodeScannerScreen(),
      ),
    ],
  );
});

// ── Coming-soon placeholder ───────────────────────────────────────────────────

class _ComingSoonScreen extends StatelessWidget {
  final String title;
  const _ComingSoonScreen(this.title);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.construction_rounded, size: 48, color: Color(0xFF6C63FF)),
          const SizedBox(height: 16),
          Text(title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
          const SizedBox(height: 8),
          const Text('Coming soon', style: TextStyle(color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }
}

// Legacy alias — kept so old imports don't break until removed
final appRouter = GoRouter(
  navigatorKey: GlobalKey<NavigatorState>(),
  initialLocation: AppRoutes.login,
  routes: [
    GoRoute(path: AppRoutes.login, builder: (_, __) => const LoginScreen()),
  ],
);
