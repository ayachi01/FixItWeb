import 'dart:html' as html;

class LocalStorageHelper {
  static void saveToken(String key, String value) {
    html.window.localStorage[key] = value;
  }

  static String? getToken(String key) {
    return html.window.localStorage[key];
  }

  static void removeToken(String key) {
    html.window.localStorage.remove(key);
  }
}
