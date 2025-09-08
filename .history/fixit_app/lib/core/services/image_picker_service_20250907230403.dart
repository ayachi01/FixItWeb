import 'package:image_picker/image_picker.dart';
import 'package:flutter/material.dart';
import 'dart:io';


Future<XFile?> pickImageFromGallery() async {
  final returnedImage = await ImagePicker().pickImage(source: ImageSource.gallery);
  return returnedImage;
}

void setSelectedImage(XFile? image) {
  setState(() {
    selectedImage = File(returnedImage!.path);
  });
}