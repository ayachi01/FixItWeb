import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageHelper {
  static const _secureStorage = FlutterSecureStorage();

  static Future<void> saveToken(String token) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('access_token', token);
    } else {
      await _secureStorage.write(key: 'access_token', value: token);
    }
  }

  static Future<String?> getToken() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('access_token');
    } else {
      return await _secureStorage.read(key: 'access_token');
    }
  }

  static Future<void> clearToken() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('access_token');
    } else {
      await _secureStorage.delete(key: 'access_token');
    }
  }
}
