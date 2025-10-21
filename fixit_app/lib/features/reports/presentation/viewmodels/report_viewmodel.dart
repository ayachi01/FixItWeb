import 'dart:io';
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '/core/services/image_picker_service.dart';
import '/core/api_service.dart';
import '/core/utils/storage_helper.dart';

class ReportViewModel extends ChangeNotifier {
  // Services
  final ImagePickerService _imagePicker;
  final ApiService _apiService = ApiService();

  // Controllers
  final TextEditingController dateCtrl = TextEditingController();
  final TextEditingController timeCtrl = TextEditingController();
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  Future<void>? _initializeControllerFuture;

  // Constructor
  ReportViewModel(this._imagePicker);

  Future<void>? get initializeControllerFuture => _initializeControllerFuture;

  // State variables
  DateTime? selectedDate;
  TimeOfDay? selectedTime;
  File? selectedImage;
  bool _isTorchOn = false;
  bool get isTorchOn => _isTorchOn;
  CameraController? get controller => _controller;

  // Optional variables for storage
  String? _webToken;
  Uint8List? selectedImageBytes;
  List<String> locationOptions = [];

  // Dispose controllers
  @override
  void dispose() {
    dateCtrl.dispose();
    timeCtrl.dispose();
    _controller?.dispose();
    super.dispose();
  }

  // ====================================================
  // DATE & TIME PICKERS
  // ====================================================
  Future<void> pickDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: selectedDate ?? DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime(2030),
    );

    if (picked != null) {
      selectedDate = picked;
      dateCtrl.text =
          "${picked.day.toString().padLeft(2, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.year}";
      notifyListeners();
    }
  }

  Future<void> pickTime(BuildContext context) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: selectedTime ?? TimeOfDay.now(),
    );

    if (picked != null) {
      selectedTime = picked;
      timeCtrl.text = picked.format(context);
      notifyListeners();
    }
  }

  // Formatted Date
  String get formattedDate {
    if (selectedDate == null) return "";
    return "${selectedDate!.day.toString().padLeft(2, '0')}-"
        "${selectedDate!.month.toString().padLeft(2, '0')}-"
        "${selectedDate!.year}";
  }

  // Formatted Time
  String get formattedTime {
    if (selectedTime == null) return "";
    return timeCtrl.text;
  }

  // ====================================================
  // TOKEN MANAGEMENT (WEB + MOBILE)
  // ====================================================
  Future<void> saveToken(String token) async {
    _webToken = token;
    await StorageHelper.saveToken(token);
    print("🔐 Token saved successfully: ${token.substring(0, 10)}...");
  }

  Future<String?> _getStoredToken() async {
    if (_webToken != null && _webToken!.isNotEmpty) return _webToken;

    final stored = await StorageHelper.getToken();
    if (stored != null && stored.isNotEmpty) {
      _webToken = stored;
      print("🔐 Token loaded successfully: ${stored.substring(0, 10)}...");
      return stored;
    }

    print("⚠️ Token is missing or empty.");
    return null;
  }

  // ====================================================
  // IMAGE PICKING
  // ====================================================
  Future<void> pickFromGallery() async {
    final XFile? image = await _imagePicker.pickImageFromGallery();
    if (image != null) {
      selectedImage = File(image.path);
      notifyListeners();
    }
  }

  void removeImage() {
    selectedImage = null;
    notifyListeners();
  }

  // ====================================================
  // CAMERA CONTROLS
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
      notifyListeners();
    }
  }

  Future<void> disposeCamera() async {
    try {
      if (_controller != null && _controller!.value.isStreamingImages) {
        await _controller!.stopImageStream();
      }
      await _controller?.dispose();
    } catch (e) {
      print("Error disposing camera: $e");
    }
    _controller = null;
    _initializeControllerFuture = null;
    notifyListeners();
  }

  Future<void> pauseCamera() async {
    if (_controller != null && _controller!.value.isStreamingImages) {
      await _controller?.stopImageStream();
      notifyListeners();
    }
  }

  Future<void> resumeCamera() async {
    if (_controller != null && !_controller!.value.isStreamingImages) {
      await _controller!.startImageStream((CameraImage image) {});
      notifyListeners();
    }
  }

  // ====================================================
  // LOGOUT + ACCOUNT RESET
  // ====================================================
  Future<void> logoutAndReset() async {
    try {
      print("🚪 Logging out and resetting account...");

      await _apiService.logout();
      _webToken = null;
      await StorageHelper.clearToken();

      selectedImage = null;
      selectedImageBytes = null;
      locationOptions = [];

      await disposeCamera();

      print("🧹 All user data cleared — ready for new login.");
      notifyListeners();
    } catch (e) {
      print("⚠️ Logout reset failed: $e");
    }
  }
}
