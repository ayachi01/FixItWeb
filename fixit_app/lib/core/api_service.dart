import 'package:dio/dio.dart';

class ApiService {
  final String baseUrl = "http://192.168.5.137:8000/api";
  late final Dio dio;

  ApiService() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
        },
      ),
    );
  }

  // ====================================================
  // 🔹 EMAIL LOGIN
  // ====================================================
  Future<Map<String, dynamic>> emailLogin(
      String email, String password) async {
    try {
      final response = await dio.post(
        '/users/email_login/',
        data: {'email': email, 'password': password},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  // 🔹 SELF-REGISTER
  // ====================================================
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

  // ====================================================
  // 🔹 VERIFY OTP (MATCHING BACKEND)
  // ====================================================
  Future<Map<String, dynamic>> verifyOtp(String email, String otp) async {
    try {
      final response = await dio.post(
        '/users/verify_otp/',
        data: {
          'email': email,
          'otp': otp,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  // 🔹 RESEND OTP (MATCHING BACKEND)
  // ====================================================
  Future<Map<String, dynamic>> resendOtp(String email) async {
    try {
      final response = await dio.post(
        '/users/resend_otp/',
        data: {
          'email': email,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  // 🔹 PASSWORD RESET REQUEST
  // ====================================================
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

  // ====================================================
  // 🔹 PASSWORD RESET CONFIRM
  // ====================================================
  Future<Map<String, dynamic>> confirmPasswordReset(
      String email, String code, String newPassword) async {
    try {
      final response = await dio.post(
        '/users/reset_password_confirm/',
        data: {
          'email': email,
          'code': code,
          'new_password': newPassword,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  // ====================================================
  // 🔹 GLOBAL ERROR HANDLER
  // ====================================================
  String _handleError(DioException e) {
    if (e.response != null) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) {
        return data['detail'];
      } else if (data is Map && data['message'] != null) {
        return data['message'];
      } else if (data is Map && data['error'] != null) {
        return data['error'];
      } else {
        return data.toString();
      }
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return "Connection timed out. Please check your internet connection.";
    } else if (e.type == DioExceptionType.receiveTimeout) {
      return "Server took too long to respond. Try again later.";
    } else if (e.type == DioExceptionType.connectionError) {
      return "Failed to connect to the server. Is the backend running?";
    } else {
      return e.message ?? "Unexpected error occurred.";
    }
  }
}
