import 'package:flutter/material.dart';
import '../../../core/errors/api_exception.dart';
import '../models/product_model.dart';
import '../services/product_service.dart';

class ProductProvider extends ChangeNotifier {
  final _service = ProductService();

  List<ProductModel> _products    = [];
  bool               _loading     = false;
  String?            _error;
  String             _search      = '';
  String             _category    = '';

  List<ProductModel> get products => _products;
  bool               get loading  => _loading;
  String?            get error    => _error;
  String             get search   => _search;
  String             get category => _category;

  List<String> get categories {
    final cats = _products.map((p) => p.category).toSet().toList()..sort();
    return cats;
  }

  Future<void> load({String? search, String? category}) async {
    _search   = search   ?? _search;
    _category = category ?? _category;
    _loading  = true;
    _error    = null;
    notifyListeners();
    try {
      _products = await _service.getAll(
        search:   _search.isNotEmpty   ? _search   : null,
        category: _category.isNotEmpty ? _category : null,
      );
    } on ApiException catch (e) {
      _error = e.userMessage;
    } catch (e) {
      _error = 'Failed to load products';
    }
    _loading = false;
    notifyListeners();
  }

  void setSearch(String v)   { _search = v;   load(); }
  void setCategory(String v) { _category = v; load(); }
  void clearFilters()        { _search = ''; _category = ''; load(); }

  Future<String?> createProduct({
    required String name,
    required double price,
    required int    quantity,
    required String category,
    String?         description,
  }) async {
    try {
      final p = await _service.create(
        name: name, price: price, quantity: quantity,
        category: category, description: description,
      );
      _products.insert(0, p);
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.userMessage;
    } catch (_) {
      return 'Failed to create product';
    }
  }

  Future<String?> updateProduct(int id, Map<String, dynamic> updates) async {
    try {
      final updated = await _service.update(id, updates);
      final idx = _products.indexWhere((p) => p.id == id);
      if (idx != -1) { _products[idx] = updated; notifyListeners(); }
      return null;
    } on ApiException catch (e) {
      return e.userMessage;
    } catch (_) {
      return 'Failed to update product';
    }
  }

  Future<String?> deleteProduct(int id) async {
    try {
      await _service.delete(id);
      _products.removeWhere((p) => p.id == id);
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.userMessage;
    } catch (_) {
      return 'Failed to delete product';
    }
  }
}
