import 'dart:io' show File;
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import '/core/services/image_picker_service.dart';
import '/core/services/llm_service.dart';
import '/core/api_service.dart';

// ✅ Conditional import (web-safe local storage)
import 'package:fixit/core/helpers/local_storage_helper_web.dart'
    if (dart.library.io) 'package:fixit/core/helpers/local_storage_helper_stub.dart';

class ReportViewModel extends ChangeNotifier {
  // Services
  final ImagePickerService _imagePicker;
  final LLMService _llmService = LLMService();
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  ReportViewModel(this._imagePicker);

  // Camera
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  Future<void>? _initializeControllerFuture;
  Future<void>? get initializeControllerFuture => _initializeControllerFuture;
  CameraController? get controller => _controller;

  // State
  bool _isTorchOn = false;
  bool get isTorchOn => _isTorchOn;
  bool isLoading = false;
  bool _isLLMLoading = false;
  bool get isLLMLoading => _isLLMLoading;

  File? selectedImage;
  Uint8List? selectedImageBytes;
  List<Map<String, dynamic>> locationOptions = [];

  // Tokens
  String? _webToken;

  // LLM Result
  String? _llmResult;
  Map<String, dynamic>? llmData;

  // ========================
  // 🧠  SAFE NOTIFY
  // ========================
  void safeNotify() {
    if (SchedulerBinding.instance.schedulerPhase == SchedulerPhase.idle ||
        SchedulerBinding.instance.schedulerPhase ==
            SchedulerPhase.postFrameCallbacks) {
      notifyListeners();
    } else {
      SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
    }
  }

  // ========================
  // 🗓️ DATE + TIME HELPERS
  // ========================
  Map<String, String> get currentDateTime {
    final now = DateTime.now();
    final formattedDate =
        "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final formattedTime =
        "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
    return {"date": formattedDate, "time": formattedTime};
  }

  // ========================
  // 🧾 LOCATIONS (Backend)
  // ========================
  Future<List<Map<String, dynamic>>> fetchLocations() async {
    try {
      isLoading = true;
      safeNotify();

      final locations = await _apiService.getLocations();
      locationOptions = List<Map<String, dynamic>>.from(locations);
      return locationOptions;
    } finally {
      isLoading = false;
      safeNotify();
    }
  }

  // ========================
  // 🔐 TOKEN HANDLING
  // ========================
  Future<void> saveToken(String token) async {
    _webToken = token;
    if (kIsWeb) {
      LocalStorageHelper.saveToken('access_token', token);
    } else {
      await _secureStorage.write(key: 'access_token', value: token);
    }
  }

  Future<String?> _getStoredToken() async {
    if (_webToken != null && _webToken!.isNotEmpty) return _webToken;

    if (kIsWeb) {
      final stored = LocalStorageHelper.getToken('access_token');
      if (stored != null && stored.isNotEmpty) {
        _webToken = stored;
        return stored;
      }
    } else {
      try {
        final token = await _secureStorage.read(key: 'access_token');
        if (token != null && token.isNotEmpty) {
          _webToken = token;
          return token;
        }
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  // ========================
  // 🧾 SUBMIT REPORT (Backend)
  // ========================
  Future<void> createTicket(Map<String, dynamic> formData) async {
    try {
      isLoading = true;
      safeNotify();

      final token = await _getStoredToken();
      if (token == null) throw Exception("Authentication token missing.");

      List<String> imagePaths = [];
      List<Uint8List> imageBytesList = [];

      if (!kIsWeb && selectedImage != null) {
        imagePaths.add(selectedImage!.path);
      } else if (kIsWeb && selectedImageBytes != null) {
        imageBytesList.add(selectedImageBytes!);
      }

      await _apiService.submitTicket(
        title: formData["title"] ?? "",
        description: formData["description"] ?? "",
        category: formData["category"] ?? "",
        urgency: formData["urgency"] ?? "Medium",
        locationId: formData["location"] ?? 1,
        imagePaths: imagePaths.isNotEmpty ? imagePaths : null,
        imageBytesList: imageBytesList.isNotEmpty ? imageBytesList : null,
      );
    } finally {
      isLoading = false;
      safeNotify();
    }
  }

  // ========================
  // 🧠 LLM: Analyze Image
  // ========================
  Future<Map<String, dynamic>?> sendToLLM(File imageFile) async {
    try {
      _isLLMLoading = true;
      safeNotify();

      final response = await _llmService.reportIssue(image: imageFile);
      if (response.isEmpty) return null;

      llmData = {
        'building': response['ticket']?['building'] ?? '',
        'room': response['ticket']?['room'] ?? '',
        'item': response['ticket']?['item'] ?? '',
        'intent': response['ticket']?['intent'] ?? '',
        'notes': response['ticket']?['notes'] ?? '',
      };
      _llmResult = response['ai_reply'];
      safeNotify();
      return llmData;
    } catch (e) {
      debugPrint("Error in sendToLLM: $e");
      return null;
    } finally {
      _isLLMLoading = false;
      safeNotify();
    }
  }

  // ========================
  // 🎥 CAMERA MANAGEMENT
  // ========================
  Future<void> setupCamera() async {
    if (_controller != null) return;
    _cameras = await availableCameras();

    if (_cameras.isNotEmpty) {
      _controller = CameraController(
        _cameras.first,
        ResolutionPreset.medium,
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
    } catch (_) {}
    _controller = null;
    _initializeControllerFuture = null;
    safeNotify();
  }

  // ========================
  // 🖼️ IMAGE PICKING
  // ========================
  Future<void> pickFromGallery() async {
    final XFile? image = await _imagePicker.pickImageFromGallery();
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
    _llmResult = null;
    llmData = null;
    safeNotify();
  }

  // ========================
  // 🚪 LOGOUT + RESET
  // ========================
  Future<void> logoutAndReset() async {
    try {
      await _apiService.logout();
      _webToken = null;
      await _secureStorage.delete(key: 'access_token');
      LocalStorageHelper.removeToken('access_token');
      selectedImage = null;
      selectedImageBytes = null;
      locationOptions = [];
      await disposeCamera();
      safeNotify();
    } catch (_) {}
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }
}
