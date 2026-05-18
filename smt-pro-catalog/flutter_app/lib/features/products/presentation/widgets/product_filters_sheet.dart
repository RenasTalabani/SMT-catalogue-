import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/product_provider.dart';
import '../../../../config/themes/app_colors.dart';

class ProductFiltersSheet extends ConsumerStatefulWidget {
  const ProductFiltersSheet({super.key});

  @override
  ConsumerState<ProductFiltersSheet> createState() => _ProductFiltersSheetState();
}

class _ProductFiltersSheetState extends ConsumerState<ProductFiltersSheet> {
  late RangeValues _priceRange;
  String _sortBy = 'createdAt';
  String _sortOrder = 'desc';
  static const double _maxPrice = 10000;

  @override
  void initState() {
    super.initState();
    final params = ref.read(productFilterProvider).params;
    _priceRange = RangeValues(
      params.minPrice ?? 0,
      params.maxPrice ?? _maxPrice,
    );
    _sortBy = params.sortBy;
    _sortOrder = params.sortOrder;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Filters & Sort',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w700)),
              TextButton(
                onPressed: _reset,
                child: const Text('Reset All'),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Sort options
          Text('Sort By',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondaryLight,
                  )),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              _SortChip(label: 'Newest', value: 'createdAt', order: 'desc', current: _sortBy, currentOrder: _sortOrder, onTap: _setSort),
              _SortChip(label: 'Oldest', value: 'createdAt', order: 'asc', current: _sortBy, currentOrder: _sortOrder, onTap: _setSort),
              _SortChip(label: 'Price ↑', value: 'price', order: 'asc', current: _sortBy, currentOrder: _sortOrder, onTap: _setSort),
              _SortChip(label: 'Price ↓', value: 'price', order: 'desc', current: _sortBy, currentOrder: _sortOrder, onTap: _setSort),
              _SortChip(label: 'Popular', value: 'viewCount', order: 'desc', current: _sortBy, currentOrder: _sortOrder, onTap: _setSort),
            ],
          ),
          const SizedBox(height: 20),

          // Price range
          Text('Price Range',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondaryLight,
                  )),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('\$${_priceRange.start.toInt()}'),
              Text('\$${_priceRange.end.toInt()}'),
            ],
          ),
          RangeSlider(
            values: _priceRange,
            min: 0,
            max: _maxPrice,
            divisions: 200,
            activeColor: AppColors.primary,
            onChanged: (v) => setState(() => _priceRange = v),
          ),
          const SizedBox(height: 24),

          // Apply button
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _apply,
              child: const Text('Apply Filters'),
            ),
          ),
        ],
      ),
    );
  }

  void _setSort(String sortBy, String sortOrder) {
    setState(() {
      _sortBy = sortBy;
      _sortOrder = sortOrder;
    });
  }

  void _apply() {
    final notifier = ref.read(productFilterProvider.notifier);
    notifier.updateSort(_sortBy, _sortOrder);
    notifier.updatePriceRange(
      _priceRange.start > 0 ? _priceRange.start : null,
      _priceRange.end < _maxPrice ? _priceRange.end : null,
    );
    Navigator.pop(context);
  }

  void _reset() {
    ref.read(productFilterProvider.notifier).reset();
    Navigator.pop(context);
  }
}

class _SortChip extends StatelessWidget {
  final String label;
  final String value;
  final String order;
  final String current;
  final String currentOrder;
  final void Function(String, String) onTap;

  const _SortChip({
    required this.label,
    required this.value,
    required this.order,
    required this.current,
    required this.currentOrder,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final selected = current == value && currentOrder == order;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(value, order),
      selectedColor: AppColors.primary.withAlpha(38),
      checkmarkColor: AppColors.primary,
    );
  }
}
