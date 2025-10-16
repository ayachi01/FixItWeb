import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
  final category = TextEditingController();
  final urgency = TextEditingController();

  // State variables
  String? _selectedOption = "Public";
  String? buildingDropDownValue;
  String? categoryDropDownValue;
  String? urgencyDropDownValue;

  // Dispose controllers
  @override
  void dispose() {
    incidentType.dispose();
    description.dispose();
    building.dispose();
    category.dispose();
    urgency.dispose();
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

                // Incident Type Input
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

                // Building Dropdown
                const Text("Building",
                    style: TextStyle(fontSize: 16, fontFamily: 'Inter')),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: buildingDropDownValue,
                  hint: const Text('Select Building'),
                  onChanged: (String? newValue) {
                    setState(() => buildingDropDownValue = newValue!);
                  },
                  items: const [
                    DropdownMenuItem(value: 'PTC', child: Text('PTC')),
                    DropdownMenuItem(value: 'MBA', child: Text('MBA')),
                    DropdownMenuItem(value: 'CMA', child: Text('CMA')),
                    DropdownMenuItem(value: 'NH', child: Text('NH')),
                    DropdownMenuItem(value: 'RS', child: Text('RS')),
                    DropdownMenuItem(value: 'BE', child: Text('BE')),
                  ],
                  decoration: inputDecoration(""),
                  validator: (value) =>
                      value == null ? "Please select a building!" : null,
                ),
                const SizedBox(height: 20),

                // Category Dropdown
                const Text("Category",
                    style: TextStyle(fontSize: 16, fontFamily: 'Inter')),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: categoryDropDownValue,
                  hint: const Text('Select Category'),
                  onChanged: (String? newValue) {
                    setState(() => categoryDropDownValue = newValue!);
                  },
                  items: const [
                    DropdownMenuItem(value: 'Cleaning', child: Text('Cleaning')),
                    DropdownMenuItem(value: 'Plumbing', child: Text('Plumbing')),
                    DropdownMenuItem(
                        value: 'Electrical', child: Text('Electrical')),
                    DropdownMenuItem(
                        value: 'Structural', child: Text('Structural')),
                    DropdownMenuItem(value: 'HVAC', child: Text('HVAC')),
                    DropdownMenuItem(
                        value: 'Technology', child: Text('Technology')),
                    DropdownMenuItem(
                        value: 'Equipment', child: Text('Equipment')),
                    DropdownMenuItem(
                        value: 'Disturbance', child: Text('Disturbance')),
                    DropdownMenuItem(value: 'Security', child: Text('Security')),
                    DropdownMenuItem(value: 'Parking', child: Text('Parking')),
                  ],
                  decoration: inputDecoration(""),
                  validator: (value) =>
                      value == null ? "Please select a category!" : null,
                ),
                const SizedBox(height: 20),

                // Urgency Dropdown
                const Text("Urgency",
                    style: TextStyle(fontSize: 16, fontFamily: 'Inter')),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: urgencyDropDownValue,
                  hint: const Text('Select Urgency'),
                  onChanged: (String? newValue) {
                    setState(() => urgencyDropDownValue = newValue!);
                  },
                  items: const [
                    DropdownMenuItem(value: 'Standard', child: Text('Standard')),
                    DropdownMenuItem(value: 'Urgent', child: Text('Urgent')),
                  ],
                  decoration: inputDecoration(""),
                  validator: (value) =>
                      value == null ? "Please select urgency!" : null,
                ),
                const SizedBox(height: 20),

                // Description
                const Text("Description",
                    style: TextStyle(fontSize: 16, fontFamily: 'Inter')),
                const SizedBox(height: 8),
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

                // 📸 Image Picker (Step 5)
                Container(
                  width: double.infinity,
                  height: 180,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Consumer<ReportViewModel>(
                      builder: (context, vm, child) {
                        // --- show image if selected ---
                        if ((kIsWeb && vm.selectedImageBytes != null) ||
                            (!kIsWeb && vm.selectedImage != null)) {
                          return Stack(
                            alignment: Alignment.topRight,
                            children: [
                              kIsWeb
                                  ? Image.memory(
                                      vm.selectedImageBytes!,
                                      height: 150,
                                      fit: BoxFit.cover,
                                    )
                                  : Image.file(
                                      vm.selectedImage!,
                                      height: 150,
                                      fit: BoxFit.cover,
                                    ),
                              Positioned(
                                right: 4,
                                top: 4,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.7),
                                    shape: BoxShape.circle,
                                  ),
                                  child: IconButton(
                                    icon: const Icon(Icons.clear,
                                        color: Colors.red, size: 18),
                                    onPressed: vm.removeImage,
                                  ),
                                ),
                              ),
                            ],
                          );
                        }

                        // --- show add button if no image ---
                        return MaterialButton(
                          onPressed: vm.pickFromGallery,
                          textColor: Colors.black,
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.add_a_photo),
                              SizedBox(width: 8),
                              Text(
                                "Add clear image of the issue",
                                style: TextStyle(
                                  fontSize: 16,
                                  fontFamily: 'Inter',
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ),

                // Submit Button
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
                            final vm = context.read<ReportViewModel>();
                            final reportData = {
                              'id':
                                  'RPT-${DateTime.now().millisecondsSinceEpoch}',
                              'title': incidentType.text,
                              'description': description.text,
                              'location': buildingDropDownValue ?? '',
                              'category': categoryDropDownValue ?? '',
                              'urgency': urgencyDropDownValue ?? '',
                              'date': DateTime.now().toString().split(' ')[0],
                              'time': TimeOfDay.now().format(context),
                              'visibility': _selectedOption ?? '',
                              'image': kIsWeb
                                  ? (vm.selectedImageBytes != null
                                      ? "web_image_bytes"
                                      : '')
                                  : (vm.selectedImage?.path ?? ''),
                              'status': '',
                              'statusColor': '',
                              'like': 0,
                            };
                            Navigator.pop(context, reportData);
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
