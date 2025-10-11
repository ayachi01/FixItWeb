import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';
import 'package:provider/provider.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  @override
  void initState() {
    super.initState();
    // initialize camera
    Future.microtask(() => context.read<ReportViewModel>().setupCamera());
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    // release camera
    context.read<ReportViewModel>().disposeCamera();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reportVM = context.watch<ReportViewModel>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Issue'),
        leading: const BackButton(),
      ),
      body: Column(
        children: [
          const SizedBox(height: 24),
          const Text(
            'Point your camera at the problem. We\'ll try to detect it for you!',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: Center(
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400, width: 2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: FutureBuilder<void>(
                  future: reportVM.initializeControllerFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.done &&
                        reportVM.controller != null) {
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: CameraPreview(reportVM.controller!),
                      );
                    } else if (snapshot.hasError) {
                      return Center(child: Text("Camera Error: ${snapshot.error}"));
                    } else {
                      return const Center(child: CircularProgressIndicator());
                    }
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
