import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Single dark theme — matches the web dashboard exactly.
class AppTheme {
  AppTheme._();

  static ThemeData get dark {
    const cs = ColorScheme(
      brightness:           Brightness.dark,
      primary:              AppColors.primary,
      onPrimary:            AppColors.white,
      primaryContainer:     AppColors.primaryDark,
      onPrimaryContainer:   AppColors.white,
      secondary:            AppColors.textSecondary,
      onSecondary:          AppColors.white,
      secondaryContainer:   AppColors.cardDark,
      onSecondaryContainer: AppColors.textPrimary,
      error:                AppColors.danger,
      onError:              AppColors.white,
      surface:              AppColors.surfaceDark,
      onSurface:            AppColors.textPrimary,
      surfaceContainerHighest: AppColors.cardDark,
      outline:              AppColors.borderDark,
    );

    return ThemeData(
      useMaterial3:          true,
      brightness:            Brightness.dark,
      colorScheme:           cs,
      scaffoldBackgroundColor: AppColors.bgDark,
      fontFamily:            'Inter',

      appBarTheme: const AppBarTheme(
        elevation:              0,
        scrolledUnderElevation: 0,
        backgroundColor:        AppColors.surfaceDark,
        foregroundColor:        AppColors.textPrimary,
        centerTitle:            false,
        titleTextStyle: TextStyle(
          color:      AppColors.textPrimary,
          fontSize:   17,
          fontWeight: FontWeight.w700,
        ),
      ),

      cardTheme: CardThemeData(
        elevation: 0,
        color:     AppColors.cardDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderDark, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled:    true,
        fillColor: AppColors.surfaceDark,
        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderDark),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.white,
          elevation:  0,
          padding:    const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          shape:      RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle:  const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textSecondary,
          side:    const BorderSide(color: AppColors.borderDark),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          shape:   RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppColors.primary),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: AppColors.cardDark,
        side: const BorderSide(color: AppColors.borderDark),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
      ),

      dividerTheme: const DividerThemeData(
        color:     AppColors.borderDark,
        thickness: 1,
        space:     1,
      ),

      listTileTheme: const ListTileThemeData(
        iconColor:  AppColors.textSecondary,
        textColor:  AppColors.textPrimary,
        tileColor:  Colors.transparent,
      ),

      drawerTheme: const DrawerThemeData(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      ),

      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor:     AppColors.surfaceDark,
        selectedItemColor:   AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        type:                BottomNavigationBarType.fixed,
        elevation:           0,
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor:  AppColors.surfaceDark,
        indicatorColor:   AppColors.primary.withAlpha(38),
        iconTheme:        WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.primary);
          }
          return const IconThemeData(color: AppColors.textMuted);
        }),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.cardDark,
        contentTextStyle: const TextStyle(color: AppColors.textPrimary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        titleTextStyle: const TextStyle(
          color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700,
        ),
      ),

      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),

      textTheme: const TextTheme(
        headlineLarge: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800),
        headlineMedium: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700),
        headlineSmall: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700),
        titleLarge:  TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700),
        titleMedium: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
        titleSmall:  TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
        bodyLarge:   TextStyle(color: AppColors.textPrimary),
        bodyMedium:  TextStyle(color: AppColors.textPrimary),
        bodySmall:   TextStyle(color: AppColors.textSecondary),
        labelLarge:  TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
        labelMedium: TextStyle(color: AppColors.textSecondary),
        labelSmall:  TextStyle(color: AppColors.textMuted, fontSize: 10),
      ),
    );
  }

  // Keep light as alias to dark — we're dark-only
  static ThemeData get light => dark;
  static ThemeData get lightTheme => dark;
  static ThemeData get darkTheme  => dark;
}
