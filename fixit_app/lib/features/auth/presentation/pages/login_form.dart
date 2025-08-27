import 'package:flutter/material.dart';
import '/features/auth/presentation/pages/forgot_password.dart';
import '/features/dashboard/presentation/pages/homepage.dart';
import '/features/auth/presentation/pages/signup_form.dart';
import '/core/widgets/welcome_button.dart';
import '/core/theme/input_decoration.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({super.key});

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  // Form Key
  final _loginFormKey = GlobalKey<FormState>();
  // Controllers
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  
  bool obscurePassword = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _loginFormKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Column(
                    children: [

                      // Logo
                      Image.asset(
                        'assets/images/logo.png',
                        height: 200,
                        fit: BoxFit.contain,
                      ),

                      const SizedBox(height: 12),

                      // Login Title
                      const Text(
                        "Login",
                        style: TextStyle(
                          fontFamily: 'KantumruyPro',
                          fontWeight: FontWeight.w600,
                          fontSize: 40,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 8),

                // Subtitle
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4.5),
                  child: const Text(
                    "Making campus maintenance simple and efficient.",
                    style: TextStyle(
                      fontFamily: 'Poppins-SemiBold',
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                      color: Color(0XFF4D4D4D),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),

                const SizedBox(height: 50),

                // Email Title
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Email",
                      style: TextStyle(
                        fontSize: 16,
                        fontFamily: 'Inter',
                        color: Color(0XFF000000),
                      ),
                      textAlign: TextAlign.start,
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Email Field
                TextFormField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: inputDecoration("name@example.com"),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return "Please enter your email!";
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 20),

                // Password Title
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Password",
                      style: TextStyle(
                        fontSize: 16,
                        fontFamily: 'Inter',
                        color: Color(0XFF000000),
                      ),
                      textAlign: TextAlign.start,
                    ),
                  ],
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

                  // Validator
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return "Please enter your password!";
                    }
                    return null;
                  },
                ),

                // Forgot Password
                Align(
                  alignment: Alignment.centerRight,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    child: GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ForgotPasswordScreen(),
                          ),
                        );
                      },
                      child: const Text(
                        "Forgot Password?",
                        style: TextStyle(
                          fontSize: 16,
                          fontFamily: 'Poppins',
                          fontWeight: FontWeight.w700,
                          color: Color(0XFF4F774A),
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 80),

                // Login Button
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: WelcomeButton(
                    text: "Login",
                    isPrimary: true,
                    onPressed: () {
                      if (_loginFormKey.currentState!.validate()) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => HomePage(
                            ),
                          ),
                        );
                      }
                    },
                  ),
                ),

                const SizedBox(height: 40),

                // Don't have an account row
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "Don't have an account?",
                      style: TextStyle(
                        fontSize: 18,
                        fontFamily: 'Inter',
                      ),
                    ),
                    const SizedBox(width: 6),

                    // Sign Up Text Button
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const SignupForm(),
                          ),
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}