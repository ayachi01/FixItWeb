import 'package:flutter/material.dart';

class ReportViewModel extends ChangeNotifier {
  Future<void> pickTime(BuildContext context) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: selectedTime ?? TimeOfDay.now(),
    );

    if (picked != null) {
        selectedTime = picked;
        notifyListeners();
      };
  }
 String getFormattedTime(BuildContext context) {
    if (selectedTime == null) return "";
    return selectedTime!.format(context);
  }
} 
}