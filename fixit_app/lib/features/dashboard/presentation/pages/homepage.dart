import 'package:flutter/material.dart';
import '/core/widgets/search_bar.dart';

class HomePage extends StatefulWidget {
  final TextEditingController? firstNameController;
  final TextEditingController? lastNameController;

  const HomePage({
    super.key,
    this.firstNameController,
    this.lastNameController,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController _searchController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final firstName = widget.firstNameController?.text ?? "User";

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: const Color(0XFFF8F8F8),

        // App Bar
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(120),
          child: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            automaticallyImplyLeading: false,
            toolbarHeight: 120,
            title: Padding(
              padding: const EdgeInsets.only(bottom: 30),
              child: RichText(
                text: TextSpan(
                  text: "Welcome, \n",
                  style: const TextStyle(
                    fontSize: 30,
                    fontFamily: 'PlusJakartaSans-Regular',
                    fontWeight: FontWeight.w500,
                    color: Colors.black,
                  ),
                  children: [
                    TextSpan(
                      text: firstName,
                      style: const TextStyle(
                        fontSize: 30,
                        fontFamily: 'PlusJakartaSans-Bold',
                        fontWeight: FontWeight.w700,
                        color: Colors.black,
                      ),
                    ),
                    const TextSpan(
                      text: "!",
                      style: TextStyle(color: Colors.black),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),

        // Body
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              children: [
                // Search Bar
                SearchBarWidget(
                  controller: _searchController,
                  hintText: "Search Ticket",
                  onChanged: (value) {
                    print("Searching: $value");
                  },
                  onClear: () {
                    print("Cleared Search");
                  },
                ),
                const SizedBox(height: 20),

                const Text("Ticket List"),

                // Bottom Nav Bar
              ],
            ),
          ),
        ),
      ),
    );
  }
}
