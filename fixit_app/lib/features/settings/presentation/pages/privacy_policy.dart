import 'package:flutter/material.dart';

class PrivacyPolicy extends StatefulWidget {
  const PrivacyPolicy({super.key});

  @override
  State<PrivacyPolicy> createState() => _PrivacyPolicyState();
}

class _PrivacyPolicyState extends State<PrivacyPolicy> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),
      appBar: AppBar(
        title: const Text(
          'Privacy Policy',
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
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Text(
            "Effective Date: September 09, 2025 \n \n"

            "At FixIt, we are committed to protecting your \n"
            "privacy and ensuring a safe experience \n"
            "when using our web and mobile platforms. \n"
            "This Privacy Policy outlines how \n"
            "we collect, use, and safeguard your personal information. \n\n"

            "1. Information We Collect \n\n"
            "We collect the following data from users: \n\n"
            " • Personal identifiers (e.g., name, school \n"
            "   email, student/faculty ID) \n\n"
            " • Maintenance reports (e.g., issue  \n"
            "   descriptions, category, photo uploads, \n"
            "   location tags) \n\n"
            " • Usage data (e.g., date/time of reports,  \n"
            "   issue status, login timestamps) \n\n"
            "We do not collect any sensitive personal \n"
            "data such as passwords, private messages, \n"
            "or financial information. \n\n"

            "2. How We Use Your Information \n\n"
            "We use the collected data to: \n\n"
            " • Process and manage maintenance reports \n"
            " • Notify users about ticket status updates \n"
            " • Generate analytics for facility management teams \n"
            " • Improve the performance and reliability of the platform \n\n"

            "3. Who Has Access \n\n"
            " • Only authorized university staff and \n"
            "   maintenance personnel have access to  \n"
            "   user-submitted reports. \n\n"
            " • Developers may access non-personal  \n"
            "   data for debugging or improvement purposes. \n\n"
            " • We do not share or sell your data to third parties. \n\n"
            
            "4. Data Storage \n\n"
            " • Uploaded photos and reports are  \n"
            "   securely stored in cloud services (e.g., AWS S3). \n\n"
            " • Structured data like user IDs and ticket \n"
            "   logs are stored in secure databases (e.g., AWS RDS) \n\n"
            " • All transmissions are encrypted. \n\n"
            
            "5. User Rights \n\n"
            "You have the right to: \n\n"
            " • View your report history  \n"
            " • Delete or update your report if incorrect  \n"
            " • Request data removal after graduation or role change  \n"
            " • To request deletion or updates, please  \n"
            "   contact the campus IT or FixIt admin team. \n\n"
            
            "6. Updates to this Policy \n\n"
            "This privacy policy may be updated as we \n"
            "add new features. You will be notified in \n"
            "app or via email if significant changes occur.",

            style: const TextStyle(
              fontSize: 16,
              fontFamily: 'KantumruyPro-Regular',
              fontWeight: FontWeight.w400,
              color: Colors.black,
              
            ),
          ),
        ),
      ),
    );
  }
}
