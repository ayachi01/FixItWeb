import 'package:flutter/material.dart';
import '/core/widgets/search_bar.dart';
import 'package:fixit/features/reports/presentation/pages/my_reports.dart';

class ReportPage extends StatelessWidget {
  const ReportPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Report Page")),
      body: const Center(child: Text("This is the Report Page")),
    );
  }
}

class HomePage extends StatefulWidget {
  final TextEditingController? firstNameController;
  final TextEditingController? lastNameController;

  const HomePage({
    super.key,
    this.firstNameController,
    this.lastNameController,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController _searchController = TextEditingController();

  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final firstName = widget.firstNameController?.text ?? "User";

    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),

      // App Bar
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(120),
        child: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          automaticallyImplyLeading: false,
          toolbarHeight: 120,
          title: Padding(
            padding: const EdgeInsets.only(bottom: 30),
            child: RichText(
              text: TextSpan(
                text: "Welcome, \n",
                style: const TextStyle(
                  fontSize: 30,
                  fontFamily: 'PlusJakartaSans-Regular',
                  fontWeight: FontWeight.w500,
                  color: Colors.black,
                ),
                children: [
                  TextSpan(
                    text: firstName,
                    style: const TextStyle(
                      fontSize: 30,
                      fontFamily: 'PlusJakartaSans-Bold',
                      fontWeight: FontWeight.w700,
                      color: Colors.black,
                    ),
                  ),
                  const TextSpan(
                    text: "!",
                    style: TextStyle(color: Colors.black),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),

      // Body
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Search Bar
              SearchBarWidget(
                controller: _searchController,
                hintText: "Search Ticket",
                onChanged: (value) {
                  print("Searching: $value");
                },
                onClear: () {
                  print("Cleared Search");
                },
              ),
              const SizedBox(height: 20),

              const Text("Ticket List"),

              GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const ReportPage()),
                  );
                },
                child: const Text(
                  "Sign Up",
                  style: TextStyle(
                    fontSize: 18,
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w700,
                    color: Color(0XFF4F774A),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),

      // Bottom Navigation Bar
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });

          //Directs to My Reports Page
          if (index == 1) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => MyReportsPage()),
            );
          }
          // Add navigation for other tabs if needed
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long),
            label: 'Tickets',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.account_circle),
            label: 'Profile',
          ),
        ],
        selectedItemColor: Color(0XFF4F774A),
        unselectedItemColor: Colors.grey,
      ),
    );
  }
}
