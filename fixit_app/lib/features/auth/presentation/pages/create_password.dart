import 'package:flutter/material.dart';
import '/core/widgets/welcome_button.dart';
import '/core/theme/input_decoration.dart';
import '/core/api_service.dart';
import '/features/auth/presentation/pages/login_form.dart';

class CreatePassword extends StatefulWidget {
  final String email; // ✅ Required email from previous step
  final String code; // ✅ Required reset code or OTP

  const CreatePassword({
    super.key,
    required this.email,
    required this.code,
  });

  @override
  State<CreatePassword> createState() => _CreatePasswordState();
}

class _CreatePasswordState extends State<CreatePassword> {
  final _createPasswordKey = GlobalKey<FormState>();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();
  bool obscurePassword = true;
  bool _isLoading = false;

  final ApiService _apiService = ApiService();

  Future<void> _handleChangePassword() async {
    if (!_createPasswordKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final response = await _apiService.confirmPasswordReset(
        widget.email,
        widget.code,
        passwordController.text.trim(),
      );

      if (response.containsKey('message')) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response['message']),
            backgroundColor: Colors.green,
          ),
        );

        // ✅ Redirect to login after success
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => LoginForm()),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Unexpected response from server."),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll("Exception: ", "")),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

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
              // 🔒 Lock Image
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 83),
                child: Image.asset(
                  'assets/images/lock.png',
                  fit: BoxFit.contain,
                  alignment: Alignment.topCenter,
                ),
              ),

              const SizedBox(height: 70),

              // 🧭 Title
              const Center(
                child: Text(
                  "Create New Password",
                  style: TextStyle(
                    fontSize: 30,
                    fontFamily: 'KantumruyPro',
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),

              const SizedBox(height: 10),

              // 📝 Description
              const Text(
                "Your new password must be different from previously used passwords.",
                style: TextStyle(
                  fontSize: 14,
                  fontFamily: 'Poppins-SemiBold',
                  fontWeight: FontWeight.w600,
                  color: Color(0XFF4D4D4D),
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 40),

              // 🔑 Password Title
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
                    onPressed: () =>
                        setState(() => obscurePassword = !obscurePassword),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return "Please enter your password!";
                  }
                  if (value.length < 8) {
                    return "Password must be at least 8 characters.";
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
                    onPressed: () =>
                        setState(() => obscurePassword = !obscurePassword),
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

              const SizedBox(height: 100),

              // ✅ Change Password Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: WelcomeButton(
                  text: _isLoading ? "Saving..." : "Change Password",
                  isPrimary: true,
                  onPressed: () {
                    if (!_isLoading) _handleChangePassword();
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
