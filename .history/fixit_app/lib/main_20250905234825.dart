import 'package:flutter/material.dart';
import 'package:provider/provider.dart'; // <-- must be here
import 'features/auth/presentation/pages/welcome_page.dart';
import 'features/reports/presentation/viewmodels/report_viewmodel.dart'; // <-- must be here

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ReportViewModel()),
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
      home: const WelcomePage(), // 👈 Start page
    );
  }
}
