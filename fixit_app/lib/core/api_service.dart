import 'dart:typed_data';
import 'dart:io' show File;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:html' as html; // For web localStorage

class ApiService {
  final String baseUrl = "http://192.168.5.137:8000/api";
  late Dio dio;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  String? _webAccessToken;
  String? _webRefreshToken;

  // ====================================================
  //  CONSTRUCTOR
  // ====================================================
  ApiService() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {'Content-Type': 'application/json'},
      ),
    );
  }

  // ====================================================
  //  TOKEN HELPERS
  // ====================================================

  /// Save both access and refresh tokens
  Future<void> saveTokens(String access, String refresh) async {
    _webAccessToken = access;
    _webRefreshToken = refresh;

    if (kIsWeb) {
      html.window.localStorage['access_token'] = access;
      html.window.localStorage['refresh_token'] = refresh;
    } else {
      await _secureStorage.write(key: 'access_token', value: access);
      await _secureStorage.write(key: 'refresh_token', value: refresh);
    }

    dio.options.headers['Authorization'] = 'Bearer $access';
    print("🔐 Tokens saved successfully (access: ${access.substring(0, 10)}...)");
  }

  /// Load access token from storage if it exists
  Future<String?> _getStoredAccessToken() async {
    if (_webAccessToken != null && _webAccessToken!.isNotEmpty) return _webAccessToken;

    if (kIsWeb) {
      final access = html.window.localStorage['access_token'];
      if (access != null && access.isNotEmpty) {
        _webAccessToken = access;
        dio.options.headers['Authorization'] = 'Bearer $access';
        return access;
      }
      return null;
    } else {
      final access = await _secureStorage.read(key: 'access_token');
      if (access != null && access.isNotEmpty) {
        _webAccessToken = access;
        dio.options.headers['Authorization'] = 'Bearer $access';
        return access;
      }
      return null;
    }
  }

  /// Completely clears stored tokens, Dio headers, and memory state
  Future<void> clearTokens() async {
    try {
      if (kIsWeb) {
        html.window.localStorage.remove('access_token');
        html.window.localStorage.remove('refresh_token');
      } else {
        await _secureStorage.delete(key: 'access_token');
        await _secureStorage.delete(key: 'refresh_token');
      }

      _webAccessToken = null;
      _webRefreshToken = null;

      dio.options.headers.remove('Authorization');

      dio = Dio(
        BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {'Content-Type': 'application/json'},
        ),
      );

      print("🧹 Tokens cleared and Dio reset completely.");
    } catch (e) {
      print("⚠️ Failed to clear tokens: $e");
    }
  }

  // ====================================================
  //  LOGOUT (Local only — no backend call)
  // ====================================================
  Future<void> logout() async {
    await clearTokens();
    print("🚪 User logged out locally (tokens + Dio reset).");
  }

  // ====================================================
  //  AUTH APIs
  // ====================================================

  Future<Map<String, dynamic>> emailLogin(String email, String password) async {
    try {
      await clearTokens(); // Always clear before login

      final response = await dio.post(
        '/users/email_login/',
        data: {'email': email, 'password': password},
      );

      final data = response.data as Map<String, dynamic>;

      // Backend returns access + refresh + profile
      if (data.containsKey('access') && data.containsKey('refresh')) {
        await saveTokens(data['access'], data['refresh']);
      }

      return data;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  Future<Map<String, dynamic>> registerSelfService({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    try {
      final response = await dio.post(
        '/users/register_self_service/',
        data: {
          "first_name": firstName,
          "last_name": lastName,
          "email": email,
          "password": password,
          "confirm_password": confirmPassword,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  Future<Map<String, dynamic>> verifyOtp(String email, String otp) async {
    try {
      final response = await dio.post(
        '/users/verify_otp/',
        data: {'email': email, 'otp': otp},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  Future<Map<String, dynamic>> resendOtp(String email) async {
    try {
      final response = await dio.post(
        '/users/resend_otp/',
        data: {'email': email},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  Future<Map<String, dynamic>> requestPasswordReset(String email) async {
    try {
      final response = await dio.post(
        '/users/reset_password_request/',
        data: {'email': email},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  Future<Map<String, dynamic>> confirmPasswordReset(
    String email,
    String code,
    String newPassword,
  ) async {
    try {
      final response = await dio.post(
        '/users/reset_password_confirm/',
        data: {'email': email, 'code': code, 'new_password': newPassword},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  //  LOCATIONS
  // ====================================================

  Future<List<Map<String, dynamic>>> getLocations() async {
    try {
      final response = await dio.get('/locations/');
      if (response.statusCode == 200) {
        final data = response.data;
        if (data is List) {
          return data.map((item) => Map<String, dynamic>.from(item)).toList();
        }
        throw Exception("Unexpected response format from server");
      }
      throw Exception("Failed to fetch locations: ${response.statusCode}");
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  //  SUBMIT TICKET
  // ====================================================

  Future<Map<String, dynamic>> submitTicket({
    required String title,
    required String description,
    required String category,
    required int locationId,
    String urgency = "Medium",
    List<String>? imagePaths,
    List<Uint8List>? imageBytesList,
  }) async {
    try {
      final token = await _getStoredAccessToken();
      if (token == null) throw Exception("Authentication token missing.");

      final headers = {'Authorization': 'Bearer $token'};

      final formData = FormData.fromMap({
        'title': title,
        'description': description,
        'category': category,
        'urgency': urgency,
        'location': locationId,
        if (imagePaths != null && imagePaths.isNotEmpty)
          'image': await Future.wait(
            imagePaths.map((path) async => await MultipartFile.fromFile(path)),
          ),
        if (imageBytesList != null && imageBytesList.isNotEmpty)
          'image': imageBytesList
              .asMap()
              .entries
              .map(
                (entry) => MultipartFile.fromBytes(
                  entry.value,
                  filename: "ticket_image_${entry.key}.png",
                ),
              )
              .toList(),
      });

      final response = await dio.post(
        '/tickets/report_issue/',
        data: formData,
        options: Options(headers: headers, contentType: 'multipart/form-data'),
      );

      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  //  FETCH MY TICKETS
  // ====================================================
  Future<List<Map<String, dynamic>>> getMyTickets() async {
    try {
      final token = await _getStoredAccessToken();
      if (token == null) throw Exception("Authentication token missing.");

      final response = await dio.get(
        '/tickets/my_reports/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      } else {
        throw Exception("Unexpected response format: ${response.data}");
      }
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  //  GLOBAL ERROR HANDLER
  // ====================================================

  String _handleError(DioException e) {
    if (e.response != null) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) return data['detail'];
      if (data is Map && data['message'] != null) return data['message'];
      if (data is Map && data['error'] != null) return data['error'];
      return data.toString();
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return "Connection timed out. Check your internet.";
    } else if (e.type == DioExceptionType.receiveTimeout) {
      return "Server took too long to respond.";
    } else if (e.type == DioExceptionType.connectionError) {
      return "Failed to connect to the server. Is it running?";
    } else {
      return e.message ?? "Unexpected error occurred.";
    }
  }
}
