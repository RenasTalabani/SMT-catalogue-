import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../models/finance_model.dart';

class FinanceService {
  final _client = ApiClient();

  Future<ProfitLossModel> getProfitLoss({String? from, String? to}) async {
    final res = await _client.get(ApiEndpoints.profitLoss, params: {
      if (from != null) 'from': from,
      if (to   != null) 'to':   to,
    });
    return ProfitLossModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<List<ExpenseModel>> getExpenses() async {
    final res = await _client.get(ApiEndpoints.expenses);
    return (res.data['data'] as List)
        .map((e) => ExpenseModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ExpenseModel> createExpense({
    required double amount,
    required String category,
    String?         notes,
  }) async {
    final res = await _client.post(ApiEndpoints.expenses, data: {
      'amount':   amount,
      'category': category,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    return ExpenseModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<void> deleteExpense(int id) async {
    await _client.delete('${ApiEndpoints.expenses}/$id');
  }

  Future<List<IncomeModel>> getIncomes() async {
    final res = await _client.get(ApiEndpoints.incomes);
    return (res.data['data'] as List)
        .map((e) => IncomeModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<IncomeModel> createIncome({
    required double amount,
    required String source,
    String?         notes,
  }) async {
    final res = await _client.post(ApiEndpoints.incomes, data: {
      'amount': amount,
      'source': source,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    return IncomeModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<void> deleteIncome(int id) async {
    await _client.delete('${ApiEndpoints.incomes}/$id');
  }
}
