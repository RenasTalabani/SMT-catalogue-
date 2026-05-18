class ExpenseModel {
  final int     id;
  final double  amount;
  final String  category;
  final String? notes;
  final DateTime createdAt;

  const ExpenseModel({
    required this.id, required this.amount,
    required this.category, this.notes, required this.createdAt,
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> j) => ExpenseModel(
    id:        j['id'] as int,
    amount:    (j['amount'] as num).toDouble(),
    category:  j['category'] as String,
    notes:     j['notes'] as String?,
    createdAt: DateTime.parse(j['createdAt'] as String),
  );
}

class IncomeModel {
  final int     id;
  final double  amount;
  final String  source;
  final String? notes;
  final DateTime createdAt;

  const IncomeModel({
    required this.id, required this.amount,
    required this.source, this.notes, required this.createdAt,
  });

  factory IncomeModel.fromJson(Map<String, dynamic> j) => IncomeModel(
    id:        j['id'] as int,
    amount:    (j['amount'] as num).toDouble(),
    source:    j['source'] as String,
    notes:     j['notes'] as String?,
    createdAt: DateTime.parse(j['createdAt'] as String),
  );
}

class ProfitLossModel {
  final double totalRevenue;
  final double totalExpenses;
  final double totalManualIncome;
  final double netProfit;
  final double profitMargin;

  const ProfitLossModel({
    required this.totalRevenue,
    required this.totalExpenses,
    required this.totalManualIncome,
    required this.netProfit,
    required this.profitMargin,
  });

  factory ProfitLossModel.fromJson(Map<String, dynamic> j) => ProfitLossModel(
    totalRevenue:      (j['totalRevenue']      as num?)?.toDouble() ?? 0,
    totalExpenses:     (j['totalExpenses']     as num?)?.toDouble() ?? 0,
    totalManualIncome: (j['totalManualIncome'] as num?)?.toDouble() ?? 0,
    netProfit:         (j['netProfit']         as num?)?.toDouble() ?? 0,
    profitMargin:      (j['profitMargin']      as num?)?.toDouble() ?? 0,
  );
}
