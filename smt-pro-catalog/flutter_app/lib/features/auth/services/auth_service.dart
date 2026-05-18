import '../../../core/api/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/storage/token_storage.dart';
import '../models/user_model.dart';

class AuthService {
  final _client = ApiClient();

  Future<UserModel> login(String email, String password) async {
    final res = await _client.post(
      ApiEndpoints.login,
      data: {'email': email, 'password': password},
    );

    final body  = res.data as Map<String, dynamic>;
    final data  = body['data']  as Map<String, dynamic>;
    final user  = UserModel.fromJson(data['user']);
    final token = data['token'] as String;

    await TokenStorage.save(token: token, role: user.role, name: user.name);
    return user;
  }

  Future<void> logout() => TokenStorage.clear();
}
