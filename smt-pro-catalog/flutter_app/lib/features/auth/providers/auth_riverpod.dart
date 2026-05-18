import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../../../core/api/api_client.dart';
import '../../../core/storage/token_storage.dart';

class AuthState {
  final UserModel? user;
  final bool isLoading;
  final bool checkingConn;
  final bool serverReachable;
  final String? error;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.checkingConn = false,
    this.serverReachable = true,
    this.error,
  });

  bool get isLoggedIn => user != null;

  AuthState copyWith({
    UserModel? user,
    bool clearUser = false,
    bool? isLoading,
    bool? checkingConn,
    bool? serverReachable,
    String? error,
    bool clearError = false,
  }) => AuthState(
    user:            clearUser ? null : (user ?? this.user),
    isLoading:       isLoading ?? this.isLoading,
    checkingConn:    checkingConn ?? this.checkingConn,
    serverReachable: serverReachable ?? this.serverReachable,
    error:           clearError ? null : (error ?? this.error),
  );
}

class AuthNotifier extends Notifier<AuthState> {
  final _service = AuthService();
  final _client  = ApiClient();

  @override
  AuthState build() {
    _checkAuth();
    return const AuthState(isLoading: true);
  }

  Future<void> _checkAuth() async {
    final hasToken = await TokenStorage.hasToken();
    if (!hasToken) {
      state = state.copyWith(isLoading: false);
      return;
    }
    final name = await TokenStorage.getName();
    final role = await TokenStorage.getRole();
    if (name != null && role != null) {
      state = state.copyWith(
        user: UserModel(id: 0, name: name, email: '', role: role),
        isLoading: false,
      );
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> pingServer() async {
    state = state.copyWith(checkingConn: true);
    final ok = await _client.checkHealth();
    state = state.copyWith(checkingConn: false, serverReachable: ok);
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _service.login(email, password);
      state = state.copyWith(user: user, isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _service.logout();
    state = state.copyWith(clearUser: true);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
