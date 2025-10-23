import 'dart:typed_data';
import 'dart:io' show File;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '/core/utils/storage_helper.dart'; // ✅ your helper

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
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.headers.remove('Connection');
          return handler.next(options);
        },
      ),
    );
  }

  // ====================================================
  //  TOKEN HELPERS
  // ====================================================
  Future<void> saveTokens(String access, String refresh) async {
    _webAccessToken = access;
    _webRefreshToken = refresh;

    // ✅ Use your StorageHelper instead of html.window
    await StorageHelper.saveToken(access);
    // (Optionally save refresh token later if needed)

    dio.options.headers['Authorization'] = 'Bearer $access';
  }

  Future<String?> _getStoredAccessToken() async {
    if (_webAccessToken != null && _webAccessToken!.isNotEmpty) {
      dio.options.headers['Authorization'] = 'Bearer $_webAccessToken';
      return _webAccessToken;
    }

    final access = await StorageHelper.getToken();
    if (access != null && access.isNotEmpty) {
      _webAccessToken = access;
      dio.options.headers['Authorization'] = 'Bearer $access';
      return access;
    }

    return null;
  }

  Future<void> clearTokens() async {
    try {
      await StorageHelper.clearToken();

      _webAccessToken = null;
      _webRefreshToken = null;
      dio.options.headers.remove('Authorization');

      dio = Dio(
        BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        ),
      );

      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            options.headers.remove('Connection');
            return handler.next(options);
          },
        ),
      );
    } catch (_) {}
  }

  Future<void> logout() async {
    await clearTokens();
  }

  // ====================================================
  //  AUTH APIs
  // ====================================================
  Future<Map<String, dynamic>> emailLogin(String email, String password) async {
    try {
      await clearTokens();
      final response = await dio.post(
        '/users/email_login/',
        data: {'email': email, 'password': password},
      );
      final data = response.data as Map<String, dynamic>;
      if (data.containsKey('access') && data.containsKey('refresh')) {
        await saveTokens(data['access'], data['refresh']);
      }
      return data;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  //  REGISTRATION (AUTO LOGIN FOR MOBILE)
  // ====================================================
  Future<Map<String, dynamic>> registerSelfService({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    try {
      // ✅ Mobile requests include is_mobile flag
      final response = await dio.post(
        '/users/register_self_service/',
        data: {
          "first_name": firstName,
          "last_name": lastName,
          "email": email,
          "password": password,
          "confirm_password": confirmPassword,
          "is_mobile": true, // ✅ Let backend know it's mobile registration
        },
      );

      final data = response.data as Map<String, dynamic>;

      // ✅ If mobile backend returns tokens, store and auto-login
      if (data.containsKey('access') && data.containsKey('refresh')) {
        await saveTokens(data['access'], data['refresh']);
      }

      return data;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  //  OTP & PASSWORD RESET
  // ====================================================
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
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      throw Exception("Unexpected response format.");
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
            imagePaths.map(
              (path) async => await MultipartFile.fromFile(path),
            ),
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
        options: Options(
          headers: headers,
          contentType: 'multipart/form-data',
        ),
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
