import 'package:flutter/material.dart';

class WelcomeButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;
  final bool isPrimary;

  const WelcomeButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isPrimary = true,
  });

  // Background Color
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: isPrimary ? const Color(0XFF386641) : Colors.white,
        foregroundColor: isPrimary ? Colors.white : const Color(0XFF000000),
        elevation: 3.5,
        padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 32.0),

        // Rounded Corner
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: isPrimary
              ? BorderSide.none
              : const BorderSide(color: Color(0XFF386641), width: 1.5),
        ),
      ),

      onPressed: onPressed,
      child: Text(
        text,
        style: TextStyle(
          fontSize: 18,
          fontFamily: 'Inter_24pt-Medium',
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
