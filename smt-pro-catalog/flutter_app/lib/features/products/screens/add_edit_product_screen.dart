import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/product_model.dart';
import '../providers/product_provider.dart';

class AddEditProductScreen extends StatefulWidget {
  final ProductModel? product;
  const AddEditProductScreen({super.key, this.product});

  @override
  State<AddEditProductScreen> createState() => _AddEditProductScreenState();
}

class _AddEditProductScreenState extends State<AddEditProductScreen> {
  final _formKey  = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _categoryCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _quantityCtrl;
  late final TextEditingController _descCtrl;
  bool _saving = false;

  bool get _isEdit => widget.product != null;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameCtrl     = TextEditingController(text: p?.name     ?? '');
    _categoryCtrl = TextEditingController(text: p?.category ?? '');
    _priceCtrl    = TextEditingController(text: p != null ? p.price.toStringAsFixed(2) : '');
    _quantityCtrl = TextEditingController(text: p != null ? '${p.quantity}' : '');
    _descCtrl     = TextEditingController(text: p?.description ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _categoryCtrl.dispose();
    _priceCtrl.dispose(); _quantityCtrl.dispose(); _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final prov  = context.read<ProductProvider>();
    final name  = _nameCtrl.text.trim();
    final cat   = _categoryCtrl.text.trim();
    final price = double.parse(_priceCtrl.text);
    final qty   = int.parse(_quantityCtrl.text);
    final desc  = _descCtrl.text.trim();

    String? err;
    if (_isEdit) {
      final updates = <String, dynamic>{
        'name': name, 'category': cat,
        'price': price, 'quantity': qty,
        if (desc.isNotEmpty) 'description': desc,
      };
      err = await prov.updateProduct(widget.product!.id, updates);
    } else {
      err = await prov.createProduct(
        name: name, price: price, quantity: qty,
        category: cat, description: desc.isNotEmpty ? desc : null,
      );
    }

    if (!mounted) return;
    setState(() => _saving = false);

    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: const Color(0xFFDC2626)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_isEdit ? 'Product updated!' : 'Product added!'),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        title: Text(_isEdit ? 'Edit Product' : 'New Product',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildSection('Basic Info', [
              _field(
                controller: _nameCtrl,
                label: 'Product Name',
                hint: 'e.g. Resistor 100Ω',
                icon: Icons.inventory_2_outlined,
                validator: (v) => (v == null || v.trim().length < 2) ? 'Name must be at least 2 characters' : null,
              ),
              const SizedBox(height: 14),
              _field(
                controller: _categoryCtrl,
                label: 'Category',
                hint: 'e.g. Resistors, Capacitors…',
                icon: Icons.label_outline_rounded,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Category is required' : null,
              ),
            ]),
            const SizedBox(height: 16),
            _buildSection('Pricing & Stock', [
              Row(
                children: [
                  Expanded(
                    child: _field(
                      controller: _priceCtrl,
                      label: 'Price (USD)',
                      hint: '0.00',
                      icon: Icons.attach_money_rounded,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}'))],
                      validator: (v) {
                        final n = double.tryParse(v ?? '');
                        return (n == null || n <= 0) ? 'Enter a valid price' : null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _field(
                      controller: _quantityCtrl,
                      label: 'Quantity',
                      hint: '0',
                      icon: Icons.numbers_rounded,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      validator: (v) {
                        final n = int.tryParse(v ?? '');
                        return (n == null || n < 0) ? 'Enter a valid quantity' : null;
                      },
                    ),
                  ),
                ],
              ),
            ]),
            const SizedBox(height: 16),
            _buildSection('Description (optional)', [
              TextFormField(
                controller: _descCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Short product description…',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
                  ),
                  contentPadding: const EdgeInsets.all(14),
                ),
              ),
            ]),
            const SizedBox(height: 32),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                child: _saving
                    ? const SizedBox(width: 22, height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : Text(_isEdit ? 'Save Changes' : 'Add Product',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 16)],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold,
                  color: Color(0xFF94A3B8), letterSpacing: 0.5)),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
        const SizedBox(height: 6),
        TextFormField(
          controller:          controller,
          keyboardType:        keyboardType,
          inputFormatters:     inputFormatters,
          validator:           validator,
          decoration: InputDecoration(
            hintText:     hint,
            prefixIcon:   Icon(icon, size: 18),
            filled:       true,
            fillColor:    const Color(0xFFF8FAFC),
            border:       OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2)),
            errorBorder:   OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDC2626))),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          ),
        ),
      ],
    );
  }
}
