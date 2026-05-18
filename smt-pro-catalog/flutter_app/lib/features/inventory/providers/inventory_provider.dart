import 'package:flutter/material.dart';
import '../../../core/errors/api_exception.dart';
import '../models/inventory_model.dart';
import '../services/inventory_service.dart';

class InventoryProvider extends ChangeNotifier {
  final _service = InventoryService();

  InventoryValueModel?   _value;
  List<StockMovementModel> _movements = [];
  bool    _loadingValue     = false;
  bool    _loadingMovements = false;
  String? _valueError;
  String? _movementsError;

  InventoryValueModel?     get value             => _value;
  List<StockMovementModel> get movements         => _movements;
  bool                     get loadingValue      => _loadingValue;
  bool                     get loadingMovements  => _loadingMovements;
  String?                  get valueError        => _valueError;
  String?                  get movementsError    => _movementsError;

  Future<void> loadValue({int threshold = 5}) async {
    _loadingValue = true; _valueError = null; notifyListeners();
    try {
      _value = await _service.getValue(threshold: threshold);
    } on ApiException catch (e) { _valueError = e.userMessage; }
    catch (_) { _valueError = 'Failed to load inventory value'; }
    _loadingValue = false; notifyListeners();
  }

  Future<void> loadMovements() async {
    _loadingMovements = true; _movementsError = null; notifyListeners();
    try {
      _movements = await _service.getMovements();
    } on ApiException catch (e) { _movementsError = e.userMessage; }
    catch (_) { _movementsError = 'Failed to load movements'; }
    _loadingMovements = false; notifyListeners();
  }

  Future<String?> recordMovement({
    required int    productId,
    required String type,
    required int    quantity,
    String?         notes,
  }) async {
    try {
      final m = await _service.recordMovement(
        productId: productId, type: type, quantity: quantity, notes: notes,
      );
      _movements.insert(0, m);
      notifyListeners();
      await loadValue();
      return null;
    } on ApiException catch (e) { return e.userMessage; }
    catch (_) { return 'Failed to record movement'; }
  }
}
