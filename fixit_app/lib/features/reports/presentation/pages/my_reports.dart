import 'package:flutter/material.dart';
import 'package:fixit/features/dashboard/presentation/pages/homepage.dart';
import 'package:fixit/features/reports/presentation/pages/scanner_screen.dart';
import '/core/widgets/bottom_nav_bar.dart';
import '/core/widgets/floating_action_button.dart';
import '/core/widgets/ticket_card.dart'; // ✅ New import

class MyReportsPage extends StatefulWidget {
  const MyReportsPage({Key? key}) : super(key: key);

  @override
  State<MyReportsPage> createState() => _MyReportsPageState();
}

class _MyReportsPageState extends State<MyReportsPage> {
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
            // ✅ ListView.builder can be modified or removed if data is fetched inside TicketCard
            const Expanded(
              child: TicketCard(
                report: {},
              ), // Assume TicketCard is a widget that builds a single ticket card
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
        onTap: (index) {
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
        },
      ),
    );
  }
}
