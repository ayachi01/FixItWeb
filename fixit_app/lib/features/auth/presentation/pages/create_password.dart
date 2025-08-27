import 'package:flutter/material.dart';
import '/core/widgets/welcome_button.dart';
import '/core/theme/input_decoration.dart';

class CreatePassword extends StatefulWidget {
  const CreatePassword({super.key});

  @override
  State<CreatePassword> createState() => _CreatePasswordState();
}

class _CreatePasswordState extends State<CreatePassword> {
  final _createPasswordKey = GlobalKey<FormState>();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();
  bool obscurePassword = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 55),
        child: Form(
          key: _createPasswordKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              // Lock Image
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 83),
                child: Image.asset(
                  'assets/images/lock.png',
                  fit: BoxFit.contain,
                  alignment: Alignment.topCenter,
                ),
              ),

              const SizedBox(height: 70),
              // Title
              const Center(
                child: Text(
                  "Create New Password",
                  style: TextStyle(
                    fontSize: 35,
                    fontFamily: 'KantumruyPro',
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 15),

              // Description
              const Text(
                "Your new password must be different from previously used password.",
                style: TextStyle(
                      fontSize: 16,
                      fontFamily: 'Poppins-SemiBold',
                      fontWeight: FontWeight.w600,
                      color: Color(0XFF4D4D4D),
                    ),
                    textAlign: TextAlign.center,
              ),

              const SizedBox(height: 40),

              // Password Title
              const Text(
                "Password",
                style: TextStyle(
                  fontSize: 16,
                  fontFamily: 'Inter',
                  color: Color(0XFF000000),
                ),
              ),
              const SizedBox(height: 8),

              // Password Field
              TextFormField(
                controller: passwordController,
                obscureText: obscurePassword,
                decoration: inputDecoration("Enter your password").copyWith(
                  suffixIcon: IconButton(
                    icon: Icon(
                      obscurePassword
                          ? Icons.visibility_off
                          : Icons.visibility,
                      color: Colors.grey,
                    ),
                    onPressed: () {
                      setState(() {
                        obscurePassword = !obscurePassword;
                      });
                    },
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return "Please enter your password!";
                  }
                  return null;
                },
              ),

              const SizedBox(height: 16),

              // Confirm Password Title
              const Text(
                "Confirm Password",
                style: TextStyle(
                  fontSize: 16,
                  fontFamily: 'Inter',
                  color: Color(0XFF000000),
                ),
              ),
              const SizedBox(height: 8),

              // Confirm Password Field
              TextFormField(
                controller: confirmPasswordController,
                obscureText: obscurePassword,
                decoration: inputDecoration("Confirm your password").copyWith(
                  suffixIcon: IconButton(
                    icon: Icon(
                      obscurePassword
                          ? Icons.visibility_off
                          : Icons.visibility,
                      color: Colors.grey,
                    ),
                    onPressed: () {
                      setState(() {
                        obscurePassword = !obscurePassword;
                      });
                    },
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return "Please confirm your password!";
                  }
                  if (value != passwordController.text) {
                    return "Passwords do not match!";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 110),

              // Change Password Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: WelcomeButton(
                  text: "Change Password",
                  isPrimary: true,
                  onPressed: () {
                    if (_createPasswordKey.currentState!.validate()) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const CreatePassword(),
                        ),
                      );
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
