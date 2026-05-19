import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../constants/api_endpoints.dart';
import '../storage/token_storage.dart';

// userId is stored alongside role/token so the server can route personal events
const _userIdKey = 'user_id';

/// Events emitted by the backend Socket.IO server.
class SocketEvent {
  static const productCreated  = 'product:created';
  static const productUpdated  = 'product:updated';
  static const productDeleted  = 'product:deleted';
  static const orderCreated    = 'order:created';
  static const orderUpdated    = 'order:updated';
  static const stockUpdated    = 'stock:updated';
  static const stockLow        = 'stock:low';
  static const categoryCreated = 'category:created';
  static const categoryUpdated = 'category:updated';
  static const categoryDeleted = 'category:deleted';
  static const notificationNew = 'notification:new';
}

class SocketService {
  SocketService._();
  static final SocketService instance = SocketService._();

  io.Socket? _socket;
  bool get isConnected => _socket?.connected ?? false;

  Future<void> connect() async {
    if (isConnected) return;

    final role   = await TokenStorage.getRole() ?? 'guest';
    final token  = await TokenStorage.getToken();
    final userId = await TokenStorage.getUserId();

    final query = <String, dynamic>{'role': role};
    if (userId != null) query['userId'] = userId;

    _socket = io.io(
      ApiEndpoints.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setQuery(query)
          .setExtraHeaders(token != null ? {'Authorization': 'Bearer $token'} : {})
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(2000)
          .setReconnectionAttempts(10)
          .build(),
    );

    _socket!
      ..onConnect((_)    => _log('connected'))
      ..onDisconnect((_) => _log('disconnected'))
      ..onError((e)      => _log('error: $e'));
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void on(String event, Function(dynamic) handler) {
    _socket?.on(event, handler);
  }

  void off(String event) {
    _socket?.off(event);
  }

  void _log(String msg) {
    // ignore: avoid_print
    print('[socket] $msg');
  }
}

// ─── Riverpod provider ────────────────────────────────────────────────────────

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService.instance;
  ref.onDispose(service.disconnect);
  return service;
});
