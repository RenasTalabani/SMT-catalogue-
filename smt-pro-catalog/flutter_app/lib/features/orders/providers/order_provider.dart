import 'package:flutter/material.dart';
import '../../../core/errors/api_exception.dart';
import '../models/order_model.dart';
import '../services/order_service.dart';

class OrderProvider extends ChangeNotifier {
  final _service = OrderService();

  List<OrderModel> _orders  = [];
  bool             _loading = false;
  String?          _error;
  String           _filter  = 'ALL';

  List<OrderModel> get orders  => _filter == 'ALL'
      ? _orders
      : _orders.where((o) => o.status == _filter).toList();
  bool             get loading => _loading;
  String?          get error   => _error;
  String           get filter  => _filter;

  void setFilter(String f) { _filter = f; notifyListeners(); }

  Future<void> load({bool adminView = true}) async {
    _loading = true; _error = null; notifyListeners();
    try {
      _orders = adminView ? await _service.getAll() : await _service.getMy();
    } on ApiException catch (e) {
      _error = e.userMessage;
    } catch (_) {
      _error = 'Failed to load orders';
    }
    _loading = false; notifyListeners();
  }

  Future<String?> createOrder(List<Map<String, dynamic>> items) async {
    try {
      final order = await _service.create(items);
      _orders.insert(0, order);
      notifyListeners();
      return null;
    } on ApiException catch (e) { return e.userMessage; }
    catch (_) { return 'Failed to create order'; }
  }

  Future<String?> updateStatus(int id, String status) async {
    try {
      final updated = await _service.updateStatus(id, status);
      final idx = _orders.indexWhere((o) => o.id == id);
      if (idx != -1) { _orders[idx] = updated; notifyListeners(); }
      return null;
    } on ApiException catch (e) { return e.userMessage; }
    catch (_) { return 'Failed to update status'; }
  }
}
