import 'package:flutter/material.dart';

class ReportViewModel extends ChangeNotifier {

  // Date Picker
  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );

    if (picked != null) {
      setState(() {
        selectedDate = picked;
        dateCtrl.text =
            "${picked.day.toString().padLeft(2, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.year}";
      });
    }
  }

  // Time Picker
  Future<void> pickTime(BuildContext context) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: selectedTime ?? TimeOfDay.now(),
    );

    if (picked != null) {
      setState(() {
        selectedTime = picked;
      });
    }
  }

  String getFormattedTime(BuildContext context) {
    if (selectedTime == null) return "";
    return selectedTime!.format(context);
  }
}
      };
  }
 String getFormattedTime(BuildContext context) {
    if (selectedTime == null) return "";
    return selectedTime!.format(context);
  }
} 
}