import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../network/api_client.dart';

/// Background handler — must be a top-level function.
@pragma('vm:entry-point')
Future<void> _onBackgroundMessage(RemoteMessage message) async {
  await Firebase.initializeApp();
}

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final _fcm    = FirebaseMessaging.instance;
  final _local  = FlutterLocalNotificationsPlugin();

  static const _channel = AndroidNotificationChannel(
    'daraliraq_default',
    'DaralIraq Notifications',
    description: 'General app notifications',
    importance: Importance.high,
  );

  Future<void> init(ApiClient api) async {
    // Register background handler
    FirebaseMessaging.onBackgroundMessage(_onBackgroundMessage);

    // Request permission
    await _fcm.requestPermission(alert: true, badge: true, sound: true);

    // Local notifications setup
    await _local.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS:     DarwinInitializationSettings(),
      ),
    );

    await _local
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    // Send FCM token to backend
    final token = await _fcm.getToken();
    if (token != null) await _uploadToken(api, token);

    // Refresh token when it rotates
    _fcm.onTokenRefresh.listen((t) => _uploadToken(api, t));

    // Foreground messages → local notification
    FirebaseMessaging.onMessage.listen(_showLocal);
  }

  void _showLocal(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _local.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: _channel.importance,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: jsonEncode(message.data),
    );
  }

  Future<void> _uploadToken(ApiClient api, String token) async {
    try {
      await api.post('/auth/fcm-token', data: {'fcmToken': token});
    } catch (_) {}
  }
}
