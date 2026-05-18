class ApiException implements Exception {
  final String message;
  final int?   statusCode;
  final bool   isNetworkError;
  final bool   isTimeout;

  const ApiException({
    required this.message,
    this.statusCode,
    this.isNetworkError = false,
    this.isTimeout = false,
  });

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden    => statusCode == 403;
  bool get isNotFound     => statusCode == 404;
  bool get isServerError  => (statusCode ?? 0) >= 500;

  @override
  String toString() => 'ApiException($statusCode): $message';

  String get userMessage {
    if (isTimeout)      return 'Request timed out. Check your connection.';
    if (isNetworkError) return 'Cannot reach server. Check IP or ngrok URL.';
    if (isUnauthorized) return 'Session expired. Please log in again.';
    if (isForbidden)    return 'You do not have permission.';
    if (isServerError)  return 'Server error. Try again later.';
    return message;
  }
}
