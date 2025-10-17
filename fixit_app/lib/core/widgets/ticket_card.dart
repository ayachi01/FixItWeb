import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'dart:io';
import '/features/reports/presentation/pages/edit_report.dart';
import '/features/reports/presentation/pages/view_report.dart';

class TicketCard extends StatelessWidget {
  final Map<String, dynamic> report;

  // ✅ Backend API base
  final String apiBaseUrl = "http://192.168.5.137:8000/api";

  const TicketCard({Key? key, required this.report}) : super(key: key);

  // ✅ Base backend domain (without /api)
  String get baseUrl => apiBaseUrl.replaceAll("/api", "");

  /// ✅ Find the best possible image from the report
  String? _resolveImageUrl() {
    if (kDebugMode) debugPrint("📝 Report content: ${report.toString()}");

    try {
      final images = report['images'];
      if (images != null && images is List && images.isNotEmpty) {
        for (final img in images) {
          String? url;
          if (img is Map && img['image_url'] != null) {
            url = img['image_url'].toString();
          } else if (img is String) {
            url = img;
          }

          if (url != null && url.isNotEmpty) {
            final normalized = _normalizeUrl(url);
            if (kDebugMode) debugPrint("🟢 Using image from 'images': $normalized");
            return normalized;
          }
        }
      }

      // fallback keys
      for (final key in ['image_url', 'image']) {
        final val = report[key];
        if (val != null && val.toString().isNotEmpty) {
          final normalized = _normalizeUrl(val.toString());
          if (kDebugMode) debugPrint("🟡 Using fallback key '$key': $normalized");
          return normalized;
        }
      }

      if (kDebugMode) debugPrint("⚠️ No valid image found for report ${report['id']}");
    } catch (e, st) {
      if (kDebugMode) debugPrint("❌ _resolveImageUrl() failed: $e\n$st");
    }
    return null;
  }

  /// ✅ Normalize URL
  String _normalizeUrl(String raw) {
    raw = raw.trim();
    if (raw.isEmpty) return "";

    if (raw.startsWith("http")) return Uri.decodeFull(raw);
    if (raw.startsWith("/")) return "$baseUrl$raw";
    if (raw.startsWith("media/")) return "$baseUrl/$raw";

    return "$baseUrl/media/$raw";
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = _resolveImageUrl();
    Widget imageWidget;

    if (imageUrl != null && imageUrl.isNotEmpty) {
      if (kDebugMode) debugPrint("🔹 Final imageUrl to display: $imageUrl");

      if (kIsWeb || imageUrl.startsWith("http")) {
        imageWidget = Image.network(
          imageUrl,
          width: 72,
          height: 108,
          fit: BoxFit.cover,
          headers: const {'Connection': 'keep-alive'},
          loadingBuilder: (context, child, progress) {
            if (progress == null) return child;
            return _loadingBox();
          },
          errorBuilder: (context, error, stackTrace) {
            if (kDebugMode) debugPrint("❌ Network image failed: $imageUrl\n$error");
            return _placeholderBox(label: "Net Err");
          },
        );
      } else {
        final file = File(imageUrl);
        if (file.existsSync()) {
          if (kDebugMode) debugPrint("🟢 Displaying local file: $imageUrl");
          imageWidget = Image.file(file, width: 72, height: 108, fit: BoxFit.cover);
        } else {
          if (kDebugMode) debugPrint("⚠️ Local file not found: $imageUrl");
          imageWidget = _placeholderBox(label: "Missing");
        }
      }
    } else {
      if (kDebugMode) debugPrint("⚠️ No image URL to display");
      imageWidget = _placeholderBox(label: "No Img");
    }

    return Card(
      color: Colors.green.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            ClipRRect(borderRadius: BorderRadius.circular(15), child: imageWidget),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text("${report['id'] ?? 'No ID'}",
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 12)),
                      const SizedBox(width: 6),
                      Text(report['visibility'] ?? "Public",
                          style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      const Spacer(),
                      PopupMenuButton<String>(
                        icon: const Icon(Icons.more_vert, size: 16),
                        onSelected: (value) {
                          if (value == 'View') {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const ViewReport()),
                            );
                          } else if (value == 'Edit') {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const EditReport()),
                            );
                          }
                        },
                        itemBuilder: (context) => const [
                          PopupMenuItem(value: 'View', child: Text('View')),
                          PopupMenuItem(value: 'Edit', child: Text('Edit')),
                          PopupMenuItem(
                            value: 'Delete',
                            child: Text('Delete', style: TextStyle(color: Color(0XFFFF3B30))),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(report['title'] ?? "No Title",
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                  Text(
                    "Description: ${report['description'] ?? "No Description"}",
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 2,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Text('Status: ', style: TextStyle(fontWeight: FontWeight.w500)),
                      Text(
                        report['status'] ?? "Unknown",
                        style: TextStyle(
                          color: report['statusColor'] is Color ? report['statusColor'] : Colors.black,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 14),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          report['location_name'] ?? report['location']?.toString() ?? "No Location",
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.thumb_up_alt_outlined, size: 14),
                      const SizedBox(width: 4),
                      Text('${report['likes'] ?? 0}'),
                      const Spacer(),
                      Text(
                        (report['created_at'] ?? "").toString().substring(0, 10),
                        style: const TextStyle(fontSize: 10, color: Colors.grey),
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

  Widget _loadingBox() => Container(
        width: 72,
        height: 108,
        color: Colors.grey.shade200,
        child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );

  Widget _placeholderBox({String label = ""}) => Container(
        height: 108,
        width: 72,
        color: Colors.grey.shade300,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.image_not_supported, color: Colors.grey),
            if (label.isNotEmpty)
              Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
      );
}
