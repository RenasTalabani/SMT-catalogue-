import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'dart:io' show File;
import '../../../../core/api/api_client.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../config/themes/app_colors.dart';
import '../../../categories/presentation/providers/category_provider.dart';
import '../../../products/presentation/providers/product_provider.dart';

class AddProductPage extends ConsumerStatefulWidget {
  final String? productId;
  const AddProductPage({super.key, this.productId});

  @override
  ConsumerState<AddProductPage> createState() => _AddProductPageState();
}

class _AddProductPageState extends ConsumerState<AddProductPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameEnCtrl = TextEditingController();
  final _nameArCtrl = TextEditingController();
  final _nameKuCtrl = TextEditingController();
  final _descEnCtrl = TextEditingController();
  final _descArCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _comparePriceCtrl = TextEditingController();
  final _stockCtrl = TextEditingController(text: '0');
  final _tagsCtrl = TextEditingController();

  String? _selectedCategory;     // holds the category id (for subcategory filter)
  String? _selectedCategoryName; // holds the category name (sent to backend)
  String? _selectedSubCategory;
  bool _isActive = true;
  bool _isFeatured = false;
  final List<XFile> _pickedImages = [];
  bool _isLoading = false;
  bool _isLoadingProduct = false;
  String? _errorMsg;
  List<String> _existingImageUrls = [];

  bool get _isEditing => widget.productId != null;

  @override
  void initState() {
    super.initState();
    if (_isEditing) _loadExistingProduct();
  }

  Future<void> _loadExistingProduct() async {
    setState(() { _isLoadingProduct = true; _errorMsg = null; });
    try {
      final res = await ApiClient().get('${ApiEndpoints.products}/${widget.productId}');
      final p   = (res.data['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      // Build the existing image list from the gallery; fall back to imageUrl
      final rawImages = p['images'] as List<dynamic>?;
      final urls = rawImages != null && rawImages.isNotEmpty
          ? rawImages.map((img) => '${(img as Map)['url']}').toList()
          : (p['imageUrl'] != null ? ['${p['imageUrl']}'] : <String>[]);

      setState(() {
        _nameEnCtrl.text      = (p['name']        as String?) ?? '';
        _descEnCtrl.text      = (p['description'] as String?) ?? '';
        _priceCtrl.text       = '${p['price']     ?? ''}';
        _stockCtrl.text       = '${p['quantity']  ?? '0'}';
        _isActive             = (p['isActive']    as bool?) ?? true;
        _existingImageUrls    = urls;
        _selectedCategoryName = p['category']     as String?;
      });
    } catch (e) {
      setState(() => _errorMsg = 'Failed to load product: $e');
    } finally {
      if (mounted) setState(() => _isLoadingProduct = false);
    }
  }

  @override
  void dispose() {
    _nameEnCtrl.dispose(); _nameArCtrl.dispose(); _nameKuCtrl.dispose();
    _descEnCtrl.dispose(); _descArCtrl.dispose();
    _priceCtrl.dispose(); _comparePriceCtrl.dispose();
    _stockCtrl.dispose(); _tagsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncCategories = ref.watch(flatCategoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Product' : 'Add Product',
            style: const TextStyle(fontWeight: FontWeight.w700)),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: _isLoadingProduct
          ? const Center(child: CircularProgressIndicator())
          : Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (_errorMsg != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.error.withAlpha(26),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.error.withAlpha(77)),
                ),
                child: Text(_errorMsg!,
                    style: const TextStyle(color: AppColors.error)),
              ),

            // Image upload
            const _SectionHeader('Product Images'),
            _ImagePicker(
              pickedImages:       _pickedImages,
              existingImageUrls:  _existingImageUrls,
              onPick:             _pickImages,
              onRemove:           (i) => setState(() => _pickedImages.removeAt(i)),
              onRemoveExisting:   (i) => setState(() => _existingImageUrls.removeAt(i)),
            ),
            const SizedBox(height: 20),

            // Name (multilingual)
            const _SectionHeader('Product Name'),
            _FormField(
              controller: _nameEnCtrl,
              label: 'Name (English) *',
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 10),
            _FormField(controller: _nameArCtrl, label: 'Name (Arabic)'),
            const SizedBox(height: 10),
            _FormField(controller: _nameKuCtrl, label: 'Name (Kurdish)'),
            const SizedBox(height: 20),

            // Description
            const _SectionHeader('Description'),
            _FormField(controller: _descEnCtrl, label: 'Description (English)', maxLines: 4),
            const SizedBox(height: 10),
            _FormField(controller: _descArCtrl, label: 'Description (Arabic)', maxLines: 3),
            const SizedBox(height: 20),

            // Pricing
            const _SectionHeader('Pricing'),
            Row(
              children: [
                Expanded(
                  child: _FormField(
                    controller: _priceCtrl,
                    label: 'Price *',
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      if (v!.isEmpty) return 'Required';
                      if (double.tryParse(v) == null) return 'Invalid price';
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _FormField(
                    controller: _comparePriceCtrl,
                    label: 'Compare Price',
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _FormField(
              controller: _stockCtrl,
              label: 'Stock',
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 20),

            // Category
            const _SectionHeader('Category'),
            asyncCategories.when(
              loading: () => const CircularProgressIndicator(),
              error: (e, _) => Text('Failed to load categories: $e'),
              data: (cats) => Column(
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _selectedCategory,
                    decoration: const InputDecoration(labelText: 'Category *'),
                    hint: const Text('Select category'),
                    items: cats
                        .where((c) => c.isRoot)
                        .map((c) => DropdownMenuItem(
                              value: c.id,
                              child: Text(c.name.en),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() {
                      _selectedCategory = v;
                      _selectedCategoryName = cats.where((c) => c.id == v).firstOrNull?.name.en;
                      _selectedSubCategory = null;
                    }),
                    validator: (v) => (v == null && _selectedCategoryName == null) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  if (_selectedCategory != null)
                    DropdownButtonFormField<String>(
                      initialValue: _selectedSubCategory,
                      decoration: const InputDecoration(labelText: 'Sub-category'),
                      hint: const Text('Select sub-category'),
                      items: cats
                          .where((c) => c.parentId == _selectedCategory)
                          .map((c) => DropdownMenuItem(
                                value: c.id,
                                child: Text(c.name.en),
                              ))
                          .toList(),
                      onChanged: (v) => setState(() => _selectedSubCategory = v),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Tags
            const _SectionHeader('Tags'),
            _FormField(
              controller: _tagsCtrl,
              label: 'Tags (comma-separated)',
              hint: 'e.g. electronics, new, featured',
            ),
            const SizedBox(height: 20),

            // Toggles
            const _SectionHeader('Settings'),
            Card(
              child: Column(
                children: [
                  SwitchListTile(
                    title: const Text('Active'),
                    subtitle: const Text('Visible to customers'),
                    value: _isActive,
                    onChanged: (v) => setState(() => _isActive = v),
                    activeThumbColor: AppColors.primary,
                    activeTrackColor: AppColors.primary.withAlpha(77),
                  ),
                  SwitchListTile(
                    title: const Text('Featured'),
                    subtitle: const Text('Show in featured section'),
                    value: _isFeatured,
                    onChanged: (v) => setState(() => _isFeatured = v),
                    activeThumbColor: AppColors.primary,
                    activeTrackColor: AppColors.primary.withAlpha(77),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Submit button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton(
                onPressed: _isLoading ? null : _submit,
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text(_isEditing ? 'Update Product' : 'Create Product',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final images = await picker.pickMultiImage(imageQuality: 85);
    if (images.isNotEmpty) {
      setState(() => _pickedImages.addAll(images));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() { _isLoading = true; _errorMsg = null; });

    try {
      final client = ref.read(apiClientProvider);

      // Build flat FormData matching backend: name, price, quantity, category, description, image
      final formData = FormData();
      formData.fields.addAll([
        MapEntry('name',     _nameEnCtrl.text.trim()),
        MapEntry('price',    _priceCtrl.text.trim()),
        MapEntry('quantity', _stockCtrl.text.trim().isEmpty ? '0' : _stockCtrl.text.trim()),
        MapEntry('category', _selectedCategoryName ?? _selectedCategory ?? ''),
        MapEntry('isActive', _isActive.toString()),
      ]);
      if (_descEnCtrl.text.trim().isNotEmpty) {
        formData.fields.add(MapEntry('description', _descEnCtrl.text.trim()));
      }
      // Attach all picked images under the key "images"
      for (final f in _pickedImages) {
        final bytes = await f.readAsBytes();
        formData.files.add(MapEntry('images',
            MultipartFile.fromBytes(bytes, filename: f.name)));
      }

      if (_isEditing) {
        await client.put<Map<String, dynamic>>(
          '${ApiEndpoints.products}/${widget.productId}',
          data: formData,
        );
      } else {
        await client.post<Map<String, dynamic>>(
          ApiEndpoints.products,
          data: formData,
        );
      }

      if (mounted) {
        ref.invalidate(productsProvider);
        context.pop();
      }
    } on DioException catch (e) {
      // _ErrorInterceptor stores the typed exception in e.error
      final inner = e.error;
      if (inner is ServerException) {
        setState(() => _errorMsg = inner.message);
      } else if (inner is NetworkException) {
        setState(() => _errorMsg = inner.message);
      } else if (inner is NotFoundException) {
        setState(() => _errorMsg = inner.message);
      } else {
        final data = e.response?.data;
        final msg  = data is Map ? (data['message'] as String?) : null;
        setState(() => _errorMsg = msg ?? e.message ?? 'Request failed');
      }
    } catch (e) {
      setState(() => _errorMsg = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        title,
        style: Theme.of(context)
            .textTheme
            .titleSmall
            ?.copyWith(fontWeight: FontWeight.w700, color: AppColors.primary),
      ),
    );
  }
}

class _FormField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final int maxLines;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;

  const _FormField({
    required this.controller,
    required this.label,
    this.hint,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: InputDecoration(labelText: label, hintText: hint),
      validator: validator,
    );
  }
}

class _ImagePicker extends StatelessWidget {
  final List<XFile>  pickedImages;
  final List<String> existingImageUrls;
  final VoidCallback          onPick;
  final void Function(int)    onRemove;
  final void Function(int)    onRemoveExisting;

  const _ImagePicker({
    required this.pickedImages,
    required this.existingImageUrls,
    required this.onPick,
    required this.onRemove,
    required this.onRemoveExisting,
  });

  Widget _removeBadge(VoidCallback onTap) => Positioned(
    top: 2, right: 2,
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        width: 20, height: 20,
        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
        child: const Icon(Icons.close, color: Colors.white, size: 12),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final hasAny = existingImageUrls.isNotEmpty || pickedImages.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (hasAny) ...[
          SizedBox(
            height: 104,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                // ── Existing server images ──────────────────────────────
                for (int i = 0; i < existingImageUrls.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Stack(clipBehavior: Clip.none, children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.network(
                          existingImageUrls[i],
                          width: 100, height: 100, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 100, height: 100,
                            decoration: BoxDecoration(
                              color: AppColors.borderDark,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.broken_image_rounded,
                                color: AppColors.textMuted),
                          ),
                        ),
                      ),
                      _removeBadge(() => onRemoveExisting(i)),
                    ]),
                  ),

                // ── Newly picked local images ───────────────────────────
                for (int i = 0; i < pickedImages.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Stack(clipBehavior: Clip.none, children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: kIsWeb
                            ? Image.network(pickedImages[i].path,
                                width: 100, height: 100, fit: BoxFit.cover)
                            : Image.file(File(pickedImages[i].path),
                                width: 100, height: 100, fit: BoxFit.cover),
                      ),
                      _removeBadge(() => onRemove(i)),
                    ]),
                  ),

                // ── Add-more tile ───────────────────────────────────────
                GestureDetector(
                  onTap: onPick,
                  child: Container(
                    width: 100, height: 100,
                    decoration: BoxDecoration(
                      color: AppColors.cardDark,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: AppColors.primary.withAlpha(80),
                        style: BorderStyle.solid,
                      ),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_photo_alternate_outlined,
                            color: AppColors.primary, size: 26),
                        SizedBox(height: 4),
                        Text('Add more',
                            style: TextStyle(
                                color: AppColors.primary, fontSize: 10)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ] else ...[
          // ── Empty state: big dashed upload zone ─────────────────────
          GestureDetector(
            onTap: onPick,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 28),
              decoration: BoxDecoration(
                color: AppColors.cardDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.borderDark,
                  style: BorderStyle.solid,
                ),
              ),
              child: const Column(
                children: [
                  Icon(Icons.add_photo_alternate_outlined,
                      color: AppColors.textMuted, size: 32),
                  SizedBox(height: 8),
                  Text('Tap to add photos',
                      style: TextStyle(
                          color: AppColors.textSecondary, fontSize: 13)),
                  SizedBox(height: 4),
                  Text('JPEG, PNG or WebP · up to 10 images · max 5 MB each',
                      style: TextStyle(
                          color: AppColors.textMuted, fontSize: 10)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}
