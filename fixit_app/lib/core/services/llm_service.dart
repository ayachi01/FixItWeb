import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;

class LLMService {
  final String baseUrl = "http://192.168.1.254:5000"; // Change if deployed or on LAN

  /// 🧠 Send text or image to Flask LLM
  Future<Map<String, dynamic>> reportIssue({
    String? message,
    File? image,
  }) async {
    final uri = Uri.parse("$baseUrl/report");

    final request = http.MultipartRequest('POST', uri);

    if (message != null && message.isNotEmpty) {
      request.fields['message'] = message;
    }

    if (image != null) {
      request.files.add(await http.MultipartFile.fromPath('image', image.path));
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed: ${response.statusCode} - ${response.body}");
    }
  }

  /// 📄 Analyze plain text (optional LLM endpoint)
  Future<Map<String, dynamic>> analyzeText(String text) async {
    final uri = Uri.parse("$baseUrl/analyze");
    try {
      final response = await http.post(
        uri,
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"text": text}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception("Failed to analyze: ${response.statusCode}");
      }
    } catch (e) {
      return {"error": e.toString()};
    }
  }

  /// 🧠 Send image bytes directly (for memory images / camera stream)
  Future<Map<String, dynamic>> reportIssueBytes(Uint8List bytes) async {
    final uri = Uri.parse("$baseUrl/report");

    final request = http.MultipartRequest('POST', uri);
    request.files.add(
      http.MultipartFile.fromBytes(
        'image',
        bytes,
        filename: 'frame.jpg',
      ),
    );

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed: ${response.statusCode} - ${response.body}");
    }
  }
}
