import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// Feature imports
import 'package:fixit/core/services/image_picker_service.dart';
import 'package:fixit/features/reports/presentation/pages/scanner_screen.dart';
import '/features/reports/presentation/pages/my_reports.dart';
import '/features/reports/presentation/pages/create_report.dart';
import '/features/settings/presentation/pages/settings.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';
import '/core/api_service.dart';
import '/features/auth/presentation/pages/login_form.dart';

// Core widgets
import '/core/widgets/profile_avatar.dart';
import '/core/widgets/search_bar.dart';
import '/core/widgets/bottom_nav_bar.dart';
import '/core/widgets/ticket_card.dart';
import '/core/widgets/floating_action_button.dart';

class HomePage extends StatefulWidget {
  final TextEditingController? firstNameController;
  final TextEditingController? lastNameController;
  final TextEditingController? emailController;

  const HomePage({
    super.key,
    this.firstNameController,
    this.lastNameController,
    this.emailController,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  List<Widget> ticketCards = [];
  final TextEditingController _searchController = TextEditingController();
  int _selectedIndex = 0;
  final ApiService _apiService = ApiService();

  // ====================================================
  // LOGOUT HANDLER (COMPLETE RESET)
  // ====================================================
  Future<void> _handleLogout(BuildContext context) async {
    final reportVM = Provider.of<ReportViewModel>(context, listen: false);

    try {
      // Fully reset everything inside ReportViewModel (token + data + camera)
      await reportVM.logoutAndReset();

      // Also clear token from ApiService (double safety)
      await _apiService.logout();

      //Clear any controllers in HomePage
      _searchController.clear();
      ticketCards.clear();
      _selectedIndex = 0;

      // Navigate back to LoginForm (remove all previous routes)
      if (context.mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const LoginForm()),
          (route) => false,
        );
      }

      // Show confirmation
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("✅ Logged out successfully.")),
      );

      print("🚪 Logout completed. All data cleared successfully.");
    } catch (e) {
      print("❌ Logout error: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Logout failed: $e")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final firstName = widget.firstNameController?.text ?? "User";
    final reportVM = Provider.of<ReportViewModel>(context, listen: false);

    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: const Color(0XFFF8F8F8),

      // ===================== APP BAR =====================
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        toolbarHeight: 120,
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
                style: TextStyle(color: Color(0XFF386641)),
              ),
            ],
          ),
        ),
        actions: [
          // 👤 Profile avatar
          Container(
            margin: const EdgeInsets.only(right: 8),
            child: ProfileAvatar(
              imageURL:
                  "http://192.168.5.137:8000/api/proxy-avatar/?url=https://i.pravatar.cc/300",
              radius: 27,
            ),
          ),
          // Logout button
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            onPressed: () => _handleLogout(context),
            tooltip: "Logout",
          ),
        ],
      ),

      // ===================== BODY =====================
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
              const Padding(
                padding: EdgeInsets.only(right: 215),
                child: Text(
                  "Ticket List",
                  style: TextStyle(
                    fontSize: 27,
                    fontFamily: 'PlusJakartaSans-Regular',
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 30),

              // Empty State or Ticket List
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
              else
                Column(children: ticketCards),
            ],
          ),
        ),
      ),

      // ===================== FLOATING ACTION BUTTON =====================
      floatingActionButton: CustomFAB(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const ScannerScreen()),
          );
        },
      ),

      // ===================== BOTTOM NAV BAR =====================
      bottomNavigationBar: BottomNavBar(
        currentIndex: _selectedIndex,
        onTap: (index) async {
          setState(() {
            _selectedIndex = index;
          });

          if (index == 1) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const MyReportsPage()),
            );
          }

          if (index == 2) {
            // Use existing provider (no reset)
            final newReport = await Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const CreateReport()),
            );

            if (newReport != null) {
              setState(() {
                ticketCards.add(TicketCard(report: newReport));
              });
            }
          }

          if (index == 3) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => Settings(
                  firstNameController: widget.firstNameController,
                  lastNameController: widget.lastNameController,
                  emailController: widget.emailController,
                ),
              ),
            );
          }
        },
      ),
    );
  }
}
