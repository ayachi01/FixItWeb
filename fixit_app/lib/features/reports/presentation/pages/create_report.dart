import 'package:flutter/material.dart';
import 'dart:io';
import '/core/theme/input_decoration.dart';

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
  final visibility = TextEditingController();
  DateTime? selectedDate;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Add Details'),
        ),
      ),
    );
  }
}
