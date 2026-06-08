import 'package:flutter/material.dart';

/// All colours taken directly from the web dashboard CSS variables.
class AppColors {
  AppColors._();

  // ── Brand ─────────────────────────────────────────────────────────────────
  static const Color primary     = Color(0xFF6366F1); // --primary  (indigo)
  static const Color primaryDark = Color(0xFF4F46E5); // darker shade

  // ── Background layers (dark-only — matches web) ───────────────────────────
  static const Color bgDark      = Color(0xFF0F172A); // dark-bg
  static const Color surfaceDark = Color(0xFF1E293B); // dark-surface
  static const Color cardDark    = Color(0xFF1E293B); // dark-card
  static const Color borderDark  = Color(0xFF334155); // dark-border

  // ── Text ──────────────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFFF1F5F9); // white-ish
  static const Color textSecondary = Color(0xFF94A3B8); // slate-400
  static const Color textMuted     = Color(0xFF64748B); // slate-500

  // ── Semantic ──────────────────────────────────────────────────────────────
  static const Color success  = Color(0xFF10B981); // green-500
  static const Color warning  = Color(0xFFF59E0B); // amber-500
  static const Color danger   = Color(0xFFEF4444); // red-500
  static const Color info     = Color(0xFF3B82F6); // blue-500

  // ── Convenience ───────────────────────────────────────────────────────────
  static const Color white = Colors.white;
  static const Color black = Colors.black;

  // ── Legacy aliases (keep old code compiling) ──────────────────────────────
  static const Color error              = danger;
  static const Color secondary          = info;
  static const Color accent             = primary;
  static const Color textSecondaryLight = textSecondary;
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
