import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_riverpod.dart';
import '../../../main.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth    = ref.watch(authProvider);
    final themeMode = ref.watch(themeModeProvider);
    final isDark  = themeMode == ThemeMode.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF0F4FF),
      body: CustomScrollView(
        slivers: [
          const SliverAppBar(
            pinned: true,
            backgroundColor: Color(0xFF0F172A),
            title: Text('Settings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildProfileCard(auth, isDark),
                const SizedBox(height: 8),
                _sectionTitle('Appearance', isDark),
                _buildCard(isDark, [
                  _SettingTile(
                    icon: Icons.dark_mode_rounded,
                    iconColor: const Color(0xFF6366F1),
                    title: 'Dark Mode',
                    trailing: Switch(
                      value: isDark,
                      onChanged: (_) => ref.read(themeModeProvider.notifier).toggle(),
                      activeThumbColor: const Color(0xFF6366F1),
                      activeTrackColor: const Color(0xFF6366F1).withAlpha(102),
                    ),
                    isDark: isDark,
                  ),
                ]),
                const SizedBox(height: 8),
                _sectionTitle('Account', isDark),
                _buildCard(isDark, [
                  _SettingTile(
                    icon: Icons.person_outline_rounded,
                    iconColor: const Color(0xFF0EA5E9),
                    title: 'Name',
                    subtitle: auth.user?.name ?? '—',
                    isDark: isDark,
                  ),
                  _divider(isDark),
                  _SettingTile(
                    icon: Icons.email_outlined,
                    iconColor: const Color(0xFF10B981),
                    title: 'Email',
                    subtitle: auth.user?.email ?? '—',
                    isDark: isDark,
                  ),
                  _divider(isDark),
                  _SettingTile(
                    icon: Icons.badge_outlined,
                    iconColor: const Color(0xFFD97706),
                    title: 'Role',
                    subtitle: (auth.user?.role ?? '').toUpperCase(),
                    isDark: isDark,
                  ),
                ]),
                const SizedBox(height: 8),
                _sectionTitle('About', isDark),
                _buildCard(isDark, [
                  _SettingTile(
                    icon: Icons.info_outline_rounded,
                    iconColor: const Color(0xFF6366F1),
                    title: 'Version',
                    subtitle: 'DaralIraq v3.0.0',
                    isDark: isDark,
                  ),
                  _divider(isDark),
                  _SettingTile(
                    icon: Icons.business_rounded,
                    iconColor: const Color(0xFF0EA5E9),
                    title: 'Edition',
                    subtitle: 'Enterprise Edition (TypeScript)',
                    isDark: isDark,
                  ),
                ]),
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: Consumer(
                      builder: (ctx, cRef, _) => ElevatedButton.icon(
                        onPressed: () async {
                          final confirmed = await showDialog<bool>(
                            context: ctx,
                            builder: (_) => AlertDialog(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              title: const Text('Sign Out'),
                              content: const Text('Are you sure you want to sign out?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
                                  onPressed: () => Navigator.pop(ctx, true),
                                  child: const Text('Sign Out'),
                                ),
                              ],
                            ),
                          );
                          if (confirmed == true) {
                            await cRef.read(authProvider.notifier).logout();
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFDC2626),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        icon: const Icon(Icons.logout_rounded),
                        label: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileCard(AuthState auth, bool isDark) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [Color(0xFF1E40AF), Color(0xFF6366F1)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [BoxShadow(color: Color(0x336366F1), blurRadius: 20, offset: Offset(0, 8))],
      ),
      child: Row(children: [
        Container(
          width: 56, height: 56,
          decoration: BoxDecoration(color: Colors.white.withAlpha(51), shape: BoxShape.circle),
          child: Center(
            child: Text(
              (auth.user?.name ?? 'U').substring(0, 1).toUpperCase(),
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(auth.user?.name ?? 'User',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 2),
          Text(auth.user?.email ?? '',
              style: TextStyle(fontSize: 12, color: Colors.white.withAlpha(191))),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.white.withAlpha(51),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text((auth.user?.role ?? '').toUpperCase(),
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
        ])),
      ]),
    );
  }

  Widget _sectionTitle(String title, bool isDark) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
    child: Text(title.toUpperCase(),
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8,
            color: isDark ? Colors.white54 : const Color(0xFF94A3B8))),
  );

  Widget _buildCard(bool isDark, List<Widget> children) => Container(
    margin: const EdgeInsets.symmetric(horizontal: 16),
    decoration: BoxDecoration(
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 12)],
    ),
    child: Column(children: children),
  );

  Widget _divider(bool isDark) => Divider(height: 1, indent: 56, color: isDark ? Colors.white12 : const Color(0xFFF1F5F9));
}

class _SettingTile extends StatelessWidget {
  final IconData icon;
  final Color    iconColor;
  final String   title;
  final String?  subtitle;
  final Widget?  trailing;
  final bool     isDark;
  const _SettingTile({required this.icon, required this.iconColor, required this.title, this.subtitle, this.trailing, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        width: 36, height: 36,
        decoration: BoxDecoration(color: iconColor.withAlpha(26), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: iconColor, size: 18),
      ),
      title: Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
          color: isDark ? Colors.white : const Color(0xFF0F172A))),
      subtitle: subtitle != null
          ? Text(subtitle!, style: TextStyle(fontSize: 12,
              color: isDark ? Colors.white38 : const Color(0xFF94A3B8)))
          : null,
      trailing: trailing ?? (subtitle != null ? null : const Icon(Icons.chevron_right_rounded, color: Color(0xFFCBD5E1))),
    );
  }
}
