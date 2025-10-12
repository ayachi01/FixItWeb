import 'package:flutter/material.dart';
import '/core/api_service.dart';
import '/core/theme/input_decoration.dart';
import '/core/widgets/welcome_button.dart';
import '/features/auth/presentation/pages/create_password.dart';

class VerifyEmail extends StatefulWidget {
  final String email;

  const VerifyEmail({super.key, required this.email});

  @override
  State<VerifyEmail> createState() => _VerifyEmailState();
}

class _VerifyEmailState extends State<VerifyEmail> {
  final _verifyEmailKey = GlobalKey<FormState>();
  final _otpControllers = List.generate(6, (_) => TextEditingController());
  final _focusNodes = List.generate(6, (_) => FocusNode());
  final ApiService _apiService = ApiService();

  bool _isVerifying = false;
  bool _isResending = false;

  @override
  void dispose() {
    for (var c in _otpControllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _onOtpChanged(String value, int index) {
    if (value.length == 1 && index < 5) {
      FocusScope.of(context).requestFocus(_focusNodes[index + 1]);
    } else if (value.isEmpty && index > 0) {
      FocusScope.of(context).requestFocus(_focusNodes[index - 1]);
    }
  }

  Future<void> _handleVerifyCode() async {
    if (_verifyEmailKey.currentState!.validate()) {
      final otpCode = _otpControllers.map((c) => c.text).join();

      if (otpCode.length < 6) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Please enter all 6 digits."),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      setState(() => _isVerifying = true);

      try {
        final response = await _apiService.verifyOtp(widget.email, otpCode);

        final message = response['message']?.toString().toLowerCase() ?? '';
        final error = response['error']?.toString() ?? '';

        if (message.contains('verified') || message.contains('success')) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Verification successful!"),
              backgroundColor: Colors.green,
            ),
          );

          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => CreatePassword(
                email: widget.email,
                code: otpCode,
              ),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(error.isNotEmpty
                  ? error
                  : (response['message'] ?? "Verification failed.")),
              backgroundColor: Colors.red,
            ),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Verification failed: $e"),
            backgroundColor: Colors.red,
          ),
        );
      } finally {
        setState(() => _isVerifying = false);
      }
    }
  }

  Future<void> _handleResendCode() async {
    setState(() => _isResending = true);

    try {
      final response = await _apiService.resendOtp(widget.email);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text(response['message'] ?? "Code resent to your email."),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Failed to resend code: $e"),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 90),
          child: Form(
            key: _verifyEmailKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 📧 Mail Image
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 75),
                  child: Image.asset(
                    'assets/images/mail.png',
                    fit: BoxFit.contain,
                    alignment: Alignment.topCenter,
                  ),
                ),

                const SizedBox(height: 100),

                const Center(
                  child: Text(
                    "Verify Your Email",
                    style: TextStyle(
                      fontSize: 35,
                      fontFamily: 'KantumruyPro',
                      fontWeight: FontWeight.w700,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),

                const SizedBox(height: 15),

                const Center(
                  child: Text(
                    "Please enter the 6-digit code sent to your email.",
                    style: TextStyle(
                      fontSize: 14,
                      fontFamily: 'Poppins-SemiBold',
                      fontWeight: FontWeight.w600,
                      color: Color(0XFF4D4D4D),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),

                const SizedBox(height: 30),

                // 🔢 OTP Fields
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(6, (index) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: SizedBox(
                          width: 50,
                          height: 60,
                          child: TextFormField(
                            controller: _otpControllers[index],
                            focusNode: _focusNodes[index],
                            textAlign: TextAlign.center,
                            keyboardType: TextInputType.number,
                            maxLength: 1,
                            decoration: inputDecoration("").copyWith(
                              counterText: "",
                            ),
                            onChanged: (value) => _onOtpChanged(value, index),
                            validator: (value) =>
                                value == null || value.isEmpty ? '' : null,
                          ),
                        ),
                      );
                    }),
                  ),
                ),

                const SizedBox(height: 15),

                GestureDetector(
                  onTap: _isResending ? null : () => _handleResendCode(),
                  child: Center(
                    child: Text(
                      _isResending ? "Resending..." : "Resend code",
                      style: const TextStyle(
                        fontSize: 16,
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.w700,
                        color: Color(0XFF4F774A),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 150),

                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: WelcomeButton(
                    text: _isVerifying ? "Verifying..." : "Confirm",
                    isPrimary: true,
                    onPressed:
                        _isVerifying ? null : () => _handleVerifyCode(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
