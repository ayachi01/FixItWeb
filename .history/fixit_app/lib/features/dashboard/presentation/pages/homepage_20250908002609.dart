import 'package:fixit/core/services/image_picker_service.dart';
import 'package:fixit/features/reports/presentation/pages/scanner_screen.dart';
import 'package:flutter/material.dart';
import '/features/reports/presentation/pages/my_reports.dart';
import '/features/reports/presentation/pages/create_report.dart';
import '/core/widgets/profile_avatar.dart';
import '/core/widgets/search_bar.dart';
import '/core/widgets/bottom_nav_bar.dart';
import '/core/widgets/ticket_card.dart';
import '/core/widgets/floating_action_button.dart';
import 'package:provider/provider.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';

class HomePage extends StatefulWidget {
  final TextEditingController? firstNameController;
  final TextEditingController? lastNameController;
  final Map<String, dynamic>? report;

  const HomePage({
    super.key,
    this.firstNameController,
    this.lastNameController,
    this.report,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController _searchController = TextEditingController();
  List<Card> ticketCards = [];
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final firstName = widget.firstNameController?.text ?? "User";

    return Scaffold(
      resizeToAvoidBottomInset:
          false, // keep FAB in place when keyboard is shown
      backgroundColor: const Color(0XFFF8F8F8),

      // AppBar
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false, // No back button
        toolbarHeight: 120,
        // Title
        title: RichText(
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
                  color: Color(0XFF386641),
                ),
              ),
              const TextSpan(
                text: "!",
                style: const TextStyle(
                  color: Color(0XFF386641),
                )),
            ],
          ),
        ),

        // Avatar
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            child: ProfileAvatar(
              imageURL: "https://i.pravatar.cc/300", // Temporary URL
              radius: 27,
            ),
          ),
        ],
      ),

      // Body
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Search Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: SizedBox(
                  width: 335,
                  height: 50,
                  child: SearchBarWidget(
                    controller: _searchController,
                    hintText: "Search Ticket",
                    onChanged: (value) {
                      print("Searching: $value");
                    },
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Ticket List Title
              Padding(
                padding: const EdgeInsets.only(right: 215),
                child: const Text(
                  "Ticket List",
                  style: TextStyle(
                    fontSize: 27,
                    fontFamily: 'PlusJakartaSans-Regular',
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),

              const SizedBox(height: 50),

              // Empty State
              if (ticketCards.isEmpty)
                Center(
                  child: Column(
                    children: [
                      Image.asset("assets/images/no_list.png"),
                      const SizedBox(height: 20),
                      const Text(
                        "No reports yet.",
                        style: TextStyle(
                          fontSize: 23,
                          fontFamily: 'KantumruyPro-Regular',
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        "Scan an issue now to get it fixed.",
                        style: TextStyle(
                          fontSize: 23,
                          fontFamily: 'KantumruyPro-Regular',
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                )

              // Ticket Cards
              else
                Column(
                  children: [
                    TicketCard(
                      report: {
                        'id': '',
                        'visibility': '',
                        'title': '',
                        'description': '',
                        'status': '',
                        'statusColor': '',
                        'location': '',
                        'likes': '',
                        'time': '',
                        'image': 'assets/images/sample_brkn_chair.jpg',
                      },
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),

      // Floating Action Button
      floatingActionButton: CustomFAB(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ScannerScreen(),
            ),
          );
        },
      ),

      // Bottom Navigation Bar
      bottomNavigationBar: BottomNavBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });

          // Navigate to My Reports Page
          if (index == 1) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => MyReportsPage()),
            );
          }

          // Navigate to CreateReport Page for temporary testing
          if (index == 2) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ChangeNotifierProvider(
                  create: (_) => ReportViewModel(ImagePickerService()),
                  child: const CreateReport(),
                ),
              ),
            );
          }

          /* Tapusin ko kapag may page na, kaya naka-comment muna ^_^
          // Directs to Settings Page 
          if (index == 3) { 
          Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => SettingsPage()),
          );
          //} 
          // */
        },
      ),
    );
  }
}
