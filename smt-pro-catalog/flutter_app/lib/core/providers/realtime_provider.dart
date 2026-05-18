import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/socket_service.dart';

/// Call this after successful login to connect the socket and wire up listeners.
/// Call it from auth provider after token is saved.
Future<void> initRealtime(WidgetRef ref) async {
  final socket = ref.read(socketServiceProvider);
  await socket.connect();
}

/// Call this on logout.
void disposeRealtime(WidgetRef ref) {
  ref.read(socketServiceProvider).disconnect();
}

// ─── Typed event notifiers ────────────────────────────────────────────────────

/// Notified whenever the backend broadcasts any product change.
/// Consumers (product providers) watch this to trigger a refresh.
final productRealtimeProvider = StateProvider<int>((ref) => 0);

/// Notified on any order change.
final orderRealtimeProvider = StateProvider<int>((ref) => 0);

/// Notified on any stock movement.
final stockRealtimeProvider = StateProvider<int>((ref) => 0);

/// Notified on any category change.
final categoryRealtimeProvider = StateProvider<int>((ref) => 0);

/// Registers all socket event → provider update listeners.
/// Call once after [initRealtime].
void registerSocketListeners(Ref ref) {
  final socket = ref.read(socketServiceProvider);

  // Products
  socket.on(SocketEvent.productCreated, (_) {
    ref.read(productRealtimeProvider.notifier).state++;
  });
  socket.on(SocketEvent.productUpdated, (_) {
    ref.read(productRealtimeProvider.notifier).state++;
  });
  socket.on(SocketEvent.productDeleted, (_) {
    ref.read(productRealtimeProvider.notifier).state++;
  });

  // Orders
  socket.on(SocketEvent.orderCreated, (_) {
    ref.read(orderRealtimeProvider.notifier).state++;
  });
  socket.on(SocketEvent.orderUpdated, (_) {
    ref.read(orderRealtimeProvider.notifier).state++;
  });

  // Stock
  socket.on(SocketEvent.stockUpdated, (_) {
    ref.read(stockRealtimeProvider.notifier).state++;
    ref.read(productRealtimeProvider.notifier).state++;
  });
  socket.on(SocketEvent.stockLow, (_) {
    ref.read(stockRealtimeProvider.notifier).state++;
  });

  // Categories
  socket.on(SocketEvent.categoryCreated, (_) {
    ref.read(categoryRealtimeProvider.notifier).state++;
  });
  socket.on(SocketEvent.categoryUpdated, (_) {
    ref.read(categoryRealtimeProvider.notifier).state++;
  });
  socket.on(SocketEvent.categoryDeleted, (_) {
    ref.read(categoryRealtimeProvider.notifier).state++;
  });
}
