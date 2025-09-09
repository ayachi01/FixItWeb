import 'package:flutter/material.dart';
import '/core/widgets/profile_avatar.dart';
import '/core/theme/input_decoration.dart';
import '/core/widgets/welcome_button.dart';
import '/features/settings/presentation/pages/settings.dart';

class UserProfile extends StatefulWidget {
  final TextEditingController? firstNameController;
  final TextEditingController? lastNameController;
  final TextEditingController? emailController;

  const UserProfile({
    super.key, 
    this.firstNameController, 
    this.lastNameController, 
    this.emailController
  });

  @override
  State<UserProfile> createState() => _UserProfileState();
}

class _UserProfileState extends State<UserProfile> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),
      appBar: AppBar(
        title: const Text(
          'User Profile',
          style: TextStyle(
            fontSize: 18,
            fontFamily: 'KantumruyPro-Regular',
            fontWeight: FontWeight.w500,
          ),
        ),
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back),
        ),
        toolbarHeight: 60,
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: ProfileAvatar(
                  imageURL: "https://i.pravatar.cc/300", // Temporary
                  radius: 55,
                ),
              ),
              const SizedBox(height: 40),

              // First Name Title
              const Text(
                "First Name",
                style: TextStyle(
                  fontSize: 16,
                  fontFamily: 'Inter',
                  color: Color(0XFF000000),
                ),
              ),
              const SizedBox(height: 8),

              // First Name Field
              TextFormField(
                controller: widget.firstNameController,
                keyboardType: TextInputType.name,
                decoration: inputDecoration("Enter your first name"),
              ),

              const SizedBox(height: 16),

              // Last Name Title
              const Text(
                "Last Name",
                style: TextStyle(
                  fontSize: 16,
                  fontFamily: 'Inter',
                  color: Color(0XFF000000),
                ),
              ),
              const SizedBox(height: 8),

              // Last Name Field
              TextFormField(
                controller: widget.lastNameController,
                keyboardType: TextInputType.name,
                decoration: inputDecoration("Enter your last name"),
              ),

              const SizedBox(height: 16),

              // Email Title
              const Text(
                "Email",
                style: TextStyle(
                  fontSize: 16,
                  fontFamily: 'Inter',
                  color: Color(0XFF000000),
                ),
              ),
              const SizedBox(height: 8),

              // Email Field
              TextFormField(
                controller: widget.emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: inputDecoration("name@example.com"),
              ),
              const SizedBox(height: 150),

              // Save Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: WelcomeButton(
                  text: "Save",
                  isPrimary: true,
                  onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => Settings(),
                        ),
                      );
                    }
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
