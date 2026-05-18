import 'package:dio/dio.dart';
import '../constants/api_endpoints.dart';
import '../errors/exceptions.dart';
import '../storage/token_storage.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl:        ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
      sendTimeout:    const Duration(seconds: 120),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
    ));

    _dio.interceptors.addAll([
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await TokenStorage.getToken();
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
      ),
      _ErrorInterceptor(),
    ]);
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? queryParameters, Options? options}) =>
      _dio.get<T>(path, queryParameters: queryParameters, options: options);

  Future<Response<T>> post<T>(String path, {dynamic data, Map<String, dynamic>? queryParameters, Options? options}) =>
      _dio.post<T>(path, data: data, queryParameters: queryParameters, options: options);

  Future<Response<T>> put<T>(String path, {dynamic data, Options? options}) =>
      _dio.put<T>(path, data: data, options: options);

  Future<Response<T>> delete<T>(String path, {dynamic data}) =>
      _dio.delete<T>(path, data: data);

  Future<Response<T>> uploadFiles<T>(String path, FormData formData, {void Function(int, int)? onSendProgress}) =>
      _dio.post<T>(path, data: formData,
          options: Options(headers: {'Content-Type': 'multipart/form-data'}),
          onSendProgress: onSendProgress);
}

class _ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.unknown) {
      handler.reject(DioException(
        requestOptions: err.requestOptions,
        type: DioExceptionType.connectionError,
        error: const NetworkException(),
        message: 'Cannot connect to server',
      ));
      return;
    }
    final statusCode = err.response?.statusCode;
    final data       = err.response?.data;
    final message    = (data is Map ? data['message'] as String? : null)
        ?? err.message
        ?? 'Server error';
    if (statusCode == 404) {
      handler.reject(DioException(
        requestOptions: err.requestOptions,
        response:       err.response,
        type:           DioExceptionType.badResponse,
        error:          NotFoundException(message),
        message:        message,
      ));
      return;
    }
    handler.reject(DioException(
      requestOptions: err.requestOptions,
      response:       err.response,
      type:           DioExceptionType.badResponse,
      error:          ServerException(message, statusCode: statusCode),
      message:        message,
    ));
  }
}
