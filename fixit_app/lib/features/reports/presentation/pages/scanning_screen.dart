import 'package:flutter/material.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';
import 'package:provider/provider.dart';


class ScanningScreen extends StatelessWidget {
  const ScanningScreen({super.key});

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
        ]
      ),
      body: Column(
        children: [
          const SizedBox(height: 24),
          const Text(
            'Scanning...',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, color: Colors.grey),
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
                child: const Center(child: CircularProgressIndicator()),
              ),
            ),
          ),
          const SizedBox(height: 48),
        ],
      ),
    );
  }
}
