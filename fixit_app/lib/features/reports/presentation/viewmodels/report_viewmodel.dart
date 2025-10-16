import 'dart:io' show File;
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '/core/services/image_picker_service.dart';

class ReportViewModel extends ChangeNotifier {
  // Services
  final ImagePickerService _imagePicker;

  // Camera
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  Future<void>? _initializeControllerFuture;

  // Constructor
  ReportViewModel(this._imagePicker);

  Future<void>? get initializeControllerFuture => _initializeControllerFuture;

  // State variables
  File? selectedImage;
  Uint8List? selectedImageBytes; 
  bool _isTorchOn = false;
  bool get isTorchOn => _isTorchOn;
  CameraController? get controller => _controller;

  // Dispose controllers
  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Map<String, String> get currentDateTime {
    final now = DateTime.now();

    final formattedDate =
        "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    
    final formattedTime =
      "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";

    return {
      "date": formattedDate,
      "time": formattedTime,
    };
  }

  // Image Picker
  Future<void> pickFromGallery() async {
  final XFile? image = await _imagePicker.pickImageFromGallery();
  if (image != null) {
    if (kIsWeb) {
      selectedImageBytes = await image.readAsBytes();
    } else {
      selectedImage = File(image.path);
    }
    notifyListeners();
  }
}


  // Remove Image
 void removeImage() {
  selectedImage = null;
  selectedImageBytes = null;
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
}