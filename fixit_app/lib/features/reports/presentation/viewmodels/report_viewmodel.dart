import 'dart:io' show File;
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show ChangeNotifier, kIsWeb;
import 'package:camera/camera.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '/core/services/image_picker_service.dart';
import '/core/api_service.dart';
import 'dart:html' as html; // Web localStorage

class ReportViewModel extends ChangeNotifier {
  // ====================================================
  // SERVICES
  // ====================================================
  final ImagePickerService _imagePicker;
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // ====================================================
  // CAMERA
  // ====================================================
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  Future<void>? _initializeControllerFuture;

  Future<void>? get initializeControllerFuture => _initializeControllerFuture;
  CameraController? get controller => _controller;

  bool _isTorchOn = false;
  bool get isTorchOn => _isTorchOn;

  // ====================================================
  // IMAGE PICKER STATE
  // ====================================================
  File? selectedImage;
  Uint8List? selectedImageBytes;

  // ====================================================
  // UI / DATA STATE
  // ====================================================
  bool isLoading = false;
  List<Map<String, dynamic>> locationOptions = [];

  // ====================================================
  // WEB TOKEN FALLBACK
  // ====================================================
  String? _webToken;

  // ====================================================
  // CONSTRUCTOR
  // ====================================================
  ReportViewModel(this._imagePicker);

  // ====================================================
  // SAFE NOTIFY LISTENERS
  // ====================================================
  void safeNotify() {
    if (SchedulerBinding.instance.schedulerPhase == SchedulerPhase.idle ||
        SchedulerBinding.instance.schedulerPhase ==
            SchedulerPhase.postFrameCallbacks) {
      notifyListeners();
    } else {
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    }
  }

  // ====================================================
  // DATE / TIME
  // ====================================================
  Map<String, String> get currentDateTime {
    final now = DateTime.now();
    final formattedDate =
        "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final formattedTime =
        "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
    return {"date": formattedDate, "time": formattedTime};
  }

  // ====================================================
  // FETCH LOCATIONS
  // ====================================================
  Future<List<Map<String, dynamic>>> fetchLocations() async {
    try {
      isLoading = true;
      safeNotify();

      final locations = await _apiService.getLocations();
      locationOptions = List<Map<String, dynamic>>.from(locations);

      safeNotify();
      return locationOptions;
    } catch (e) {
      print("❌ Error fetching locations: $e");
      rethrow;
    } finally {
      isLoading = false;
      safeNotify();
    }
  }

  // ====================================================
  // SAVE TOKEN SAFELY (WEB + MOBILE)
  // ====================================================
  Future<void> saveToken(String token) async {
    _webToken = token;
    if (kIsWeb) {
      html.window.localStorage['access_token'] = token;
    } else {
      await _secureStorage.write(key: 'access_token', value: token);
    }
    print("🔐 Token saved successfully: ${token.substring(0, 10)}...");
  }

  // ====================================================
  // RETRIEVE TOKEN SAFELY
  // ====================================================
  Future<String?> _getStoredToken() async {
    if (_webToken != null && _webToken!.isNotEmpty) return _webToken;

    if (kIsWeb) {
      final stored = html.window.localStorage['access_token'];
      if (stored != null && stored.isNotEmpty) {
        _webToken = stored;
        print("🔐 Token loaded successfully: ${stored.substring(0, 10)}...");
        return stored;
      }
    } else {
      try {
        final token = await _secureStorage.read(key: 'access_token');
        if (token != null && token.isNotEmpty) {
          _webToken = token;
          print("🔐 Token loaded successfully: ${token.substring(0, 10)}...");
          return token;
        }
      } catch (e) {
        print("❌ Error reading token: $e");
        return null;
      }
    }

    print("⚠️ Token is missing or empty.");
    return null;
  }

  // ====================================================
  // CREATE / SUBMIT TICKET
  // ====================================================
  Future<void> createTicket(Map<String, dynamic> formData) async {
    try {
      isLoading = true;
      safeNotify();

      final token = await _getStoredToken();
      if (token == null) {
        throw Exception("Authentication token missing. Please log in again.");
      }

      // Prepare images
      List<String> imagePaths = [];
      List<Uint8List> imageBytesList = [];

      if (!kIsWeb && selectedImage != null) {
        imagePaths.add(selectedImage!.path);
      } else if (kIsWeb && selectedImageBytes != null) {
        imageBytesList.add(selectedImageBytes!);
      }

      if (imagePaths.isEmpty && imageBytesList.isEmpty) {
        throw Exception("Please attach at least 1 image.");
      }

      print("🔹 [Submit] Form data: $formData");

      await _apiService.submitTicket(
        title: formData["title"] ?? "",
        description: formData["description"] ?? "",
        category: formData["category"] ?? "",
        urgency: formData["urgency"] ?? "Medium",
        locationId: formData["location"] ?? 1,
        imagePaths: imagePaths.isNotEmpty ? imagePaths : null,
        imageBytesList: imageBytesList.isNotEmpty ? imageBytesList : null,
      );

      print("✅ Ticket submitted successfully!");
    } catch (e) {
      print("❌ Error creating ticket: $e");
      rethrow;
    } finally {
      isLoading = false;
      safeNotify();
    }
  }

  // ====================================================
  // IMAGE PICKER
  // ====================================================
  Future<void> pickFromGallery() async {
    final image = await _imagePicker.pickImageFromGallery();
    if (image != null) {
      if (kIsWeb) {
        selectedImageBytes = await image.readAsBytes();
      } else {
        selectedImage = File(image.path);
      }
      safeNotify();
    }
  }

  void removeImage() {
    selectedImage = null;
    selectedImageBytes = null;
    safeNotify();
  }

  // ====================================================
  // CAMERA MANAGEMENT
  // ====================================================
  Future<void> setupCamera() async {
    if (_controller != null) return;
    _cameras = await availableCameras();

    if (_cameras.isNotEmpty) {
      _controller = CameraController(
        _cameras.first,
        ResolutionPreset.low,
        enableAudio: false,
      );

      _initializeControllerFuture = _controller!.initialize();
      await _initializeControllerFuture;
      safeNotify();
    }
  }

  Future<void> disposeCamera() async {
    try {
      await _controller?.dispose();
    } catch (e) {
      print("Error disposing camera: $e");
    }
    _controller = null;
    _initializeControllerFuture = null;
    safeNotify();
  }

  // ====================================================
  // 🚪 LOGOUT + ACCOUNT RESET
  // ====================================================
  Future<void> logoutAndReset() async {
    try {
      print("🚪 Logging out and resetting account...");

      // 1️⃣ Logout via ApiService (clears tokens everywhere)
      await _apiService.logout();

      // 2️⃣ Clear local token references
      _webToken = null;
      await _secureStorage.delete(key: 'access_token');
      if (kIsWeb) html.window.localStorage.remove('access_token');

      // 3️⃣ Reset images, form data, etc.
      selectedImage = null;
      selectedImageBytes = null;
      locationOptions = [];

      // 4️⃣ Dispose camera properly
      await disposeCamera();

      print("🧹 All user data cleared — ready for new login.");
      safeNotify();
    } catch (e) {
      print("⚠️ Logout reset failed: $e");
    }
  }

  // ====================================================
  // CLEANUP
  // ====================================================
  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }
}
