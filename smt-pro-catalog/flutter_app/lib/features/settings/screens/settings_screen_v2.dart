import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/themes/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../features/auth/providers/auth_riverpod.dart';
import '../../../shared/widgets/w_card.dart';

class SettingsScreenV2 extends ConsumerWidget {
  const SettingsScreenV2({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        // Profile card
        WCard(
          padding: const EdgeInsets.all(20),
          child: Row(children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: Text(
                  user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'U',
                  style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(user?.name ?? '—',
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 16)),
              Text(user?.email ?? '—',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(30),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  (user?.role ?? '').replaceAll('_', ' ').toUpperCase(),
                  style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                ),
              ),
            ])),
          ]),
        ),
        const SizedBox(height: 24),

        // App info
        const _SectionLabel('Application'),
        const SizedBox(height: 8),
        WCard(
          child: Column(children: [
            _InfoTile(icon: Icons.cloud_rounded, label: 'Backend URL', value: ApiEndpoints.baseUrl),
            _InfoTile(icon: Icons.info_rounded,   label: 'App Version',  value: 'v3.0.0 — Enterprise'),
            _InfoTile(icon: Icons.business_rounded, label: 'Company',   value: 'DaralIraq'),
          ]),
        ),
        const SizedBox(height: 24),

        // Sign out
        const _SectionLabel('Account'),
        const SizedBox(height: 8),
        WCard(
          child: ListTile(
            leading: const Icon(Icons.logout_rounded, color: AppColors.danger),
            title: const Text('Sign Out', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
            trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
            onTap: () => _confirmSignOut(context, ref),
          ),
        ),
      ],
    );
  }

  void _confirmSignOut(BuildContext context, WidgetRef ref) {
    showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () {
              Navigator.pop(context);
              ref.read(authProvider.notifier).logout();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel(this.label);
  @override
  Widget build(BuildContext context) => Text(label,
      style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.8));
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String   label, value;
  const _InfoTile({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.borderDark))),
    child: Row(children: [
      Icon(icon, size: 18, color: AppColors.textSecondary),
      const SizedBox(width: 12),
      Expanded(child: Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13))),
      Flexible(child: Text(value,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
          textAlign: TextAlign.right,
          overflow: TextOverflow.ellipsis)),
    ]),
  );
}
