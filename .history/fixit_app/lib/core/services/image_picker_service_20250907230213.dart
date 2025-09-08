import 'package:image_picker/image_picker.dart';
import 'package:flutter/material.dart';


Future<XFile?> pickImageFromGallery() async {
  final returnedImage = await ImagePicker().pickImage(source: source)
}