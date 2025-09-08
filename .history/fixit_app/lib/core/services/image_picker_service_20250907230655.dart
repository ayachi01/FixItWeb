import 'package:image_picker/image_picker.dart';




Future<XFile?> pickImageFromGallery() async {
  final returnedImage = await ImagePicker().pickImage(source: ImageSource.gallery);

  setState(() {
    selectedImage = File(returnedImage!.path);
  });
}