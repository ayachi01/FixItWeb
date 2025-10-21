import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class LLMService {
  final String baseUrl =
      "http://172.20.10.2:5000"; // Change if deployed or on LAN

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
}
