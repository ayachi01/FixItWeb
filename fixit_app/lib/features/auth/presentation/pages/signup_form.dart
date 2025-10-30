import 'package:flutter/material.dart';
import '/features/dashboard/presentation/pages/homepage.dart';
import '/features/auth/presentation/pages/login_form.dart';
import '/core/widgets/welcome_button.dart';
import '/core/theme/input_decoration.dart';
import '/core/api_service.dart';

class SignupForm extends StatefulWidget {
  const SignupForm({super.key});

  @override
  State<SignupForm> createState() => SignupFormState();
}

class SignupFormState extends State<SignupForm> {
  // Form Key
  final _signUpFormKey = GlobalKey<FormState>();

  // Controllers
  final firstNameController = TextEditingController();
  final lastNameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();

  bool obscurePassword = true;
  bool isLoading = false;

  final ApiService apiService = ApiService();

  // ------------------- PASSWORD VALIDATOR -------------------
  String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter your password!';
    }

    // At least 8 characters, 1 lowercase, 1 uppercase
    final regex = RegExp(r'^(?=.*[a-z])(?=.*[A-Z]).{8,}$');
    if (!regex.hasMatch(value)) {
      return 'Password must be at least 8 characters and include both uppercase and lowercase letters.';
    }

    return null;
  }

  // ------------------- SIGN UP HANDLER -------------------
  void handleSignUp() async {
    if (isLoading) return;
    if (!_signUpFormKey.currentState!.validate()) return;

    setState(() => isLoading = true);

    try {
      // Register without verification requirement
      final response = await apiService.registerSelfService(
        firstName: firstNameController.text.trim(),
        lastName: lastNameController.text.trim(),
        email: emailController.text.trim(),
        password: passwordController.text.trim(),
        confirmPassword: confirmPasswordController.text.trim(),
      );

      // Success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Registration successful! Welcome to FixIt.')),
      );

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => HomePage(
            firstNameController: firstNameController,
            lastNameController: lastNameController,
            emailController: emailController,
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: const Color(0XFFF8F8F8),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 55),
        child: Form(
          key: _signUpFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Center(
                child: Text(
                  "Create your account",
                  style: TextStyle(
                    fontFamily: 'KantumruyPro',
                    fontWeight: FontWeight.w600,
                    fontSize: 35,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 12),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 7, horizontal: 8),
                child: Text(
                  "Join FixIt and start reporting maintenance issues",
                  style: TextStyle(
                    fontFamily: 'Poppins-SemiBold',
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                    color: Color(0XFF4D4D4D),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 15),

              const Text("First Name", style: TextStyle(fontSize: 16, fontFamily: 'Inter', color: Color(0XFF000000))),
              const SizedBox(height: 8),
              TextFormField(
                controller: firstNameController,
                keyboardType: TextInputType.name,
                decoration: inputDecoration("Enter your first name"),
                validator: (value) => value == null || value.isEmpty ? "Please enter your first name!" : null,
              ),
              const SizedBox(height: 16),

              const Text("Last Name", style: TextStyle(fontSize: 16, fontFamily: 'Inter', color: Color(0XFF000000))),
              const SizedBox(height: 8),
              TextFormField(
                controller: lastNameController,
                keyboardType: TextInputType.name,
                decoration: inputDecoration("Enter your last name"),
                validator: (value) => value == null || value.isEmpty ? "Please enter your last name!" : null,
              ),
              const SizedBox(height: 16),

              const Text("Email", style: TextStyle(fontSize: 16, fontFamily: 'Inter', color: Color(0XFF000000))),
              const SizedBox(height: 8),
              TextFormField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: inputDecoration("name@phinmaed.com"),
                validator: (value) {
                  if (value == null || value.isEmpty) return "Please enter your email!";
                  if (!value.endsWith("@phinmaed.com")) return "Only phinmaed.com emails allowed!";
                  return null;
                },
              ),
              const SizedBox(height: 16),

              const Text("Password", style: TextStyle(fontSize: 16, fontFamily: 'Inter', color: Color(0XFF000000))),
              const SizedBox(height: 8),
              TextFormField(
                controller: passwordController,
                obscureText: obscurePassword,
                decoration: inputDecoration("Enter your password").copyWith(
                  errorMaxLines: 3,
                  suffixIcon: IconButton(
                    icon: Icon(
                      obscurePassword ? Icons.visibility_off : Icons.visibility,
                      color: Colors.grey,
                    ),
                    onPressed: () => setState(() => obscurePassword = !obscurePassword),
                  ),
                ),
                validator: validatePassword,
              ),
              const SizedBox(height: 16),

              const Text("Confirm Password", style: TextStyle(fontSize: 16, fontFamily: 'Inter', color: Color(0XFF000000))),
              const SizedBox(height: 8),
              TextFormField(
                controller: confirmPasswordController,
                obscureText: obscurePassword,
                decoration: inputDecoration("Confirm your password").copyWith(
                  suffixIcon: IconButton(
                    icon: Icon(
                      obscurePassword ? Icons.visibility_off : Icons.visibility,
                      color: Colors.grey,
                    ),
                    onPressed: () => setState(() => obscurePassword = !obscurePassword),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) return "Please confirm your password!";
                  if (value != passwordController.text) return "Passwords do not match!";
                  return null;
                },
              ),
              const SizedBox(height: 40),

              SizedBox(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    WelcomeButton(
                      text: "Sign Up",
                      isPrimary: true,
                      onPressed: handleSignUp,
                    ),
                    if (isLoading)
                      const CircularProgressIndicator(color: Colors.white),
                  ],
                ),
              ),
              const SizedBox(height: 40),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Already have an account?", style: TextStyle(fontSize: 18, fontFamily: 'Inter')),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const LoginForm()),
                    ),
                    child: const Text(
                      "Login",
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
            ],
          ),
        ),
      ),
    );
  }
}
