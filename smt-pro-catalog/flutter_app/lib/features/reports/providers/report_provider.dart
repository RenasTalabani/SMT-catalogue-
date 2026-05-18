import 'package:flutter/material.dart';
import '../models/report_models.dart';
import '../services/report_service.dart';

class ReportProvider extends ChangeNotifier {
  MonthlyReportModel? _monthly;
  List<LowStockModel> _lowStock = [];
  bool    _loadingMonthly  = false;
  bool    _loadingLowStock = false;
  String? _monthlyError;
  String? _lowStockError;

  int _selectedYear  = DateTime.now().year;
  int _selectedMonth = DateTime.now().month;

  MonthlyReportModel? get monthly          => _monthly;
  List<LowStockModel> get lowStock         => _lowStock;
  bool                get loadingMonthly   => _loadingMonthly;
  bool                get loadingLowStock  => _loadingLowStock;
  String?             get monthlyError     => _monthlyError;
  String?             get lowStockError    => _lowStockError;
  int                 get selectedYear     => _selectedYear;
  int                 get selectedMonth    => _selectedMonth;

  final _service = ReportService();

  void setYearMonth(int year, int month) {
    _selectedYear  = year;
    _selectedMonth = month;
    loadMonthly();
  }

  Future<void> loadMonthly() async {
    _loadingMonthly = true;
    _monthlyError   = null;
    notifyListeners();
    try {
      _monthly = await _service.getMonthlyReport(_selectedYear, _selectedMonth);
    } catch (_) {
      _monthlyError = 'Failed to load monthly report';
    } finally {
      _loadingMonthly = false;
      notifyListeners();
    }
  }

  Future<void> loadLowStock({int threshold = 5}) async {
    _loadingLowStock = true;
    _lowStockError   = null;
    notifyListeners();
    try {
      _lowStock = await _service.getLowStock(threshold: threshold);
    } catch (_) {
      _lowStockError = 'Failed to load low stock data';
    } finally {
      _loadingLowStock = false;
      notifyListeners();
    }
  }
}
