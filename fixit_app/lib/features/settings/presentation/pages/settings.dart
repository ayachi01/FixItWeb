import 'package:flutter/material.dart';
import '/core/widgets/profile_avatar.dart';
import 'package:provider/provider.dart';
import 'package:fixit/core/services/image_picker_service.dart';
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

  Settings({
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
    final firstName = widget.firstNameController?.text ?? "User";

    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),

      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false, // No back button
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
              Row(
                children: [
                  ProfileAvatar(
                    imageURL: "https://i.pravatar.cc/300", // Temporary
                    radius: 30,
                  ),
                  const SizedBox(width: 10),

                  RichText(
                    text: TextSpan(
                      text: "Welcome, \n",
                      style: TextStyle(
                        fontSize: 16,
                        fontFamily: 'KantumruyPro-Regular',
                        color: Color(0XFFB0B0B0),
                      ),
                      children: [
                        TextSpan(
                          text: firstName,
                          style: TextStyle(
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
                    // Logout
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 150),
                    child: GestureDetector(
                      onTap: () {
                        Navigator.canPop(context)
                            ? Navigator.pop(context)
                            : null;
                        // ? Error pa: Navigator.pushReplacementNamed(context, MaterialPageRoute(builder: (_) => LoginForm()));
                      },
                      child: Icon(Icons.logout, color: Colors.black),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Divider
              const Divider(
                color: Color(0XFFBEBEBE),
                thickness: 0.5,
                indent: 10,
                endIndent: 10,
              ),
              const SizedBox(height: 20),

              Padding(
                padding: const EdgeInsets.only(left: 6),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    // User Profile
                    Row(
                      children: [
                        Icon(
                          Icons.account_circle,
                          color: Colors.black,
                          size: 24,
                        ),
                        const SizedBox(width: 15),
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => UserProfile(
                                  firstNameController:
                                      widget.firstNameController,
                                  lastNameController: widget.lastNameController,
                                  emailController: widget.emailController,
                                ),
                              ),
                            );
                          },
                          child: Text(
                            'User Profile',
                            style: TextStyle(
                              fontSize: 18,
                              fontFamily: 'KantumruyPro-Regular',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    // Divider
                    const Divider(
                      color: Color(0XFFBEBEBE),
                      thickness: 0.5,
                      indent: 10,
                      endIndent: 10,
                    ),
                    const SizedBox(height: 20),

                    // Change Password
                    Row(
                      children: [
                        Icon(Icons.lock, color: Colors.black, size: 24),
                        const SizedBox(width: 15),
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => CreatePassword(),
                              ),
                            );
                          },
                          child: Text(
                            'Change Password',
                            style: TextStyle(
                              fontSize: 18,
                              fontFamily: 'KantumruyPro-Regular',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    // Divider
                    const Divider(
                      color: Color(0XFFBEBEBE),
                      thickness: 0.5,
                      indent: 10,
                      endIndent: 10,
                    ),
                    const SizedBox(height: 20),

                    // FAQs
                    Row(
                      children: [
                        Icon(Icons.help, color: Colors.black, size: 24),
                        const SizedBox(width: 15),
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => FAQs()),
                            );
                          },
                          child: Text(
                            'FAQs',
                            style: TextStyle(
                              fontSize: 18,
                              fontFamily: 'KantumruyPro-Regular',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    // Divider
                    const Divider(
                      color: Color(0XFFBEBEBE),
                      thickness: 0.5,
                      indent: 10,
                      endIndent: 10,
                    ),
                    const SizedBox(height: 20),

                    // About Us
                    Row(
                      children: [
                        Icon(Icons.info, color: Colors.black, size: 24),
                        const SizedBox(width: 15),
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => AboutUs(),
                              ),
                            );
                          },
                          child: Text(
                            'About Us',
                            style: TextStyle(
                              fontSize: 18,
                              fontFamily: 'KantumruyPro-Regular',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    // Divider
                    const Divider(
                      color: Color(0XFFBEBEBE),
                      thickness: 0.5,
                      indent: 10,
                      endIndent: 10,
                    ),
                    const SizedBox(height: 20),

                    // Privacy Policy
                    Row(
                      children: [
                        Icon(Icons.privacy_tip, color: Colors.black, size: 24),
                        const SizedBox(width: 15),
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => PrivacyPolicy(),
                              ),
                            );
                          },
                          child: Text(
                            'Privacy Policy',
                            style: TextStyle(
                              fontSize: 18,
                              fontFamily: 'KantumruyPro-Regular',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    // Divider
                    const Divider(
                      color: Color(0XFFBEBEBE),
                      thickness: 0.5,
                      indent: 10,
                      endIndent: 10,
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),

      // Bottom Navigation Bar
      bottomNavigationBar: BottomNavBar(
        currentIndex: _selectedIndex,
        onTap: (index) async {
          setState(() {
            _selectedIndex = index;
          });

          // Navigate to My Reports Page
          if (index == 0) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => HomePage()),
            );
          }

          // Navigate to My Reports Page
          if (index == 1) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => MyReportsPage()),
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
              MaterialPageRoute(
                builder: (context) =>
                    Settings(firstNameController: widget.firstNameController),
              ),
            );
          }
        },
      ),
    );
  }
}
