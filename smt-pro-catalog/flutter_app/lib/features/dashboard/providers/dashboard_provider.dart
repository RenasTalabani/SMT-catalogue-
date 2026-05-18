import 'package:flutter/material.dart';
import '../models/dashboard_model.dart';
import '../services/dashboard_service.dart';

class DashboardProvider extends ChangeNotifier {
  DashboardModel?       _summary;
  List<TopProductModel> _topProducts = [];
  bool   _loading = false;
  String? _error;

  DashboardModel?       get summary     => _summary;
  List<TopProductModel> get topProducts => _topProducts;
  bool                  get isLoading   => _loading;
  String?               get error       => _error;

  final _service = DashboardService();

  Future<void> load() async {
    _loading = true;
    _error   = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _service.getSummary(),
        _service.getTopProducts(),
      ]);
      _summary     = results[0] as DashboardModel;
      _topProducts = results[1] as List<TopProductModel>;
    } catch (e) {
      _error = 'Failed to load dashboard data';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
