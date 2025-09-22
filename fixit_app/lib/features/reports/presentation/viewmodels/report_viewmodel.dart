import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '/core/services/image_picker_service.dart';
import '/core/services/torch_service.dart';

class ReportViewModel extends ChangeNotifier {
  // Services
  final TorchService? _torchService;
  final ImagePickerService _imagePicker;

  // Controllers
  final TextEditingController dateCtrl = TextEditingController();
  final TextEditingController timeCtrl = TextEditingController();

  // Constructor
  ReportViewModel(this._imagePicker, [this._torchService]);

  // State variables
  DateTime? selectedDate;
  TimeOfDay? selectedTime;
  File? selectedImage;
  bool _isTorchOn = false;
  bool get isTorchOn => _isTorchOn;

  // Dispose controllers
  @override
  void dispose() {
    dateCtrl.dispose();
    timeCtrl.dispose();
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

  // Toggle Torch
  Future<void> toggleTorch() async {
    if (_torchService == null) return;
    _isTorchOn = !_isTorchOn;
    notifyListeners();
    await _torchService.toggleTorch(_isTorchOn);
  }
}

