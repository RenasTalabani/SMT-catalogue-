import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';
import 'config/routes/app_router.dart';
import 'config/themes/app_theme.dart';
import 'core/constants/app_constants.dart';
import 'core/services/fcm_service.dart';

// ─── Theme ────────────────────────────────────────────────────────────────────

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>(
  (ref) => ThemeModeNotifier(),
);

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.light) { _load(); }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString(AppConstants.themeKey) == 'dark') state = ThemeMode.dark;
  }

  Future<void> toggle() async {
    state = state == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.themeKey, state == ThemeMode.dark ? 'dark' : 'light');
  }
}

// ─── Locale ───────────────────────────────────────────────────────────────────

final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>(
  (ref) => LocaleNotifier(),
);

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(const Locale('en')) { _load(); }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = Locale(prefs.getString(AppConstants.localeKey) ?? 'en');
  }

  Future<void> setLocale(String languageCode) async {
    if (!AppConstants.supportedLocales.contains(languageCode)) return;
    state = Locale(languageCode);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.localeKey, languageCode);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await FcmService.instance.init();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const ProviderScope(child: SmtProCatalogApp()));
}

class SmtProCatalogApp extends ConsumerWidget {
  const SmtProCatalogApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale    = ref.watch(localeProvider);
    final isRtl     = AppConstants.rtlLocales.contains(locale.languageCode);
    // routerProvider watches authProvider → redirects automatically on login/logout
    final router    = ref.watch(routerProvider);

    return MaterialApp.router(
      title:                    'DaralIraq',
      debugShowCheckedModeBanner: false,
      themeMode:  ThemeMode.dark,
      theme:      AppTheme.dark,
      darkTheme:  AppTheme.dark,
      routerConfig: router,
      locale:     locale,
      supportedLocales: AppConstants.supportedLocales.map(Locale.new).toList(),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) => Directionality(
        textDirection: isRtl ? TextDirection.rtl : TextDirection.ltr,
        child: child!,
      ),
    );
  }
}
