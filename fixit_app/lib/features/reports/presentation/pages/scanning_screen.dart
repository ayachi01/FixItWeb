import 'package:flutter/material.dart';

class ScanningScreen extends StatelessWidget {
  const ScanningScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Issue'),
        leading: const BackButton(),
        actions: const [Icon(Icons.volume_off), SizedBox(width: 16)],
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
