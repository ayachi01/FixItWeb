import 'package:flutter/material.dart';

class CustomFAB extends StatelessWidget {
   final VoidCallback onPressed;

   const CustomFAB({
    Key? key,
    required this.onPressed,
   }): super(key: key);

   @override
   Widget build(BuildContext context) {
    return FloatingActionButton(
      onPressed: onPressed,
      backgroundColor: const Color(0xFF4F774A),
      elevation: 8,
      child: Image.asset(
        'assets/images/scan.png',
         width: 40,
         height: 40,
         color: Colors.white,
      )
      );
   }
}
