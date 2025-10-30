import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;

class LLMService {
  // ⚙️ Update this IP to your computer’s LAN IP if testing on a real device
  final String baseUrl = "http://192.168.1.254:8000"; // Django backend port

  /// 🧠 Send text or image to Django LLM endpoint
  Future<Map<String, dynamic>> reportIssue({
    String? message,
    File? image,
  }) async {
    final uri = Uri.parse("$baseUrl/llm/report/"); // ✅ Django endpoint

    final request = http.MultipartRequest('POST', uri);

    // Add message field
    if (message != null && message.isNotEmpty) {
      request.fields['message'] = message;
    }

    // Add image if provided
    if (image != null && await image.exists()) {
      request.files.add(await http.MultipartFile.fromPath('image', image.path));
    }

    print("📤 Sending to: $uri");
    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      try {
        return json.decode(response.body);
      } catch (e) {
        return {"ai_reply": "⚠️ Could not parse JSON response.", "ticket": {}};
      }
    } else {
      throw Exception(
        "❌ Failed to send to LLM (status ${response.statusCode}): ${response.body}",
      );
    }
  }

  /// 📄 Optional: Analyze plain text (if you add another endpoint later)
  Future<Map<String, dynamic>> analyzeText(String text) async {
    final uri = Uri.parse("$baseUrl/llm/analyze/");
    try {
      final response = await http.post(
        uri,
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"text": text}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception("Failed to analyze text: ${response.statusCode}");
      }
    } catch (e) {
      return {"error": e.toString()};
    }
  }

  /// 🧠 Optional: Send raw image bytes
  Future<Map<String, dynamic>> reportIssueBytes(Uint8List bytes) async {
    final uri = Uri.parse("$baseUrl/llm/report/"); // ✅ Django path

    final request = http.MultipartRequest('POST', uri);
    request.files.add(
      http.MultipartFile.fromBytes('image', bytes, filename: 'frame.jpg'),
    );

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      try {
        return json.decode(response.body);
      } catch (e) {
        return {"ai_reply": "⚠️ Could not parse JSON response.", "ticket": {}};
      }
    } else {
      throw Exception(
        "❌ Failed to send to LLM (status ${response.statusCode}): ${response.body}",
      );
    }
  }
}
