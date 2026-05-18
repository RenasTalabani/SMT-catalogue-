import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/finance_provider.dart';

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});
  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FinanceProvider>().loadAll();
    });
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<FinanceProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      body: NestedScrollView(
        headerSliverBuilder: (_, __) => [
          SliverAppBar(
            pinned: true,
            backgroundColor: const Color(0xFF0F172A),
            title: const Text('Finance', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
                onPressed: () => prov.loadAll(),
              ),
            ],
            bottom: TabBar(
              controller: _tabs,
              indicatorColor: Colors.white,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white54,
              tabs: const [
                Tab(text: 'P & L'),
                Tab(text: 'Expenses'),
                Tab(text: 'Incomes'),
              ],
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabs,
          children: [
            _PLTab(prov: prov),
            _ExpensesTab(prov: prov),
            _IncomesTab(prov: prov),
          ],
        ),
      ),
    );
  }
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────

class _PLTab extends StatelessWidget {
  final FinanceProvider prov;
  const _PLTab({required this.prov});

  @override
  Widget build(BuildContext context) {
    if (prov.loadingPL) return const Center(child: CircularProgressIndicator());
    if (prov.plError != null) return Center(child: Text(prov.plError!, style: const TextStyle(color: Color(0xFF64748B))));

    final pl  = prov.pl;
    final fmt = NumberFormat('#,##0.00');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _PLCard(
          label: 'Total Revenue',
          value: '\$${fmt.format(pl?.totalRevenue ?? 0)}',
          color: const Color(0xFF10B981),
          icon: Icons.trending_up_rounded,
          sub: 'From completed orders',
        ),
        const SizedBox(height: 12),
        _PLCard(
          label: 'Total Expenses',
          value: '\$${fmt.format(pl?.totalExpenses ?? 0)}',
          color: const Color(0xFFDC2626),
          icon: Icons.trending_down_rounded,
          sub: 'All recorded expenses',
        ),
        const SizedBox(height: 12),
        _PLCard(
          label: 'Manual Income',
          value: '\$${fmt.format(pl?.totalManualIncome ?? 0)}',
          color: const Color(0xFF0EA5E9),
          icon: Icons.add_circle_rounded,
          sub: 'Non-order income entries',
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: (pl?.netProfit ?? 0) >= 0
                  ? [const Color(0xFF10B981), const Color(0xFF059669)]
                  : [const Color(0xFFDC2626), const Color(0xFFB91C1C)],
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(
              color: ((pl?.netProfit ?? 0) >= 0 ? const Color(0xFF10B981) : const Color(0xFFDC2626)).withValues(alpha: 0.3),
              blurRadius: 16, offset: const Offset(0, 6),
            )],
          ),
          child: Column(children: [
            const Text('Net Profit / Loss',
                style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            Text('\$${fmt.format(pl?.netProfit ?? 0)}',
                style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('Margin: ${(pl?.profitMargin ?? 0).toStringAsFixed(1)}%',
                style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ]),
        ),
      ],
    );
  }
}

class _PLCard extends StatelessWidget {
  final String label, value, sub;
  final Color color;
  final IconData icon;
  const _PLCard({required this.label, required this.value, required this.color, required this.icon, required this.sub});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 12)],
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 14),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
          Text(sub, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
        ]),
      ]),
    );
  }
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

class _ExpensesTab extends StatelessWidget {
  final FinanceProvider prov;
  const _ExpensesTab({required this.prov});

  static const _categories = ['SUPPLIES','RENT','UTILITIES','SALARIES','MARKETING','MAINTENANCE','OTHER'];

  Color _catColor(String c) {
    const map = {
      'SUPPLIES': Color(0xFF6366F1), 'RENT': Color(0xFF0EA5E9),
      'UTILITIES': Color(0xFF10B981), 'SALARIES': Color(0xFFD97706),
      'MARKETING': Color(0xFFEC4899), 'MAINTENANCE': Color(0xFF8B5CF6),
      'OTHER': Color(0xFF94A3B8),
    };
    return map[c] ?? const Color(0xFF94A3B8);
  }

  @override
  Widget build(BuildContext context) {
    if (prov.loadingExpenses) return const Center(child: CircularProgressIndicator());

    final fmt = NumberFormat('#,##0.00');
    final dateFmt = DateFormat('d MMM yyyy');

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFFDC2626),
        onPressed: () => _showAddSheet(context),
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: prov.expenses.isEmpty
          ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.receipt_long_outlined, size: 52, color: Color(0xFFCBD5E1)),
              SizedBox(height: 12),
              Text('No expenses yet', style: TextStyle(color: Color(0xFF64748B))),
            ]))
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
              itemCount: prov.expenses.length,
              itemBuilder: (_, i) {
                final e     = prov.expenses[i];
                final color = _catColor(e.category);
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(14),
                    boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 12)],
                  ),
                  child: Row(children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: Center(child: Text(e.category[0], style: TextStyle(fontWeight: FontWeight.bold, color: color))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(e.category, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF0F172A))),
                      if (e.notes != null) Text(e.notes!, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      Text(dateFmt.format(e.createdAt), style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ])),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('-\$${fmt.format(e.amount)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFDC2626), fontSize: 14)),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFDC2626)),
                        padding: EdgeInsets.zero, constraints: const BoxConstraints(),
                        onPressed: () => prov.deleteExpense(e.id),
                      ),
                    ]),
                  ]),
                );
              },
            ),
    );
  }

  void _showAddSheet(BuildContext context) {
    showModalBottomSheet(
      context: context, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _AddEntrySheet(
        title: 'Add Expense',
        labels: _categories,
        labelKey: 'category',
        accentColor: const Color(0xFFDC2626),
        onSave: (amount, cat, notes) async {
          final err = await context.read<FinanceProvider>().addExpense(amount: amount, category: cat, notes: notes);
          if (!context.mounted) return;
          Navigator.pop(context);
          if (err != null) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: const Color(0xFFDC2626)));
        },
      ),
    );
  }
}

// ─── Incomes Tab ──────────────────────────────────────────────────────────────

class _IncomesTab extends StatelessWidget {
  final FinanceProvider prov;
  const _IncomesTab({required this.prov});

  static const _sources = ['SALES','RETURNS','OTHER'];

  @override
  Widget build(BuildContext context) {
    if (prov.loadingIncomes) return const Center(child: CircularProgressIndicator());

    final fmt = NumberFormat('#,##0.00');
    final dateFmt = DateFormat('d MMM yyyy');

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF10B981),
        onPressed: () => _showAddSheet(context),
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: prov.incomes.isEmpty
          ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.payments_outlined, size: 52, color: Color(0xFFCBD5E1)),
              SizedBox(height: 12),
              Text('No income entries yet', style: TextStyle(color: Color(0xFF64748B))),
            ]))
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
              itemCount: prov.incomes.length,
              itemBuilder: (_, i) {
                final inc = prov.incomes[i];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(14),
                    boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 12)],
                  ),
                  child: Row(children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: Center(child: Text(inc.source[0], style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981)))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(inc.source, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF0F172A))),
                      if (inc.notes != null) Text(inc.notes!, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      Text(dateFmt.format(inc.createdAt), style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ])),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('+\$${fmt.format(inc.amount)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981), fontSize: 14)),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFDC2626)),
                        padding: EdgeInsets.zero, constraints: const BoxConstraints(),
                        onPressed: () => prov.deleteIncome(inc.id),
                      ),
                    ]),
                  ]),
                );
              },
            ),
    );
  }

  void _showAddSheet(BuildContext context) {
    showModalBottomSheet(
      context: context, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _AddEntrySheet(
        title: 'Add Income',
        labels: _sources,
        labelKey: 'source',
        accentColor: const Color(0xFF10B981),
        onSave: (amount, src, notes) async {
          final err = await context.read<FinanceProvider>().addIncome(amount: amount, source: src, notes: notes);
          if (!context.mounted) return;
          Navigator.pop(context);
          if (err != null) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: const Color(0xFFDC2626)));
        },
      ),
    );
  }
}

// ─── Shared Add Sheet ─────────────────────────────────────────────────────────

class _AddEntrySheet extends StatefulWidget {
  final String title, labelKey;
  final List<String> labels;
  final Color accentColor;
  final Future<void> Function(double amount, String label, String? notes) onSave;
  const _AddEntrySheet({required this.title, required this.labels, required this.labelKey, required this.accentColor, required this.onSave});
  @override
  State<_AddEntrySheet> createState() => _AddEntrySheetState();
}

class _AddEntrySheetState extends State<_AddEntrySheet> {
  late String _selected;
  final _amtCtrl  = TextEditingController();
  final _noteCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() { super.initState(); _selected = widget.labels.first; }
  @override
  void dispose() { _amtCtrl.dispose(); _noteCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 20),
          TextFormField(
            controller: _amtCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}'))],
            decoration: InputDecoration(
              labelText: 'Amount (USD)', prefixText: '\$ ',
              filled: true, fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: widget.accentColor, width: 2)),
            ),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _selected,
            decoration: InputDecoration(
              labelText: widget.labelKey == 'category' ? 'Category' : 'Source',
              filled: true, fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            ),
            items: widget.labels.map((l) => DropdownMenuItem(value: l, child: Text(l))).toList(),
            onChanged: (v) => setState(() => _selected = v!),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _noteCtrl,
            decoration: InputDecoration(
              labelText: 'Notes (optional)',
              filled: true, fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity, height: 50,
            child: ElevatedButton(
              onPressed: _saving ? null : () async {
                final amt = double.tryParse(_amtCtrl.text);
                if (amt == null || amt <= 0) return;
                setState(() => _saving = true);
                await widget.onSave(amt, _selected, _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim());
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: widget.accentColor, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0,
              ),
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('Save ${widget.title.split(' ').last}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ]),
      ),
    );
  }
}
