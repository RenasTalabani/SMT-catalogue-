import 'package:dio/dio.dart';
import '../constants/api_endpoints.dart';
import '../errors/api_exception.dart';
import '../storage/token_storage.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  static const int _maxRetries    = 2;
  static const int _retryDelayMs  = 1500;

  late final Dio _dio = _buildDio();

  Dio _buildDio() {
    final dio = Dio(BaseOptions(
      baseUrl:        ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 120),
      sendTimeout:    const Duration(seconds: 30),
      headers:        {'Content-Type': 'application/json'},
    ));

    // 1. JWT injector
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await TokenStorage.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));

    // 2. Retry interceptor (network errors + 5xx, max 2 retries with backoff)
    dio.interceptors.add(InterceptorsWrapper(
      onError: (error, handler) async {
        final attempt = error.requestOptions.extra['_retryCount'] as int? ?? 0;
        final isRetryable = _shouldRetry(error);

        if (isRetryable && attempt < _maxRetries) {
          await Future.delayed(Duration(milliseconds: _retryDelayMs * (attempt + 1)));
          error.requestOptions.extra['_retryCount'] = attempt + 1;
          try {
            final retryRes = await dio.fetch(error.requestOptions);
            return handler.resolve(retryRes);
          } catch (_) {}
        }

        handler.next(error);
      },
    ));

    return dio;
  }

  bool _shouldRetry(DioException error) {
    return error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        (error.response?.statusCode ?? 0) >= 500;
  }

  ApiException _wrap(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return const ApiException(
          message: 'Request timed out',
          isTimeout: true,
        );
      case DioExceptionType.connectionError:
        return ApiException(
          message: 'Cannot connect to ${ApiEndpoints.baseUrl}',
          isNetworkError: true,
        );
      default:
        final status = e.response?.statusCode;
        final body   = e.response?.data;
        final msg    = (body is Map ? body['message'] : null) ?? e.message ?? 'Unknown error';
        return ApiException(message: msg, statusCode: status);
    }
  }

  Future<Response> get(String path, {Map<String, dynamic>? params}) async {
    try {
      return await _dio.get(path, queryParameters: params);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Response> post(String path, {dynamic data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Response> patch(String path, {dynamic data}) async {
    try {
      return await _dio.patch(path, data: data);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  /// Ping /health — use to verify connection before login
  Future<bool> checkHealth() async {
    try {
      final res = await _dio.get(
        ApiEndpoints.health,
        options: Options(
          sendTimeout:    const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
