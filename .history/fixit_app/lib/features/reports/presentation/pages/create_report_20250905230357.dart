import 'package:flutter/material.dart';
import '/features/dashboard/presentation/pages/homepage.dart';
import '/core/theme/input_decoration.dart';
import '/core/widgets/welcome_button.dart';

class CreateReport extends StatefulWidget {
  const CreateReport({super.key});

  @override
  State<CreateReport> createState() => CreateReportState();
}

class CreateReportState extends State<CreateReport> {
  // Form Key
  final _createReportKey = GlobalKey<FormState>();

  // Controllers
  final incidentType = TextEditingController();
  final description = TextEditingController();
  final location = TextEditingController();
  final dateCtrl = TextEditingController();
  final timeCtrl = TextEditingController();
  late TextEditingController _timeController;

  DateTime? selectedDate;
  TimeOfDay? pickTime;
  String? _selectedOption = "Public";

  @override
  void dispose() {
    incidentType.dispose();
    description.dispose();
    location.dispose();
    dateCtrl.dispose();
    timeCtrl.dispose();
    super.dispose();
  }

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
  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: pickTime ?? TimeOfDay.now(),
    );

    if (picked != null) {
      setState(() {
        pickTime = picked;
        timeCtrl.text = picked.format(context);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Add Details',
          style: TextStyle(
            fontSize: 18,
            fontFamily: 'KantumruyPro-Regular',
            fontWeight: FontWeight.w500,
          ),
        ),
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back),
        ),
        toolbarHeight: 60,
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _createReportKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [

                // Incident Type Title
                const Text(
                  "Incident Type",
                  style: TextStyle(
                    fontSize: 16,
                    fontFamily: 'Inter',
                    color: Color(0XFF000000),
                  ),
                ),
                const SizedBox(height: 8),

                // Incident Type
                TextFormField(
                  controller: incidentType,
                  keyboardType: TextInputType.text,
                  decoration: inputDecoration("Enter Incident Type"),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return "Please enter incident type!";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Description Title
                const Text(
                  "Description",
                  style: TextStyle(
                    fontSize: 16,
                    fontFamily: 'Inter',
                    color: Color(0XFF000000),
                  ),
                ),
                const SizedBox(height: 8),

                // Description
                TextFormField(
                  controller: description,
                  keyboardType: TextInputType.text,
                  maxLength: 50,
                  decoration: inputDecoration("Enter Description"),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return "Please enter description!";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 15),

                // Location Title
                const Text(
                  "Location",
                  style: TextStyle(
                    fontSize: 16,
                    fontFamily: 'Inter',
                    color: Color(0XFF000000),
                  ),
                ),
                const SizedBox(height: 8),

                // Location
                TextFormField(
                  readOnly: true,
                  controller: location,
                  keyboardType: TextInputType.text,
                  decoration: inputDecoration("Enter Location").copyWith(
                    suffixIcon: IconButton(
                      onPressed: () {
                      },
                      icon: const Icon(Icons.location_on),
                      color: Colors.black,
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return "Please enter location!";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Date Title
                const Text(
                  "Date",
                  style: TextStyle(
                    fontSize: 16,
                    fontFamily: 'Inter',
                    color: Color(0XFF000000),
                  ),
                ),
                const SizedBox(height: 8),

                // Date
                TextFormField(
                  readOnly: true,
                  controller: dateCtrl,
                  decoration: inputDecoration("Enter Date").copyWith(
                    suffixIcon: IconButton(
                      onPressed: _pickDate,
                      icon: const Icon(Icons.calendar_month),
                      color: Colors.black,
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return "Please select a date!";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Time Title
                const Text(
                  "Time",
                  style: TextStyle(
                    fontSize: 16,
                    fontFamily: 'Inter',
                    color: Color(0XFF000000),
                  ),
                ),
                const SizedBox(height: 8),

                // Time
                TextFormField(
                  readOnly: true,
                  controller: timeCtrl,
                  decoration: inputDecoration("Enter Time").copyWith(
                    suffixIcon: IconButton(
                      onPressed: _pickTime,
                      icon: const Icon(Icons.access_time_outlined),
                      color: Colors.black,
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return "Please select a time!";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Visibility with Radio Buttons
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Visibility:",
                    style: TextStyle(
                      fontSize: 16,
                      fontFamily: 'Inter',
                      color: Color(0XFF000000),
                    )),
                  ],
                ),
                Row(
                  children: [
                    SizedBox(
                      width: 150,
                      child: RadioListTile<String>(
                        title: const Text(
                          "Public",
                          style: TextStyle(fontSize: 16, fontFamily: 'Inter'),
                        ),
                        value: "Public",
                        groupValue: _selectedOption,
                        onChanged: (value) {
                          setState(() => _selectedOption = value);
                        },
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    
                    SizedBox(
                      width: 150,
                      child: RadioListTile<String>(
                        title: const Text(
                          "Private",
                          style: TextStyle(fontSize: 16, fontFamily: 'Inter'),
                        ),
                        value: "Private",
                        groupValue: _selectedOption,
                        onChanged: (value) {
                          setState(() => _selectedOption = value);
                        },
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    ],
                ),
                const SizedBx

                    // Submit Report Button
                     Center(
                       child: Padding(
                         padding: const EdgeInsets.only(top: 30),
                         child: SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: WelcomeButton(
                              text: "Submit Report",
                              isPrimary: true,
                              onPressed: () {
                                if (_createReportKey.currentState!.validate()) {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => HomePage(
                                      ),
                                    ),
                                  );
                                }
                              },
                            ),
                          ),
                       ),
                     ),
                  ],
                ),
            ),
          ),
        )
        );
  }
}