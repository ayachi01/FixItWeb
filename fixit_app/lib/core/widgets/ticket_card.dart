import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'dart:io';
import '/features/reports/presentation/pages/edit_report.dart';
import '/features/reports/presentation/pages/view_report.dart';

class TicketCard extends StatelessWidget {
  final Map<String, dynamic> report;
  final String apiBaseUrl = "http://192.168.5.137:8000/api";

  const TicketCard({Key? key, required this.report}) : super(key: key);

  String get baseUrl => apiBaseUrl.replaceAll("/api", "");

  // ✅ Resolve possible image URL
  String? _resolveImageUrl() {
    try {
      final images = report['images'];
      if (images is List && images.isNotEmpty) {
        for (final img in images) {
          String? url;
          if (img is Map && img['image_url'] != null) {
            url = img['image_url'].toString();
          } else if (img is String) {
            url = img;
          }
          if (url != null && url.isNotEmpty) {
            return _normalizeUrl(url);
          }
        }
      }
      for (final key in ['image_url', 'image']) {
        final val = report[key];
        if (val != null && val.toString().isNotEmpty) {
          return _normalizeUrl(val.toString());
        }
      }
    } catch (_) {}
    return null;
  }

  // ✅ Normalize image path
  String _normalizeUrl(String raw) {
    raw = raw.trim();
    if (raw.isEmpty) return "";
    if (raw.startsWith("http")) return Uri.decodeFull(raw);
    if (raw.startsWith("/")) return "$baseUrl$raw";
    if (raw.startsWith("media/")) return "$baseUrl/$raw";
    return "$baseUrl/media/$raw";
  }

  // ✅ Map status → color
  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'resolved':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      case 'assigned':
        return Colors.orange;
      case 'created':
        return Colors.blueGrey;
      default:
        return Colors.black;
    }
  }

  // ✅ Safe date extraction
  String _safeDate(dynamic value) {
    if (value == null) return "Unknown";
    final str = value.toString();
    return str.length >= 10 ? str.substring(0, 10) : str;
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = _resolveImageUrl();

    Widget imageWidget;
    if (imageUrl != null && imageUrl.isNotEmpty) {
      if (kIsWeb || imageUrl.startsWith("http")) {
        imageWidget = Image.network(
          imageUrl,
          width: 72,
          height: 108,
          fit: BoxFit.cover,
          headers: const {'Connection': 'keep-alive'},
          loadingBuilder: (context, child, progress) =>
              progress == null ? child : _loadingBox(),
          errorBuilder: (context, error, stackTrace) =>
              _placeholderBox(label: "Net Err"),
        );
      } else {
        final file = File(imageUrl);
        imageWidget = file.existsSync()
            ? Image.file(file, width: 72, height: 108, fit: BoxFit.cover)
            : _placeholderBox(label: "Missing");
      }
    } else {
      imageWidget = _placeholderBox(label: "No Img");
    }

    return Card(
      color: Colors.green.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
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
                  // 🔹 Top Row (Location, Visibility, Menu)
                  Row(
                    children: [
                      Icon(Icons.place, size: 14, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text(
                        report['location_name'] ??
                            report['location']?.toString() ??
                            "Unknown Location",
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                      const Spacer(),
                      Text(report['visibility'] ?? "Public",
                          style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      PopupMenuButton<String>(
                        icon: const Icon(Icons.more_vert, size: 16),
                        onSelected: (value) {
                          if (value == 'View') {
                            Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) => const ViewReport()));
                          } else if (value == 'Edit') {
                            Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) => const EditReport()));
                          }
                        },
                        itemBuilder: (context) => const [
                          PopupMenuItem(value: 'View', child: Text('View')),
                          PopupMenuItem(value: 'Edit', child: Text('Edit')),
                          PopupMenuItem(
                            value: 'Delete',
                            child: Text('Delete',
                                style: TextStyle(color: Color(0xFFFF3B30))),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 4),

                  // 🔹 Title
                  Text(
                    report['title'] ?? "No Title",
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 16),
                  ),

                  // 🔹 Category + Urgency
                  Row(
                    children: [
                      if (report['category'] != null)
                        Text("${report['category']} • ",
                            style: const TextStyle(
                                fontSize: 12, color: Colors.black54)),
                      if (report['urgency'] != null)
                        Text(
                          report['urgency'],
                          style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.redAccent),
                        ),
                    ],
                  ),

                  const SizedBox(height: 4),

                  // 🔹 Description
                  Text(
                    report['description'] ?? "No Description",
                    style: TextStyle(color: Colors.grey[700], fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 2,
                  ),

                  const SizedBox(height: 6),

                  // 🔹 Status line
                  Row(
                    children: [
                      const Text('Status: ',
                          style: TextStyle(fontWeight: FontWeight.w500)),
                      Text(
                        report['status'] ?? "Unknown",
                        style: TextStyle(
                          color: _statusColor(report['status'] ?? ''),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),

                  // 🔹 Reporter / Assigned To
                  if (report['reporter_name'] != null ||
                      report['assigned_to'] != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Row(
                        children: [
                          const Icon(Icons.person_outline, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            report['assigned_to'] ??
                                report['reporter_name'] ??
                                "Unknown",
                            style: const TextStyle(fontSize: 12),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 6),

                  // 🔹 Likes + Dates
                  Row(
                    children: [
                      const Icon(Icons.thumb_up_alt_outlined, size: 14),
                      const SizedBox(width: 4),
                      Text('${report['likes'] ?? 0}',
                          style: const TextStyle(fontSize: 12)),
                      const Spacer(),
                      Text("Created: ${_safeDate(report['created_at'])}",
                          style: const TextStyle(
                              fontSize: 10, color: Colors.grey)),
                      if (report['updated_at'] != null)
                        Padding(
                          padding: const EdgeInsets.only(left: 8.0),
                          child: Text("Updated: ${_safeDate(report['updated_at'])}",
                              style: const TextStyle(
                                  fontSize: 10, color: Colors.grey)),
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

  Widget _loadingBox() {
    return Container(
      width: 72,
      height: 108,
      color: Colors.grey.shade200,
      child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
    );
  }

  Widget _placeholderBox({String label = ""}) {
    return Container(
      height: 108,
      width: 72,
      color: Colors.grey.shade300,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.image_not_supported, color: Colors.grey),
          if (label.isNotEmpty)
            Text(label,
                style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ),
    );
  }
}
