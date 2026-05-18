class AppConstants {
  AppConstants._();

  static const String favoritesKey = 'smt_favorites';
  static const String themeKey = 'smt_theme';
  static const String localeKey = 'smt_locale';
  static const String layoutKey = 'smt_layout';

  static const List<String> supportedLocales = ['en', 'ar', 'ku'];
  static const String defaultLocale = 'en';

  static const List<String> rtlLocales = ['ar', 'ku'];

  static const int gridCrossAxisCount = 2;
  static const double productCardAspectRatio = 0.75;
  static const double borderRadius = 16.0;
  static const double cardRadius = 12.0;
}
