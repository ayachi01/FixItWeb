import 'dart:io' show File;
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show ChangeNotifier, kIsWeb;
import 'package:camera/camera.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '/core/services/image_picker_service.dart';
import '/core/api_service.dart';
import 'dart:html' as html;

class ReportViewModel extends ChangeNotifier {
  final ImagePickerService _imagePicker;
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  Future<void>? _initializeControllerFuture;

  Future<void>? get initializeControllerFuture => _initializeControllerFuture;
  CameraController? get controller => _controller;

  bool _isTorchOn = false;
  bool get isTorchOn => _isTorchOn;

  File? selectedImage;
  Uint8List? selectedImageBytes;

  bool isLoading = false;
  List<Map<String, dynamic>> locationOptions = [];

  String? _webToken;

  ReportViewModel(this._imagePicker);

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

  Map<String, String> get currentDateTime {
    final now = DateTime.now();
    final formattedDate =
        "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final formattedTime =
        "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
    return {"date": formattedDate, "time": formattedTime};
  }

  Future<List<Map<String, dynamic>>> fetchLocations() async {
    try {
      isLoading = true;
      safeNotify();

      final locations = await _apiService.getLocations();
      locationOptions = List<Map<String, dynamic>>.from(locations);

      safeNotify();
      return locationOptions;
    } catch (e) {
      rethrow;
    } finally {
      isLoading = false;
      safeNotify();
    }
  }

  Future<void> saveToken(String token) async {
    _webToken = token;
    if (kIsWeb) {
      html.window.localStorage['access_token'] = token;
    } else {
      await _secureStorage.write(key: 'access_token', value: token);
    }
  }

  Future<String?> _getStoredToken() async {
    if (_webToken != null && _webToken!.isNotEmpty) return _webToken;

    if (kIsWeb) {
      final stored = html.window.localStorage['access_token'];
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

  Future<void> createTicket(Map<String, dynamic> formData) async {
    try {
      isLoading = true;
      safeNotify();

      final token = await _getStoredToken();
      if (token == null) {
        throw Exception("Authentication token missing. Please log in again.");
      }

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

      await _apiService.submitTicket(
        title: formData["title"] ?? "",
        description: formData["description"] ?? "",
        category: formData["category"] ?? "",
        urgency: formData["urgency"] ?? "Medium",
        locationId: formData["location"] ?? 1,
        imagePaths: imagePaths.isNotEmpty ? imagePaths : null,
        imageBytesList: imageBytesList.isNotEmpty ? imageBytesList : null,
      );
    } catch (e) {
      rethrow;
    } finally {
      isLoading = false;
      safeNotify();
    }
  }

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
    } catch (_) {}
    _controller = null;
    _initializeControllerFuture = null;
    safeNotify();
  }

  Future<void> logoutAndReset() async {
    try {
      await _apiService.logout();

      _webToken = null;
      await _secureStorage.delete(key: 'access_token');
      if (kIsWeb) html.window.localStorage.remove('access_token');

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
