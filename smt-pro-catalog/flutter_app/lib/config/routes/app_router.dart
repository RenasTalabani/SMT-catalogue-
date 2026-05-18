import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/providers/auth_riverpod.dart';
import '../../features/products/presentation/pages/products_page.dart';
import '../../features/products/presentation/pages/product_detail_page.dart';
import '../../features/categories/presentation/pages/categories_page.dart';
import '../../features/favorites/presentation/pages/favorites_page.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/dashboard/presentation/pages/add_product_page.dart';
import '../../features/dashboard/presentation/pages/manage_categories_page.dart';
import '../../shared/widgets/scaffold_with_nav.dart';

class AppRoutes {
  static const login    = '/login';
  static const home     = '/';
  static const categories    = '/categories';
  static const favorites     = '/favorites';
  static const dashboard     = '/dashboard';
  static const productDetail = '/products/:id';
  static const addProduct    = '/dashboard/add-product';
  static const editProduct   = '/dashboard/edit-product/:id';
  static const manageCategories = '/dashboard/categories';

  static String productDetailPath(String id) => '/products/$id';
  static String editProductPath(String id)    => '/dashboard/edit-product/$id';
}

final _rootNavigatorKey  = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

// Riverpod-aware router that reacts to auth state changes
final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.home,
    redirect: (context, state) {
      // Still initialising — don't redirect yet
      if (auth.isLoading) return null;

      final loggedIn  = auth.isLoggedIn;
      final onLogin   = state.matchedLocation == AppRoutes.login;

      if (!loggedIn && !onLogin) return AppRoutes.login;
      if (loggedIn  &&  onLogin) return AppRoutes.home;
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.login,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (ctx, _) => const LoginScreen(),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (ctx, state, child) => ScaffoldWithNav(child: child),
        routes: [
          GoRoute(path: AppRoutes.home,       builder: (ctx, _) => const ProductsPage()),
          GoRoute(path: AppRoutes.categories, builder: (ctx, _) => const CategoriesPage()),
          GoRoute(path: AppRoutes.favorites,  builder: (ctx, _) => const FavoritesPage()),
          GoRoute(path: AppRoutes.dashboard,  builder: (ctx, _) => const DashboardPage()),
        ],
      ),
      GoRoute(
        path: AppRoutes.productDetail,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (ctx, state) => ProductDetailPage(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.addProduct,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (ctx, _) => const AddProductPage(),
      ),
      GoRoute(
        path: AppRoutes.editProduct,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (ctx, state) => AddProductPage(productId: state.pathParameters['id']),
      ),
      GoRoute(
        path: AppRoutes.manageCategories,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (ctx, _) => const ManageCategoriesPage(),
      ),
    ],
  );
});

// Keep the top-level appRouter for compatibility with main.dart
// (main.dart will be updated to use routerProvider)
final appRouter = GoRouter(
  navigatorKey: GlobalKey<NavigatorState>(),
  initialLocation: AppRoutes.login,
  routes: [
    GoRoute(path: AppRoutes.login, builder: (ctx, _) => const LoginScreen()),
  ],
);
