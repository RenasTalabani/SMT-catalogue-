import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/category_provider.dart';
import '../../domain/entities/category.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/error_widget.dart';
import '../../../../config/themes/app_colors.dart';
import '../../../products/presentation/providers/product_provider.dart';

class CategoriesPage extends ConsumerWidget {
  const CategoriesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncCategories = ref.watch(categoriesProvider);
    final locale = Localizations.localeOf(context).languageCode;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Categories', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: asyncCategories.when(
        loading: () => const LoadingWidget(),
        error: (err, _) => AppErrorWidget(
          message: err.toString(),
          onRetry: () => ref.invalidate(categoriesProvider),
        ),
        data: (categories) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: categories.length,
          itemBuilder: (ctx, i) => _CategoryItem(
            category: categories[i],
            locale: locale,
          )
              .animate()
              .fadeIn(delay: Duration(milliseconds: i * 50))
              .slideX(begin: -0.05),
        ),
      ),
    );
  }
}

class _CategoryItem extends ConsumerWidget {
  final Category category;
  final String locale;

  const _CategoryItem({required this.category, required this.locale});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = category.name.get(locale);

    if (!category.hasChildren) {
      return _CategoryTile(category: category, name: name, locale: locale, ref: ref);
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: _CategoryIcon(icon: category.icon),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
        children: category.children
            .map((sub) => Padding(
                  padding: const EdgeInsets.only(left: 16),
                  child: _CategoryTile(
                    category: sub,
                    name: sub.name.get(locale),
                    locale: locale,
                    ref: ref,
                    isSubcat: true,
                  ),
                ))
            .toList(),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  final Category category;
  final String name;
  final String locale;
  final WidgetRef ref;
  final bool isSubcat;

  const _CategoryTile({
    required this.category,
    required this.name,
    required this.locale,
    required this.ref,
    this.isSubcat = false,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: isSubcat ? null : _CategoryIcon(icon: category.icon),
      title: Text(name,
          style: TextStyle(
            fontWeight: isSubcat ? FontWeight.normal : FontWeight.w600,
            fontSize: isSubcat ? 14 : 15,
          )),
      trailing: const Icon(Icons.chevron_right_rounded, size: 20),
      onTap: () {
        ref.read(productFilterProvider.notifier).updateCategory(category.id);
        DefaultTabController.of(context).animateTo(0);
      },
    );
  }
}

class _CategoryIcon extends StatelessWidget {
  final String? icon;
  const _CategoryIcon({this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.primary.withAlpha(26),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Center(
        child: icon != null && icon!.isNotEmpty
            ? Text(icon!, style: const TextStyle(fontSize: 22))
            : const Icon(Icons.category_rounded,
                color: AppColors.primary, size: 22),
      ),
    );
  }
}
