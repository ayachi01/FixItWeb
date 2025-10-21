// lib/utils/storage_web.dart
import 'dart:html' as html;

class StorageHelper {
  Future<void> write(String key, String value) async {
    html.window.localStorage[key] = value;
  }

  Future<String?> read(String key) async {
    return html.window.localStorage[key];
  }

  Future<void> delete(String key) async {
    html.window.localStorage.remove(key);
  }

  Future<void> deleteAll() async {
    html.window.localStorage.clear();
  }
}
