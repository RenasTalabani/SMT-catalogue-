import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:daraliraq/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    // Stub SharedPreferences so ThemeModeNotifier / LocaleNotifier don't crash
    SharedPreferences.setMockInitialValues({});

    // Stub flutter_secure_storage platform channel (not available in test runner)
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (call) async => null,
    );
  });

  testWidgets('App starts without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: SmtProCatalogApp()),
    );
    // One pump to process async providers
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
