import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

// JWT stored in encrypted keystore/keychain — non-sensitive meta in SharedPreferences.
class TokenStorage {
  static const _tokenKey  = 'jwt_token';
  static const _roleKey   = 'user_role';
  static const _nameKey   = 'user_name';
  static const _userIdKey = 'user_id';

  static const _secure = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static Future<void> save({
    required String token,
    required String role,
    required String name,
    required String userId,
  }) async {
    await _secure.write(key: _tokenKey, value: token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_roleKey,   role);
    await prefs.setString(_nameKey,   name);
    await prefs.setString(_userIdKey, userId);
  }

  static Future<String?> getToken()  async => _secure.read(key: _tokenKey);
  static Future<String?> getRole()   async => (await SharedPreferences.getInstance()).getString(_roleKey);
  static Future<String?> getName()   async => (await SharedPreferences.getInstance()).getString(_nameKey);
  static Future<String?> getUserId() async => (await SharedPreferences.getInstance()).getString(_userIdKey);

  static Future<void> clear() async {
    await _secure.delete(key: _tokenKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_roleKey);
    await prefs.remove(_nameKey);
    await prefs.remove(_userIdKey);
  }

  static Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
