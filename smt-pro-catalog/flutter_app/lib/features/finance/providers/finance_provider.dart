import 'package:flutter/material.dart';
import '../../../core/errors/api_exception.dart';
import '../models/finance_model.dart';
import '../services/finance_service.dart';

class FinanceProvider extends ChangeNotifier {
  final _service = FinanceService();

  ProfitLossModel?  _pl;
  List<ExpenseModel> _expenses = [];
  List<IncomeModel>  _incomes  = [];
  bool    _loadingPL       = false;
  bool    _loadingExpenses = false;
  bool    _loadingIncomes  = false;
  String? _plError;
  String? _expensesError;
  String? _incomesError;

  ProfitLossModel?  get pl               => _pl;
  List<ExpenseModel> get expenses        => _expenses;
  List<IncomeModel>  get incomes         => _incomes;
  bool               get loadingPL       => _loadingPL;
  bool               get loadingExpenses => _loadingExpenses;
  bool               get loadingIncomes  => _loadingIncomes;
  String?            get plError         => _plError;
  String?            get expensesError   => _expensesError;
  String?            get incomesError    => _incomesError;

  Future<void> loadAll() async {
    await Future.wait([loadPL(), loadExpenses(), loadIncomes()]);
  }

  Future<void> loadPL() async {
    _loadingPL = true; _plError = null; notifyListeners();
    try { _pl = await _service.getProfitLoss(); }
    on ApiException catch (e) { _plError = e.userMessage; }
    catch (_) { _plError = 'Failed to load P&L'; }
    _loadingPL = false; notifyListeners();
  }

  Future<void> loadExpenses() async {
    _loadingExpenses = true; _expensesError = null; notifyListeners();
    try { _expenses = await _service.getExpenses(); }
    on ApiException catch (e) { _expensesError = e.userMessage; }
    catch (_) { _expensesError = 'Failed to load expenses'; }
    _loadingExpenses = false; notifyListeners();
  }

  Future<void> loadIncomes() async {
    _loadingIncomes = true; _incomesError = null; notifyListeners();
    try { _incomes = await _service.getIncomes(); }
    on ApiException catch (e) { _incomesError = e.userMessage; }
    catch (_) { _incomesError = 'Failed to load incomes'; }
    _loadingIncomes = false; notifyListeners();
  }

  Future<String?> addExpense({required double amount, required String category, String? notes}) async {
    try {
      final e = await _service.createExpense(amount: amount, category: category, notes: notes);
      _expenses.insert(0, e); notifyListeners(); loadPL();
      return null;
    } on ApiException catch (e) { return e.userMessage; }
    catch (_) { return 'Failed to add expense'; }
  }

  Future<String?> deleteExpense(int id) async {
    try {
      await _service.deleteExpense(id);
      _expenses.removeWhere((e) => e.id == id); notifyListeners(); loadPL();
      return null;
    } on ApiException catch (e) { return e.userMessage; }
    catch (_) { return 'Failed to delete expense'; }
  }

  Future<String?> addIncome({required double amount, required String source, String? notes}) async {
    try {
      final i = await _service.createIncome(amount: amount, source: source, notes: notes);
      _incomes.insert(0, i); notifyListeners(); loadPL();
      return null;
    } on ApiException catch (e) { return e.userMessage; }
    catch (_) { return 'Failed to add income'; }
  }

  Future<String?> deleteIncome(int id) async {
    try {
      await _service.deleteIncome(id);
      _incomes.removeWhere((i) => i.id == id); notifyListeners(); loadPL();
      return null;
    } on ApiException catch (e) { return e.userMessage; }
    catch (_) { return 'Failed to delete income'; }
  }
}
