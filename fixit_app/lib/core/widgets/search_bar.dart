import 'package:flutter/material.dart';

class SearchBarWidget extends StatelessWidget {
  final TextEditingController controller;
  final String hintText;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onClear;

  const SearchBarWidget({
    super.key,
    required this.controller,
    this.hintText = "Search Ticket",
    this.onChanged,
    this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.only(right: 60),
        child: SizedBox(
          width: 270,
          height: 50,
          child: TextField(
            controller: controller,
            onChanged: onChanged,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search),
              suffixIcon: controller.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        controller.clear();
                        if (onClear != null) onClear!();
                      },
                    )
                  : null,
              hintText: hintText,

              // Borders
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(25),
              ),

              // Enabled Border
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(25),
                borderSide: const BorderSide(
                  color: Color(0XFFB0B0B0),
                  width: 1,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(25),
                borderSide: const BorderSide(
                  color: Color(0XFFB0B0B0),
                  width: 1,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
