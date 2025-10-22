import 'dart:io' show File;
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show ChangeNotifier, kIsWeb, debugPrint;
import 'package:camera/camera.dart';
import 'package:flutter/scheduler.dart';
import '/core/services/image_picker_service.dart';
import '/core/api_service.dart';
import '/core/utils/storage_helper.dart';

class ReportViewModel extends ChangeNotifier {
  final ImagePickerService _imagePicker;
  final ApiService _apiService = ApiService();

  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  Future<void>? _initializeControllerFuture;

  Future<void>? get initializeControllerFuture => _initializeControllerFuture;
  CameraController? get controller => _controller;

  File? selectedImage;
  Uint8List? selectedImageBytes;

  bool isLoading = false;
  List<Map<String, dynamic>> locationOptions = [];

  String? _webToken;
  bool _isPickingImage = false;

  ReportViewModel(this._imagePicker);

  // -------------------------------
  // Safe notify to prevent rebuild errors
  // -------------------------------
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

  // -------------------------------
  // Current date & time
  // -------------------------------
  Map<String, String> get currentDateTime {
    final now = DateTime.now();
    final formattedDate =
        "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final formattedTime =
        "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
    return {"date": formattedDate, "time": formattedTime};
  }

  // -------------------------------
  // Fetch locations/buildings
  // -------------------------------
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

  // -------------------------------
  // Token storage
  // -------------------------------
  Future<void> saveToken(String token) async {
    _webToken = token;
    await StorageHelper.saveToken(token);
  }

  Future<String?> _getStoredToken() async {
    if (_webToken != null && _webToken!.isNotEmpty) return _webToken;

    final stored = await StorageHelper.getToken();
    if (stored != null && stored.isNotEmpty) {
      _webToken = stored;
      return stored;
    }

    return null;
  }

  // -------------------------------
  // Create ticket/report
  // -------------------------------
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

  // -------------------------------
  // Pick image from gallery
  // -------------------------------
  Future<void> pickFromGallery() async {
    if (_isPickingImage) return; // prevent multiple picks
    _isPickingImage = true;

    try {
      final image = await _imagePicker.pickImageFromGallery();
      if (image != null) {
        // clear previous image
        selectedImage = null;
        selectedImageBytes = null;

        if (kIsWeb) {
          selectedImageBytes = await image.readAsBytes();
        } else {
          selectedImage = File(image.path);
        }

        safeNotify();
      }
    } catch (e) {
      debugPrint("Error picking image: $e");
    } finally {
      _isPickingImage = false;
    }
  }

  void removeImage() {
    selectedImage = null;
    selectedImageBytes = null;
    safeNotify();
  }

  // -------------------------------
  // Camera setup and disposal
  // -------------------------------
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

  // -------------------------------
  // Logout and reset
  // -------------------------------
  Future<void> logoutAndReset() async {
    try {
      await _apiService.logout();

      _webToken = null;
      await StorageHelper.clearToken();

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
