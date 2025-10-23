import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';
import '/features/reports/presentation/pages/create_report.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  File? _imageFile;
  bool _isLoading = false;
  String? _resultMessage;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<ReportViewModel>().setupCamera());
  }

  @override
  void dispose() {
    context.read<ReportViewModel>().disposeCamera();
    super.dispose();
  }

  /// 📸 Take picture
  Future<void> _takePicture() async {
    final reportVM = context.read<ReportViewModel>();
    try {
      await reportVM.initializeControllerFuture;
      final XFile image = await reportVM.controller!.takePicture();
      final file = File(image.path);

      setState(() => _imageFile = file);
      await _sendToLLM(file);
    } catch (e) {
      debugPrint('Error taking picture: $e');
      setState(() => _resultMessage = 'Camera Error: $e');
    }
  }

  /// 🖼️ Pick from gallery
  Future<void> _pickFromGallery() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      final file = File(picked.path);
      setState(() => _imageFile = file);
      await _sendToLLM(file);
    }
  }

  /// 🧠 Send image to backend + navigate to CreateReport
  Future<void> _sendToLLM(File imageFile) async {
    final reportVM = context.read<ReportViewModel>();

    setState(() {
      _isLoading = true;
      _resultMessage = null;
    });

    try {
      final response = await reportVM.sendToLLM(imageFile);

      if (response != null && mounted) {
        debugPrint('✅ LLM Response received: $response');

        // 🔍 Handle nested JSON structure like:
        // { ai_reply: "...", ticket: { building: ..., room: ..., item: ..., intent: ..., notes: ... } }
        final ticket = response['ticket'] ?? {};
        debugPrint('🎟️ Extracted ticket data: $ticket');

        final llmData = {
          'building': ticket['building'] ?? '',
          'room': ticket['room'] ?? '',
          'item': ticket['item'] ?? '',
          'intent': ticket['intent'] ?? '',
          'notes': ticket['notes'] ?? '',
        };

        debugPrint('🧠 Prefilling fields with LLM data: $llmData');

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => CreateReport(llmData: llmData),
          ),
        );
      } else {
        setState(() => _resultMessage = "No response from LLM");
      }
    } catch (e) {
      debugPrint('❌ Error sending to LLM: $e');
      setState(() => _resultMessage = "Error: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// 🧹 Reset state
  void _reset() {
    setState(() {
      _imageFile = null;
      _resultMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final reportVM = context.read<ReportViewModel>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Issue'),
        leading: const BackButton(),
        actions: [
          if (_imageFile != null)
            IconButton(
              onPressed: _reset,
              icon: const Icon(Icons.refresh),
              tooltip: 'Reset',
            ),
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 24),
          const Text(
            'Point your camera at the problem.\nWe\'ll try to detect it for you!',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 24),

          /// 📷 Camera or Image Preview
          Expanded(
            child: Center(
              child: Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400, width: 2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: _imageFile != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.file(_imageFile!, fit: BoxFit.cover),
                      )
                    : FutureBuilder<void>(
                        future: reportVM.initializeControllerFuture,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.done &&
                              reportVM.controller != null) {
                            return ClipRRect(
                              borderRadius: BorderRadius.circular(14),
                              child: CameraPreview(reportVM.controller!),
                            );
                          } else if (snapshot.hasError) {
                            return Center(
                              child: Text("Camera Error: ${snapshot.error}"),
                            );
                          } else {
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          }
                        },
                      ),
              ),
            ),
          ),

          const SizedBox(height: 20),

          /// 🧩 Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton.icon(
                onPressed: _isLoading ? null : _takePicture,
                icon: const Icon(Icons.camera_alt),
                label: const Text('Take Picture'),
              ),
              ElevatedButton.icon(
                onPressed: _isLoading ? null : _pickFromGallery,
                icon: const Icon(Icons.photo_library),
                label: const Text('Gallery'),
              ),
            ],
          ),

          const SizedBox(height: 16),

          /// 🧠 Status Message
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(12),
              child: CircularProgressIndicator(),
            )
          else if (_resultMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Text(
                _resultMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: Colors.black87),
              ),
            ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
