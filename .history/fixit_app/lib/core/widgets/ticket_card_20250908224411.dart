import 'package:flutter/material.dart';
import 'dart:io';
import '/features/reports/presentation/'

class TicketCard extends StatelessWidget {
  final Map<String, dynamic> report;

  const TicketCard({Key? key, required this.report}) : super(key: key);

  @override
  Widget build(BuildContext context) {

    // Image Handling
    final imagePath = report['image'] ?? "";
    Widget imageWidget;
    if (imagePath.isNotEmpty) {
      final file = File(imagePath);
      imageWidget = file.existsSync()
          ? Image.file(file, width: 72, height: 108, fit: BoxFit.cover)
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

                      // ID
                      Text(
                        (report['id'] != null && report['id'].toString().isNotEmpty)
                            ? report['id'].toString()
                            : "No ID",
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: Colors.black,
                        ),
                      ),
                      const SizedBox(width: 6),

                      // Visibility
                      Text(
                        report['visibility'] ?? "Public",
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const Spacer(),
                      
                      // Menu Button
                      PopupMenuButton<String>(
                        icon: const Icon(Icons.more_vert, size: 16),
                        onSelected: (value) {
                          itemBuilder: (context) => [
                            PopupMenuItem(
                              child: Text('View'),
                              value: 'View'
                              ),
                            PopupMenuItem(
                              child: Text('Edit'),
                              value: 'Edit',
                            ),
                            PopupMenuItem(
                              child: Text('Delete'),
                              value: 'Delete',
                            ),
                          ];
                        }
                      )
                    ],
                  ),
                  const SizedBox(height: 2),

                  // Title
                  Text(
                    report['title'] ?? "No Title",
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),

                  // Description
                  Text(
                    "Description: ${report['description'] ?? "No Description"}",
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),

                  // Status
                  Row(
                    children: [
                      const Text(
                        'Status: ',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        report['status'] ?? "Unknown",
                        style: TextStyle(
                          color: report['statusColor'] is Color
                              ? report['statusColor']
                              : Colors.black,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Location
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 14),
                      const SizedBox(width: 4),
                      Text(report['location'] ?? "No Location"),
                      const SizedBox(width: 16),
                      const Icon(Icons.thumb_up_alt_outlined, size: 14),
                      const SizedBox(width: 4),
                      Text('${report['likes'] ?? 0}'),
                      const Spacer(),

                      // Date and Time
                      Row(
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
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
// Placeholder for missing image
Widget _placeholderBox() {
  return Container(height: 108, width: 72, color: Colors.grey.shade300);
}
