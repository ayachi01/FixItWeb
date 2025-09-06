import 'package:flutter/material.dart';

class ReportViewModel extends ChangeNotifier {
  // Controllers
  final TextEditingController dateCtrl = TextEditingController();
  final TextEditingController timeCtrl = TextEditingController();
  final PickImageUseCase pickImageUseCase; 

  // State variables
  DateTime? selectedDate;
  TimeOfDay? selectedTime;
  String? selectedImagePath;

  ReportViewModel(this.pickImageUseCase);

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
  Future<void> pickImage() async {
    selectedImagePath = await pickImageUseCases
  }
}
