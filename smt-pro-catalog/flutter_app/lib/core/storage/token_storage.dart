import 'package:shared_preferences/shared_preferences.dart';

class TokenStorage {
  static const _tokenKey  = 'jwt_token';
  static const _roleKey   = 'user_role';
  static const _nameKey   = 'user_name';
  static const _userIdKey = 'user_id';

  static Future<void> save({
    required String token,
    required String role,
    required String name,
    required String userId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey,  token);
    await prefs.setString(_roleKey,   role);
    await prefs.setString(_nameKey,   name);
    await prefs.setString(_userIdKey, userId);
  }

  static Future<String?> getToken()  async => (await SharedPreferences.getInstance()).getString(_tokenKey);
  static Future<String?> getRole()   async => (await SharedPreferences.getInstance()).getString(_roleKey);
  static Future<String?> getName()   async => (await SharedPreferences.getInstance()).getString(_nameKey);
  static Future<String?> getUserId() async => (await SharedPreferences.getInstance()).getString(_userIdKey);

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_roleKey);
    await prefs.remove(_nameKey);
    await prefs.remove(_userIdKey);
  }

  static Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
