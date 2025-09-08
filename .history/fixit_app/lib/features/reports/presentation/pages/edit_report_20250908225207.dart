import 'package:flutter/material.dart';

class EditReport extends StatefulWidget {
  const EditReport({super.key}); // Added const here

  @override
  EditReportState createState() => _EditReportState();
}

class _EditReportState extends State<EditReport> {
  final _formKey = GlobalKey<FormState>();

  // Controllers for the form fields
  final TextEditingController incidentTypeController = TextEditingController();
  final TextEditingController descriptionController = TextEditingController();
  final TextEditingController locationController = TextEditingController();
  final TextEditingController dateController = TextEditingController();
  final TextEditingController timeController = TextEditingController();

  String visibility = 'Private';

  final List<String> imagePaths = const [
    // Added const
    'assets/images/sample_brkn_chair.png',
  ];

  @override
  void initState() {
    super.initState();
    // Default values
    incidentTypeController.text = 'Broken Chairs';
    descriptionController.text =
        'One of the chairs is missing a leg in PTC 305';
    locationController.text = 'PTC';
    dateController.text = '07/06/25';
    timeController.text = '10:26 AM';
  }

  @override
  void dispose() {
    incidentTypeController.dispose();
    descriptionController.dispose();
    locationController.dispose();
    dateController.dispose();
    timeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Edit Report"), // const added
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16), // const added
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              sectionTitle("Incident Type"),
              inputField(controller: incidentTypeController),
              sectionTitle("Description"),
              inputField(controller: descriptionController, maxLines: 3),
              sectionTitle("Location"),
              inputField(controller: locationController),
              sectionTitle("Date"),
              inputField(controller: dateController),
              sectionTitle("Time"),
              inputField(controller: timeController),
              sectionTitle("Visibility"),
              Row(
                children: [
                  Radio<String>(
                    value: 'Public',
                    groupValue: visibility,
                    onChanged: (value) {
                      setState(() {
                        visibility = value!;
                      });
                    },
                  ),
                  const Text("Public"),
                  const SizedBox(width: 20),
                  Radio<String>(
                    value: 'Private',
                    groupValue: visibility,
                    onChanged: (value) {
                      setState(() {
                        visibility = value!;
                      });
                    },
                  ),
                  const Text("Private"),
                ],
              ),
              sectionTitle("Images"),
              SizedBox(
                height: 100,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: imagePaths
                      .map(
                        (path) => Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: Image.asset(path, width: 80),
                        ),
                      )
                      .toList(),
                ),
              ),
              const SizedBox(height: 30),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green[700],
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      // Submit logic here
                      print("Incident Type: ${incidentTypeController.text}");
                      print("Description: ${descriptionController.text}");
                      print("Location: ${locationController.text}");
                      print("Date: ${dateController.text}");
                      print("Time: ${timeController.text}");
                      print("Visibility: $visibility");
                    }
                  },
                  child: const Text("Submit Report"), // const added
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 4),
      child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
    );
  }

  Widget inputField({
    required TextEditingController controller,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      decoration: const InputDecoration(
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'This field cannot be empty';
        }
        return null;
      },
    );
  }
}
