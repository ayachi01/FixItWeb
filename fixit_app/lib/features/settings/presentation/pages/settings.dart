import 'package:flutter/material.dart';
import '/core/widgets/profile_avatar.dart';
import '/features/settings/presentation/pages/about_us.dart';
import '/features/settings/presentation/pages/privacy_policy.dart';
import '/features/settings/presentation/pages/FAQs.dart';

class Settings extends StatefulWidget {
  final TextEditingController? firstNameController;
  final TextEditingController? lastNameController;

  const Settings({
    super.key,
    this.firstNameController,
    this.lastNameController,
  });

  @override
  State<Settings> createState() => _SettingsState();
}

class _SettingsState extends State<Settings> {
  int _selectedIndex = 3;

  @override
  Widget build(BuildContext context) {
    final firstName = widget.firstNameController?.text ?? "User";

    return Scaffold(
      resizeToAvoidBottomInset:
          false, // keep FAB in place when keyboard is shown
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
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 150),
                    child: Icon(Icons.logout, color: Colors.black),
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

              Column(
                // User Profile
                // Change Password
                // FAQs
                // About Us
                // Privacy Policy
              ),
            ],
          ),
        ),
      ),
    );
  }
}
