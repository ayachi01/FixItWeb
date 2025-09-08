import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '/features/dashboard/presentation/pages/homepage.dart';
import '/core/theme/input_decoration.dart';
import '/core/widgets/welcome_button.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';

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
  final building = TextEditingController();

  DateTime? selectedDate;
  TimeOfDay? pickTime;
  String? _selectedOption = "Public";
  String? dropDownValue;

  @override
  void dispose() {
    incidentType.dispose();
    description.dispose();
    building.dispose();
    super.dispose();
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
                  maxLength: 50,
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

                // Building Title
                const Text(
                  "Building",
                  style: TextStyle(
                    fontSize: 16,
                    fontFamily: 'Inter',
                    color: Color(0XFF000000),
                  ),
                ),
                const SizedBox(height: 8),

                // Building
                DropdownButtonFormField<String>(
                  value: dropDownValue,
                  hint: const Text('Select Building'),
                  onChanged: (String? newValue) {
                    setState(() {
                      dropDownValue = newValue!;
                    });
                  },

                  // Drop Down Items
                  items: const [
                    // PTC
                    DropdownMenuItem<String>(value: 'PTC', child: Text('PTC')),
                    // Faculty
                    DropdownMenuItem<String>(value: 'MBA', child: Text('MBA')),
                    // CMA
                    DropdownMenuItem<String>(value: 'CMA', child: Text('CMA')),
                    // NH
                    DropdownMenuItem<String>(value: 'NH', child: Text('NH')),
                    // RS
                    DropdownMenuItem<String>(value: 'RS', child: Text('RS')),
                    // BE
                    DropdownMenuItem<String>(value: 'BE', child: Text('BE')),
                  ],
                  decoration: inputDecoration(""),

                  // Validator
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return "Please select an option!";
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
                Consumer<ReportViewModel>(
                  builder: (context, vm, child) {
                    return TextFormField(
                      readOnly: true,
                      controller: vm.dateCtrl,
                      decoration: inputDecoration("Enter Date").copyWith(
                        suffixIcon: IconButton(
                          onPressed: () => vm.pickDate(context),
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
                    );
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
                Consumer<ReportViewModel>(
                  builder: (context, vm, child) {
                    return TextFormField(
                      controller: vm.timeCtrl,
                      readOnly: true,
                      decoration: inputDecoration("Enter Time").copyWith(
                        suffixIcon: IconButton(
                          onPressed: () => vm.pickTime(context),
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
                    );
                  },
                ),
                const SizedBox(height: 20),

                // Visibility with Radio Buttons
                const Text(
                  "Visibility:",
                  style: TextStyle(
                    fontSize: 16,
                    fontFamily: 'Inter',
                    color: Color(0XFF000000),
                  ),
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
                const SizedBox(height: 20),

                // Add Clear Image
                Container(
                  width: double.infinity,
                  height: 100,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Consumer<ReportViewModel>(
                      builder: (context, vm, child) {
                        return Column(
                          children: [
                            vm.selectedImage == null || vm.selectedImage!.path.isEmpty
                            ? const Text ("No image selected")
                            : Image.file(vm.selectedImage!, height: 80),
        
                      MaterialButton(
                        onPressed: () {
                          vm
                        },
                        textColor: Colors.black,
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.add_a_photo),
                            SizedBox(width: 8),
                            Text(
                              "Add clear image of the issue",
                              style: TextStyle(fontSize: 16, fontFamily: 'Inter'),
                            ),
                          ],
                        ),
                      ),
                          ]
                          );
                      },
                    ),
                  ),
                ),

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
                                builder: (context) => const HomePage(),
                              ),
                            );
                          }
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
