import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../config/themes/app_colors.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../categories/presentation/providers/category_provider.dart';

class ManageCategoriesPage extends ConsumerWidget {
  const ManageCategoriesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncCats = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Categories',
            style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCategoryDialog(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Category'),
        backgroundColor: AppColors.primary,
      ),
      body: asyncCats.when(
        loading: () => const LoadingWidget(),
        error: (err, _) => Center(child: Text('Error: $err')),
        data: (categories) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: categories.length,
          itemBuilder: (ctx, i) {
            final cat = categories[i];
            final name = cat.name.en;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ExpansionTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withAlpha(26),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: cat.icon != null
                        ? Text(cat.icon!, style: const TextStyle(fontSize: 20))
                        : const Icon(Icons.category_rounded,
                            color: AppColors.primary),
                  ),
                ),
                title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit_rounded, size: 20),
                      onPressed: () =>
                          _showCategoryDialog(context, ref, category: cat),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_rounded,
                          size: 20, color: AppColors.error),
                      onPressed: () => _confirmDelete(context, ref, cat.id, name),
                    ),
                  ],
                ),
                children: cat.children.map((sub) => ListTile(
                  contentPadding: const EdgeInsets.only(left: 56, right: 16),
                  title: Text(sub.name.en),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit_rounded, size: 18),
                        onPressed: () =>
                            _showCategoryDialog(context, ref, category: sub),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_rounded,
                            size: 18, color: AppColors.error),
                        onPressed: () =>
                            _confirmDelete(context, ref, sub.id, sub.name.en),
                      ),
                    ],
                  ),
                )).toList(),
              ),
            );
          },
        ),
      ),
    );
  }

  void _showCategoryDialog(BuildContext context, WidgetRef ref,
      {dynamic category}) {
    showDialog(
      context: context,
      builder: (_) => _CategoryDialog(category: category, ref: ref),
    );
  }

  void _confirmDelete(
      BuildContext context, WidgetRef ref, String id, String name) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Category'),
        content: Text('Delete "$name"? Subcategories will also be removed.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () async {
              Navigator.pop(ctx);
              final ds = ref.read(categoryDataSourceProvider);
              await ds.deleteCategory(id);
              ref.invalidate(categoriesProvider);
              ref.invalidate(flatCategoriesProvider);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

class _CategoryDialog extends StatefulWidget {
  final dynamic category;
  final WidgetRef ref;
  const _CategoryDialog({this.category, required this.ref});

  @override
  State<_CategoryDialog> createState() => _CategoryDialogState();
}

class _CategoryDialogState extends State<_CategoryDialog> {
  final _nameEnCtrl = TextEditingController();
  final _nameArCtrl = TextEditingController();
  final _nameKuCtrl = TextEditingController();
  final _iconCtrl = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.category != null) {
      _nameEnCtrl.text = widget.category.name.en;
      _nameArCtrl.text = widget.category.name.ar;
      _nameKuCtrl.text = widget.category.name.ku;
      _iconCtrl.text = widget.category.icon ?? '';
    }
  }

  @override
  void dispose() {
    _nameEnCtrl.dispose();
    _nameArCtrl.dispose();
    _nameKuCtrl.dispose();
    _iconCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.category != null;
    return AlertDialog(
      title: Text(isEditing ? 'Edit Category' : 'Add Category'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameEnCtrl,
              decoration: const InputDecoration(labelText: 'Name (English) *'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _nameArCtrl,
              decoration: const InputDecoration(labelText: 'Name (Arabic)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _nameKuCtrl,
              decoration: const InputDecoration(labelText: 'Name (Kurdish)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _iconCtrl,
              decoration: const InputDecoration(
                  labelText: 'Icon (emoji)', hintText: 'e.g. 📱'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _isLoading ? null : _save,
          child: _isLoading
              ? const SizedBox(
                  width: 16, height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(isEditing ? 'Update' : 'Create'),
        ),
      ],
    );
  }

  Future<void> _save() async {
    if (_nameEnCtrl.text.trim().isEmpty) return;
    setState(() => _isLoading = true);
    try {
      final ds = widget.ref.read(categoryDataSourceProvider);
      final data = {
        'name': {
          'en': _nameEnCtrl.text.trim(),
          'ar': _nameArCtrl.text.trim(),
          'ku': _nameKuCtrl.text.trim(),
        },
        if (_iconCtrl.text.isNotEmpty) 'icon': _iconCtrl.text.trim(),
      };
      if (widget.category != null) {
        await ds.updateCategory(widget.category.id, data);
      } else {
        await ds.createCategory(data);
      }
      widget.ref.invalidate(categoriesProvider);
      widget.ref.invalidate(flatCategoriesProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
