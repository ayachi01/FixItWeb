import 'package:flutter/material.dart';

class AboutUs extends StatefulWidget {
  const AboutUs({super.key});

  @override
  State<AboutUs> createState() => _AboutUsState();
}

class _AboutUsState extends State<AboutUs> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),
      appBar: AppBar(
        title: const Text(
          'About Us',
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
            "FixIt – PHINMA-Upang Campus Maintenance \n"
            "Reporting System is a student-led initiative \n"
            "developed by BSIT students from PHINMA \n"
            "University of Pangasinan, under the course \n"
            "ITE 387 - Advanced Programming. \n\n"

            "We built FixIt to solve a real problem: delayed \n"
            "and inefficient campus maintenance\n"
            "reporting. Our goal is to empower students, \n"
            "faculty, and staff with asimple tool to report \n"
            "issues, track progress,"
            " and enhance safety and comfort across campus. \n\n"

            "Meet the Team: \n"
            "1. Fran, Juliane Celes E. \n"
            "2. Josafat, Kyran Gabriel E. \n"
            "3. Magbutay, Jennica Mae S. \n"
            "4. Marcial, Rojelio A. Jr. \n"
            "5. Pimentel, John Lloyd B. \n"
            "6. Quinto, Ryan Q. \n"
            "7. Valencia, Symon A. \n\n"

            "Together, we are committed to delivering a \n"
            "smart, intuitive, and efficient reporting \n"
            "platform to improve everyone’s experience \n"
            "on campus.",
            style: TextStyle(
              fontSize: 16,
              fontFamily: 'KantumruyPro-Regular',
              fontWeight: FontWeight.w400,
              color: Colors.black,
              height: 1.5,
              letterSpacing: 0.5
            ),
          ),
        ),
      ),
    );
  }
}
