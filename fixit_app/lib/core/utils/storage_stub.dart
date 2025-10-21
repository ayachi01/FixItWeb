// lib/utils/storage_stub.dart
class StorageHelper {
  Future<void> write(String key, String value) async {
    // No-op for unsupported platforms
  }

  Future<String?> read(String key) async {
    return null;
  }

  Future<void> delete(String key) async {
    // No-op
  }

  Future<void> deleteAll() async {
    // No-op
  }
}
