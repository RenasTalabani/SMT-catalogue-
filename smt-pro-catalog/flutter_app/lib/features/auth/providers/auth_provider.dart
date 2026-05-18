import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../../../core/api/api_client.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/storage/token_storage.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _user;
  bool    _isLoading    = true;
  bool    _checkingConn = false;
  String? _error;
  bool    _serverReachable = true;

  UserModel? get user            => _user;
  bool       get isLoading       => _isLoading;
  bool       get isLoggedIn      => _user != null;
  bool       get checkingConn    => _checkingConn;
  bool       get serverReachable => _serverReachable;
  String?    get error           => _error;

  final _service = AuthService();
  final _client  = ApiClient();

  Future<void> checkAuth() async {
    final hasToken = await TokenStorage.hasToken();
    if (!hasToken) {
      _isLoading = false;
      notifyListeners();
      return;
    }
    final name = await TokenStorage.getName();
    final role = await TokenStorage.getRole();
    if (name != null && role != null) {
      _user = UserModel(id: 0, name: name, email: '', role: role);
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> pingServer() async {
    _checkingConn = true;
    notifyListeners();
    _serverReachable = await _client.checkHealth();
    _checkingConn = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _error = null;
    _isLoading = true;
    notifyListeners();
    try {
      _user = await _service.login(email, password);
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.userMessage;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Login failed. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _service.logout();
    _user = null;
    notifyListeners();
  }
}
