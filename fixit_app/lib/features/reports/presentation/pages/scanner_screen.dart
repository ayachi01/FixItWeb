import 'package:flutter/material.dart';
import 'scanning_screen.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';
import 'package:provider/provider.dart';

class ScannerScreen extends StatelessWidget {
  const ScannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final viewModel = context.watch<ReportViewModel>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Issue'),
        leading: const BackButton(),
        actions: [
          IconButton(
            icon: Icon(viewModel.isTorchOn ? Icons.flash_on : Icons.flash_off),
            onPressed: () => viewModel.toggleTorch(),
          ),
        ],
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
                child: const Center(
                  child: Icon(Icons.camera_alt, size: 60, color: Colors.grey),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, size: 48),
            iconSize: 48,
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ChangeNotifierProvider.value(
                    value: context.read<ReportViewModel>(),
                    child: const ScanningScreen(),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
