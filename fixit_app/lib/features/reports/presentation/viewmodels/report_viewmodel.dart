import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '/core/services/image_picker_service.dart';

class ReportViewModel extends ChangeNotifier {
  // Services
  final ImagePickerService _imagePicker;

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

  // Dispose controllers
  @override
  void dispose() {
    dateCtrl.dispose();
    timeCtrl.dispose();
    _controller?.dispose();
    super.dispose();
  }

  // Date Picker
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

  // Time Picker
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

  // Image Picker
  Future<void> pickFromGallery() async {
    final XFile? image = await _imagePicker.pickImageFromGallery();
    if (image != null) {
      selectedImage = File(image.path);
      notifyListeners();
    }
  }

  // Remove Image
  void removeImage() {
    selectedImage = null;
    notifyListeners();
  }

  // Setup Camera
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

  // Dispose Camera
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
    if(_controller != null && _controller!.value.isStreamingImages) {
      await _controller?.stopImageStream();
      notifyListeners();
    }
  }

  Future<void> resumeCamera() async {
    if (_controller != null && !_controller!.value.isStreamingImages) {
      await _controller!.startImageStream((CameraImage image) {
      });
      notifyListeners();
    }
  }
}
