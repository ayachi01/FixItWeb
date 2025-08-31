import 'package:flutter/material.dart';

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Bottom Navigation Bar
    return BottomNavigationBar(
      backgroundColor: Colors.white,
      currentIndex: currentIndex,
      onTap: onTap,
      type: BottomNavigationBarType.fixed,
      selectedItemColor: const Color(0XFF386641),
      unselectedItemColor: const Color(0XFFBEBEBE),

      // Selected Label Style
      selectedLabelStyle: const TextStyle(
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: FontWeight.w500,
      ),

      // Unselected Label Style
      unselectedLabelStyle: const TextStyle(
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: FontWeight.w500,
      ),

      items: [
        // Home
        BottomNavigationBarItem(
          icon: Image.asset(
            'assets/images/home.png',
            width: 24,
            height: 24,
          ),
          activeIcon: Image.asset(
            'assets/images/home_selected.png',
            width: 24,
            height: 24,
          ),
          label: 'Home',
        ),

        // My Reports
        BottomNavigationBarItem(
          icon: Image.asset(
            'assets/images/my_reports.png',
            width: 24,
            height: 24,
          ),
          activeIcon: Image.asset(
            'assets/images/my_reports_selected.png',
            width: 24,
            height: 24,
          ),
          label: 'My Reports',
        ),

        // Chatbot
        BottomNavigationBarItem(
          icon: Image.asset(
            'assets/images/chatbot.png',
            width: 24,
            height: 24,
          ),
          label: 'Chatbot'
        ),

      // Settings
        BottomNavigationBarItem(
          icon: Image.asset(
            'assets/images/settings.png',
            width: 24,
            height: 24,
          ),
          activeIcon: Image.asset(
            'assets/images/settings_selected.png',
            width: 24,
            height: 24,
          ),
          label: 'Settings',
        ),

      ],
    );
  }
}
