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
  final _createReportKey = GlobalKey<FormState>();

  // Controllers
  final incidentType = TextEditingController();
  final description = TextEditingController();

  // State variables
  int? selectedLocationId;
  String? categoryDropDownValue;
  String? urgencyDropDownValue;

  // Dynamic building list
  List<Map<String, dynamic>> buildingOptions = [];
  bool isLoadingBuildings = true;

  // Hardcoded options to match backend enums
  final List<String> categoryOptions = [
    "Cleaning",
    "Plumbing",
    "Electrical",
    "Structural",
    "HVAC",
    "Technology",
    "Equipment",
    "Disturbance",
    "Security",
    "Parking",
  ];

  final List<String> urgencyOptions = [
    "Standard",
    "Urgent",
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchBuildings();
    });
  }

  @override
  void dispose() {
    incidentType.dispose();
    description.dispose();
    super.dispose();
  }

  // -------------------------------
  // Fetch buildings from backend
  // -------------------------------
  Future<void> _fetchBuildings() async {
    final vm = context.read<ReportViewModel>();
    try {
      final buildings = await vm.fetchLocations();
      if (!mounted) return;
      setState(() {
        buildingOptions = buildings;
        isLoadingBuildings = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => isLoadingBuildings = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to load buildings: $e")),
      );
    }
  }

  // -------------------------------
  // Submit report to backend
  // -------------------------------
  Future<void> _submitReport(BuildContext context) async {
    if (!_createReportKey.currentState!.validate()) return;

    final vm = context.read<ReportViewModel>();
    final Map<String, dynamic> formData = {
      "title": incidentType.text.trim(),
      "description": description.text.trim(),
      "category": categoryDropDownValue,
      "urgency": urgencyDropDownValue,
      "location": selectedLocationId,
    };

    try {
      await vm.createTicket(formData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Ticket submitted successfully")),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error submitting ticket: $e")),
        );
      }
    }
  }

  // -------------------------------
  // UI
  // -------------------------------
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
                // Incident Type
                const Text("Incident Type",
                    style: TextStyle(fontSize: 16, fontFamily: 'Inter')),
                const SizedBox(height: 8),
                TextFormField(
                  controller: incidentType,
                  decoration: inputDecoration("Enter Incident Type"),
                  validator: (value) => value == null || value.isEmpty
                      ? "Please enter incident type!"
                      : null,
                ),
                const SizedBox(height: 20),

                // Building Dropdown
                const Text("Building",
                    style: TextStyle(fontSize: 16, fontFamily: 'Inter')),
                const SizedBox(height: 8),
                isLoadingBuildings
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.all(16.0),
                          child: CircularProgressIndicator(),
                        ),
                      )
                    : DropdownButtonFormField<int>(
                        value: selectedLocationId,
                        hint: const Text('Select Location'),
                        onChanged: (value) {
                          if (!mounted) return;
                          setState(() => selectedLocationId = value);
                        },
                        items: buildingOptions.map((loc) {
                          final displayName =
                              "${loc['building_name']} - Floor ${loc['floor_number']} - Room ${loc['room_identifier']}";
                          return DropdownMenuItem<int>(
                            value: loc['id'],
                            child: Text(displayName),
                          );
                        }).toList(),
                        decoration: inputDecoration(""),
                        validator: (value) =>
                            value == null ? "Please select a location!" : null,
                      ),
                const SizedBox(height: 20),

                // Category Dropdown
                const Text("Category",
                    style: TextStyle(fontSize: 16, fontFamily: 'Inter')),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: categoryDropDownValue,
                  hint: const Text('Select Category'),
                  onChanged: (value) {
                    if (!mounted) return;
                    setState(() => categoryDropDownValue = value);
                  },
                  items: categoryOptions
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
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
                  onChanged: (value) {
                    if (!mounted) return;
                    setState(() => urgencyDropDownValue = value);
                  },
                  items: urgencyOptions
                      .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                      .toList(),
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
                  decoration: inputDecoration("Enter Description"),
                  maxLines: 3,
                  validator: (value) => value == null || value.isEmpty
                      ? "Please enter description!"
                      : null,
                ),
                const SizedBox(height: 15),

                // Image Picker
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
                        final hasImage = (kIsWeb && vm.selectedImageBytes != null) ||
                            (!kIsWeb && vm.selectedImage != null);

                        if (hasImage) {
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

                        return MaterialButton(
                          onPressed: vm.pickFromGallery,
                          textColor: Colors.black,
                          padding: const EdgeInsets.all(16),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
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
                const SizedBox(height: 30),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: WelcomeButton(
                    text: "Submit Report",
                    isPrimary: true,
                    onPressed: () => _submitReport(context),
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
