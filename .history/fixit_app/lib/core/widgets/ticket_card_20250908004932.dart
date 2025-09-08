import 'package:flutter/material.dart';
import 'dart:io';

class TicketCard extends StatelessWidget {
  final Map<String, dynamic> report;

  const TicketCard({
    Key? key,
    required this.report,
  }) :super(key:key);
  
  @override
  Widget build(BuildContext context) {
    final imagePath = report['image'];

    Widget imageWidget;
    if (imagePath != null && imagePath.isNotEmpty) {
    final file = File(imagePath);
    imageWidget = file.existsSync()
        ? Image.file(
            file,
            width: 72,
            height: 108,
            fit: BoxFit.cover,
          )
        : _placeholderBox();
    } else { 
      imageWidget = _placeholderBox();
    }

    // Card
    return Card(
      color: Colors.green.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(15),
              child: imageWidget,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        report['id'],
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        report['visibility'],
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const Spacer(),
                      const Icon(Icons.more_vert, size: 20),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    report['title'] ?? "No Title",
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    ("Description: ${report['description'] ?? "No Description"}"),
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Text(
                        'Status: ',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        report['status'],
                        style: TextStyle(
                          color: report['statusColor'],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
    Row( // ✅ Wrap date + time together
      children: [
        Text(
          report['date'] ?? "",
          style: const TextStyle(
            fontSize: 10,
            color: Colors.grey,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          report['time'] ?? "",
          style: const TextStyle(
            fontSize: 10,
            color: Colors.grey,
          ),
        ),
      ],
    ),
  ],
),
            ),
          ],
            ),
     
        ),
      ),
    );
  }
}
  Widget _placeholderBox() {
    return Container(
      height: 108,
      width: 72,
      color: Colors.grey.shade300,
    );
  }
    