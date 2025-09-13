import 'package:fixit/core/services/image_picker_service.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';
import 'package:fixit/features/dashboard/presentation/pages/homepage.dart';
import 'package:fixit/features/reports/presentation/pages/scanner_screen.dart';
import '/features/settings/presentation/pages/settings.dart';
import '/features/reports/presentation/pages/create_report.dart';
import '/core/widgets/bottom_nav_bar.dart';
import '/core/widgets/floating_action_button.dart';
import '/core/widgets/ticket_card.dart';

class MyReportsPage extends StatefulWidget {
  final TextEditingController? firstNameController;
  final TextEditingController? lastNameController;
  final TextEditingController? emailController;

  const MyReportsPage({
    super.key,
    this.firstNameController,
    this.lastNameController,
    this.emailController,
  });

  @override
  State<MyReportsPage> createState() => _MyReportsPageState();
}

class _MyReportsPageState extends State<MyReportsPage> {
  List<Widget> ticketCards = [];
  int _selectedIndex = 1;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(100),
        child: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          automaticallyImplyLeading: false,
          toolbarHeight: 100,
          title: Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Row(
              children: const [
                Text(
                  "My ",
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w400,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "Reports",
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF386641),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search ticket',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: const Icon(Icons.filter_list),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(25),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),

            Expanded(
              child: ticketCards.isEmpty
                  ? Center(
                      child: Text(
                        "No Reports Found",
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.grey[600],
                        ),
                      ),
                    )
                  : ListView.builder(
                      itemCount: ticketCards.length,
                      itemBuilder: (context, index) {
                        return ticketCards[index];
                      },
                    ),
            ),
          ],
        ),
      ),

      floatingActionButton: CustomFAB(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => ScannerScreen()),
          );
        },
      ),

      bottomNavigationBar: BottomNavBar(
        currentIndex: _selectedIndex,
        onTap: (index) async {
          setState(() {
            _selectedIndex = index;
          });

          if (index == 0) {
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (context) => const HomePage()),
              (route) => false,
            );
          }

          if (index == 1) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const MyReportsPage()),
            );
          }

          // Navigate to CreateReport Page for temporary testing
          if (index == 2) {
            final newReport = await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ChangeNotifierProvider(
                  create: (_) => ReportViewModel(ImagePickerService()),
                  child: const CreateReport(),
                ),
              ),
            );

            if (newReport != null) {
              setState(() {
                ticketCards.add(TicketCard(report: newReport));
              });
            }
          }

          // Navigate to Settings Page
          if (index == 3) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => Settings(
                firstNameController: widget.firstNameController,
                lastNameController: widget.lastNameController,
                emailController: widget.emailController,
              )),
            );
          }
        },
      ),
    );
  }
}
