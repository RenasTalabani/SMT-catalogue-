import '../core/constants/api_endpoints.dart';

class AppConfig {
  AppConfig._();

  static const String appName    = 'DaralIraq';
  static const String appVersion = '2.0.0';

  // All environments use ApiEndpoints.baseUrl — change _mode in api_endpoints.dart
  static String get apiBaseUrl => ApiEndpoints.baseUrl;
}
