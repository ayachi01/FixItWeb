import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'features/auth/presentation/pages/welcome_page.dart';
import 'features/reports/presentation/viewmodels/report_viewmodel.dart';
import 'core/services/image_picker_service.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => ReportViewModel(ImagePickerService()),
        ),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'FixIt',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0XFFF8F8F8)),
      ),
      home: const WelcomePage(),
    );
  }
}
