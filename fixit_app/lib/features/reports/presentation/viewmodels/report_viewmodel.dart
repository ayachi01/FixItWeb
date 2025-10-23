import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '/core/services/image_picker_service.dart';
import '/core/services/llm_service.dart';
import '/core/api_service.dart';
import '/core/utils/storage_helper.dart';
import 'package:flutter/scheduler.dart';

class ReportViewModel extends ChangeNotifier {
  // -------------------------------
  // Services
  // -------------------------------
  final ImagePickerService _imagePicker;
  final ApiService _apiService = ApiService();
  final LLMService _llmService = LLMService();

  // -------------------------------
  // Controllers
  // -------------------------------
  final TextEditingController dateCtrl = TextEditingController();
  final TextEditingController timeCtrl = TextEditingController();

  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  Future<void>? _initializeControllerFuture;
  Future<void>? get initializeControllerFuture => _initializeControllerFuture;
  CameraController? get controller => _controller;

  // -------------------------------
  // State variables
  // -------------------------------
  bool isLoading = false;
  bool _isPickingImage = false;
  bool _isTorchOn = false;
  bool get isTorchOn => _isTorchOn;

  DateTime? selectedDate;
  TimeOfDay? selectedTime;
  File? selectedImage;
  Uint8List? selectedImageBytes;

  List<Map<String, dynamic>> locationOptions = [];
  String? _webToken;
  String? _llmResult;
  String? get llmResult => _llmResult;

  // Constructor
  ReportViewModel(this._imagePicker);

  // -------------------------------
  // Safe notify
  // -------------------------------
  void safeNotify() {
    if (SchedulerBinding.instance.schedulerPhase == SchedulerPhase.idle ||
        SchedulerBinding.instance.schedulerPhase ==
            SchedulerPhase.postFrameCallbacks) {
      notifyListeners();
    } else {
      SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
    }
  }

  // -------------------------------
  // 📅 Date & 🕒 Time
  // -------------------------------
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
      safeNotify();
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
      safeNotify();
    }
  }

  String get formattedDate {
    if (selectedDate == null) return "";
    return "${selectedDate!.day.toString().padLeft(2, '0')}-"
        "${selectedDate!.month.toString().padLeft(2, '0')}-"
        "${selectedDate!.year}";
  }

  String get formattedTime => timeCtrl.text;

  // -------------------------------
  // 📍 Fetch Locations
  // -------------------------------
  Future<List<Map<String, dynamic>>> fetchLocations() async {
    try {
      isLoading = true;
      safeNotify();

      final locations = await _apiService.getLocations();
      locationOptions = List<Map<String, dynamic>>.from(locations);
      return locationOptions;
    } catch (e) {
      rethrow;
    } finally {
      isLoading = false;
      safeNotify();
    }
  }

  // -------------------------------
  // 🔐 Token Handling
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
  // 🧾 Create Ticket (Backend)
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
  // 🧠 Send to LLM for Prefill
  // -------------------------------
  Future<Map<String, dynamic>> sendToLLM(File imageFile) async {
    try {
      isLoading = true;
      safeNotify();

      // 🧠 Send actual image to LLM backend (Flask)
      final response = await _llmService.reportIssue(image: imageFile);

      // Parse AI reply
      _llmResult = response["ai_reply"]?.toString() ?? "No AI response";
      safeNotify();

      return response;
    } catch (e) {
      debugPrint("Error in sendToLLM: $e");
      return {"ai_reply": "Error: $e", "ticket": {}};
    } finally {
      isLoading = false;
      safeNotify();
    }
  }

  // -------------------------------
  // 🖼️ Pick Image
  // -------------------------------
  Future<void> pickFromGallery() async {
    if (_isPickingImage) return;
    _isPickingImage = true;

    try {
      final image = await _imagePicker.pickImageFromGallery();
      if (image != null) {
        selectedImage = File(image.path);
        selectedImageBytes = await image.readAsBytes();
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
    _llmResult = null;
    safeNotify();
  }

  // -------------------------------
  // 📸 Camera Setup
  // -------------------------------
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

  // -------------------------------
  // 🚪 Logout & Reset
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

  // -------------------------------
  // Dispose Controllers
  // -------------------------------
  @override
  void dispose() {
    dateCtrl.dispose();
    timeCtrl.dispose();
    _controller?.dispose();
    super.dispose();
  }
}
