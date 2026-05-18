import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../products/providers/product_provider.dart';
import '../models/inventory_model.dart';
import '../providers/inventory_provider.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});
  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InventoryProvider>().loadValue();
      context.read<InventoryProvider>().loadMovements();
    });
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<InventoryProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      body: NestedScrollView(
        headerSliverBuilder: (_, __) => [
          SliverAppBar(
            pinned: true,
            backgroundColor: const Color(0xFF0F172A),
            title: const Text('Inventory', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
                onPressed: () { prov.loadValue(); prov.loadMovements(); },
              ),
              IconButton(
                icon: const Icon(Icons.add_rounded, color: Colors.white70),
                onPressed: () => _showMovementSheet(context),
              ),
            ],
            bottom: TabBar(
              controller: _tabs,
              indicatorColor: Colors.white,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white54,
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Movements'),
              ],
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabs,
          children: [
            _OverviewTab(prov: prov),
            _MovementsTab(prov: prov),
          ],
        ),
      ),
    );
  }

  void _showMovementSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _RecordMovementSheet(
        onSave: (productId, type, qty, notes) async {
          final err = await context.read<InventoryProvider>().recordMovement(
            productId: productId, type: type, quantity: qty, notes: notes,
          );
          if (!context.mounted) return;
          Navigator.pop(context);
          if (err != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(err), backgroundColor: const Color(0xFFDC2626)));
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Movement recorded!'), backgroundColor: Color(0xFF10B981)));
          }
        },
      ),
    );
  }
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

class _OverviewTab extends StatelessWidget {
  final InventoryProvider prov;
  const _OverviewTab({required this.prov});

  @override
  Widget build(BuildContext context) {
    if (prov.loadingValue) return const Center(child: CircularProgressIndicator());
    if (prov.valueError != null) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.cloud_off_rounded, size: 48, color: Color(0xFFCBD5E1)),
        const SizedBox(height: 12),
        Text(prov.valueError!, style: const TextStyle(color: Color(0xFF64748B))),
        const SizedBox(height: 16),
        ElevatedButton(onPressed: prov.loadValue, child: const Text('Retry')),
      ]));
    }

    final v   = prov.value;
    final fmt = NumberFormat('#,##0.00');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Value cards
        Row(children: [
          _InfoCard(
            label: 'Total Value',
            value: '\$${fmt.format(v?.totalValue ?? 0)}',
            icon: Icons.account_balance_wallet_rounded,
            color: const Color(0xFF6366F1),
          ),
          const SizedBox(width: 12),
          _InfoCard(
            label: 'Total Products',
            value: '${v?.totalProducts ?? 0}',
            icon: Icons.inventory_2_rounded,
            color: const Color(0xFF0EA5E9),
          ),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          _InfoCard(
            label: 'Low Stock',
            value: '${v?.lowStockCount ?? 0}',
            icon: Icons.warning_amber_rounded,
            color: const Color(0xFFD97706),
          ),
          const SizedBox(width: 12),
          _InfoCard(
            label: 'Out of Stock',
            value: '${v?.outOfStockCount ?? 0}',
            icon: Icons.remove_shopping_cart_rounded,
            color: const Color(0xFFDC2626),
          ),
        ]),
        // Low stock list
        if (v != null && v.lowStockItems.isNotEmpty) ...[
          const SizedBox(height: 20),
          const Text('Low Stock Items',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
          const SizedBox(height: 10),
          ...v.lowStockItems.map((item) => _LowStockRow(item: item)),
        ],
      ],
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _InfoCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 12)],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
            ]),
          ],
        ),
      ),
    );
  }
}

class _LowStockRow extends StatelessWidget {
  final LowStockItem item;
  const _LowStockRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final color = item.quantity == 0 ? const Color(0xFFDC2626) : const Color(0xFFD97706);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
          child: Center(child: Text('${item.quantity}',
              style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 13))),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF0F172A))),
          Text(item.category, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
          child: Text(item.quantity == 0 ? 'OUT' : 'LOW',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
        ),
      ]),
    );
  }
}

// ─── Movements Tab ────────────────────────────────────────────────────────────

class _MovementsTab extends StatelessWidget {
  final InventoryProvider prov;
  const _MovementsTab({required this.prov});

  Color _typeColor(String t) {
    switch (t) {
      case 'IN':         return const Color(0xFF10B981);
      case 'OUT':        return const Color(0xFFDC2626);
      case 'ADJUSTMENT': return const Color(0xFF6366F1);
      case 'RETURN':     return const Color(0xFF0EA5E9);
      default:           return const Color(0xFF94A3B8);
    }
  }

  IconData _typeIcon(String t) {
    switch (t) {
      case 'IN':         return Icons.arrow_downward_rounded;
      case 'OUT':        return Icons.arrow_upward_rounded;
      case 'ADJUSTMENT': return Icons.tune_rounded;
      case 'RETURN':     return Icons.keyboard_return_rounded;
      default:           return Icons.swap_horiz_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (prov.loadingMovements) return const Center(child: CircularProgressIndicator());
    if (prov.movementsError != null) {
      return Center(child: Text(prov.movementsError!, style: const TextStyle(color: Color(0xFF64748B))));
    }
    if (prov.movements.isEmpty) {
      return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.swap_horiz_rounded, size: 52, color: Color(0xFFCBD5E1)),
        SizedBox(height: 12),
        Text('No movements yet', style: TextStyle(color: Color(0xFF64748B))),
      ]));
    }

    final dateFmt = DateFormat('d MMM · HH:mm');
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: prov.movements.length,
      itemBuilder: (_, i) {
        final m     = prov.movements[i];
        final color = _typeColor(m.type);
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 12)],
          ),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(_typeIcon(m.type), color: color, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(m.productName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF0F172A))),
              Text('${m.previousQty} → ${m.newQty}  ·  ${dateFmt.format(m.createdAt)}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
              if (m.notes != null)
                Text(m.notes!, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                child: Text(m.type, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
              ),
              const SizedBox(height: 4),
              Text('${m.type == 'OUT' ? '-' : '+'}${m.quantity}',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
            ]),
          ]),
        );
      },
    );
  }
}

// ─── Record Movement Sheet ────────────────────────────────────────────────────

class _RecordMovementSheet extends StatefulWidget {
  final Future<void> Function(int productId, String type, int quantity, String? notes) onSave;
  const _RecordMovementSheet({required this.onSave});
  @override
  State<_RecordMovementSheet> createState() => _RecordMovementSheetState();
}

class _RecordMovementSheetState extends State<_RecordMovementSheet> {
  int?    _selectedProductId;
  String  _type     = 'IN';
  final   _qtyCtrl  = TextEditingController(text: '1');
  final   _noteCtrl = TextEditingController();
  bool    _saving   = false;

  static const _types = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'];

  Color _typeColor(String t) {
    switch (t) {
      case 'IN':         return const Color(0xFF10B981);
      case 'OUT':        return const Color(0xFFDC2626);
      case 'ADJUSTMENT': return const Color(0xFF6366F1);
      case 'RETURN':     return const Color(0xFF0EA5E9);
      default:           return const Color(0xFF94A3B8);
    }
  }

  @override
  void dispose() { _qtyCtrl.dispose(); _noteCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final products = context.watch<ProductProvider>().products;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Record Movement', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 20),
          // Product dropdown
          DropdownButtonFormField<int>(
            initialValue: _selectedProductId,
            hint: const Text('Select product'),
            decoration: InputDecoration(
              filled: true, fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
            items: products.map((p) => DropdownMenuItem(value: p.id, child: Text('${p.name} (${p.quantity} in stock)', overflow: TextOverflow.ellipsis))).toList(),
            onChanged: (v) => setState(() => _selectedProductId = v),
          ),
          const SizedBox(height: 14),
          // Type selector
          Row(children: _types.map((t) {
            final sel = _type == t;
            return Expanded(child: Padding(
              padding: const EdgeInsets.only(right: 6),
              child: GestureDetector(
                onTap: () => setState(() => _type = t),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: sel ? _typeColor(t).withValues(alpha: 0.1) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: sel ? _typeColor(t) : const Color(0xFFE2E8F0)),
                  ),
                  child: Text(t, textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold,
                          color: sel ? _typeColor(t) : const Color(0xFF94A3B8))),
                ),
              ),
            ));
          }).toList()),
          const SizedBox(height: 14),
          // Quantity
          TextFormField(
            controller: _qtyCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              labelText: 'Quantity',
              filled: true, fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2)),
            ),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _noteCtrl,
            decoration: InputDecoration(
              labelText: 'Notes (optional)',
              filled: true, fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2)),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity, height: 50,
            child: ElevatedButton(
              onPressed: (_saving || _selectedProductId == null) ? null : () async {
                final qty = int.tryParse(_qtyCtrl.text) ?? 0;
                if (qty < 1) return;
                setState(() => _saving = true);
                await widget.onSave(_selectedProductId!, _type, qty, _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim());
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1), foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0,
              ),
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Record Movement', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ]),
      ),
    );
  }
}
