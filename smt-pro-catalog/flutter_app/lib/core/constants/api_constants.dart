import '../../config/app_config.dart';

class ApiConstants {
  ApiConstants._();

  // Base URL is configured at build time via `--dart-define=API_BASE_URL`.
  // For a physical device on the same network, use the host machine IP
  // instead of localhost.
  static final String baseUrl = AppConfig.apiBaseUrl;

  // Products
  static const String products = '/products';
  static String productById(String id) => '/products/$id';
  static String productBySlug(String slug) => '/products/slug/$slug';
  static const String dashboardProducts = '/products/dashboard';

  // Categories
  static const String categories = '/categories';
  static String categoryById(String id) => '/categories/$id';

  // Upload
  static const String uploadImages = '/upload/images';
  static const String uploadVideo = '/upload/video';
  static const String deleteMedia = '/upload/media';

  // Dashboard
  static const String analytics = '/dashboard/analytics';
  static const String bulkTemplate = '/dashboard/bulk-template';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 60);
  static const Duration sendTimeout = Duration(seconds: 120);

  // Pagination defaults
  static const int defaultPageSize = 20;
}
