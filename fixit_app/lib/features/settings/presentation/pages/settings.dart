import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '/core/widgets/profile_avatar.dart';
import '/core/services/image_picker_service.dart';
import '/features/settings/presentation/pages/user_profile.dart';
import '/features/auth/presentation/pages/login_form.dart';
import '/features/auth/presentation/pages/create_password.dart';
import '/features/settings/presentation/pages/FAQs.dart';
import '/features/settings/presentation/pages/about_us.dart';
import '/features/settings/presentation/pages/privacy_policy.dart';
import '/features/dashboard/presentation/pages/homepage.dart';
import '/features/reports/presentation/pages/my_reports.dart';
import '/features/reports/presentation/pages/create_report.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';
import '/core/widgets/bottom_nav_bar.dart';
import '/core/widgets/ticket_card.dart';

class Settings extends StatefulWidget {
  final TextEditingController? firstNameController;
  final TextEditingController? lastNameController;
  final TextEditingController? emailController;

  const Settings({
    super.key,
    this.firstNameController,
    this.lastNameController,
    this.emailController,
  });

  @override
  State<Settings> createState() => _SettingsState();
}

class _SettingsState extends State<Settings> {
  List<Widget> ticketCards = [];
  int _selectedIndex = 3;

  @override
  Widget build(BuildContext context) {
    final firstName = widget.firstNameController?.text.isNotEmpty == true
        ? widget.firstNameController!.text
        : "User";
    final email = widget.emailController?.text ?? '';

    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),

      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        toolbarHeight: 70,
        title: const Text(
          'Settings',
          style: TextStyle(
            fontSize: 18,
            fontFamily: 'KantumruyPro-Regular',
            fontWeight: FontWeight.w500,
          ),
        ),
      ),

      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  const ProfileAvatar(
                    imageURL: "https://i.pravatar.cc/300",
                    radius: 30,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: RichText(
                      text: TextSpan(
                        text: "Welcome, \n",
                        style: const TextStyle(
                          fontSize: 16,
                          fontFamily: 'KantumruyPro-Regular',
                          color: Color(0XFFB0B0B0),
                        ),
                        children: [
                          TextSpan(
                            text: firstName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontFamily: 'KantumruyPro-Regular',
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
                  IconButton(
                    icon: const Icon(Icons.logout, color: Colors.black),
                    onPressed: () {
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginForm()),
                        (route) => false,
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 20),

              const Divider(color: Color(0XFFBEBEBE), thickness: 0.5),
              const SizedBox(height: 20),

              Padding(
                padding: const EdgeInsets.only(left: 6),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    // User Profile
                    _settingsItem(
                      icon: Icons.account_circle,
                      label: 'User Profile',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => UserProfile(
                              firstNameController: widget.firstNameController,
                              lastNameController: widget.lastNameController,
                              emailController: widget.emailController,
                            ),
                          ),
                        );
                      },
                    ),
                    _divider(),

                    // Change Password
                    _settingsItem(
                      icon: Icons.lock,
                      label: 'Change Password',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                CreatePassword(email: email, code: ''),
                          ),
                        );
                      },
                    ),
                    _divider(),

                    // FAQs
                    _settingsItem(
                      icon: Icons.help,
                      label: 'FAQs',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const FAQs()),
                        );
                      },
                    ),
                    _divider(),

                    // About Us
                    _settingsItem(
                      icon: Icons.info,
                      label: 'About Us',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const AboutUs()),
                        );
                      },
                    ),
                    _divider(),

                    // Privacy Policy
                    _settingsItem(
                      icon: Icons.privacy_tip,
                      label: 'Privacy Policy',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const PrivacyPolicy()),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),

      bottomNavigationBar: BottomNavBar(
        currentIndex: _selectedIndex,
        onTap: (index) async {
          if (index == _selectedIndex) return;
          setState(() => _selectedIndex = index);

          switch (index) {
            case 0:
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const HomePage()),
              );
              break;
            case 1:
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const MyReportsPage()),
              );
              break;
            case 2:
              final newReport = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ChangeNotifierProvider(
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
              break;
            case 3:
              // Already on settings, do nothing
              break;
          }
        },
      ),
    );
  }

  Widget _settingsItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Row(
      children: [
        Icon(icon, color: Colors.black, size: 24),
        const SizedBox(width: 15),
        GestureDetector(
          onTap: onTap,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 18,
              fontFamily: 'KantumruyPro-Regular',
            ),
          ),
        ),
      ],
    );
  }

  Widget _divider() => const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Divider(
          color: Color(0XFFBEBEBE),
          thickness: 0.5,
          indent: 10,
          endIndent: 10,
        ),
      );
}
