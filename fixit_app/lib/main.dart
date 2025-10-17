import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// 🧩 Import your app pages & viewmodels
import 'features/auth/presentation/pages/welcome_page.dart';
import 'features/reports/presentation/viewmodels/report_viewmodel.dart';
import 'core/services/image_picker_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(
    MultiProvider(
      providers: [
        // ✅ ReportViewModel registered globally (safe for all pages)
        ChangeNotifierProvider<ReportViewModel>(
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
      title: 'FixIt',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFF8F8F8),
        ),
        useMaterial3: true, // optional but modern
      ),
      home: const WelcomePage(),
    );
  }
}
