import 'package:torch_light/torch_light.dart';

class TorchService {
  Future<void> toggleTorch(bool isOn) async {
    try {
      if (isOn) {
        await TorchLight.enableTorch();
      }
      else {
        await TorchLight.disableTorch();
      }
    } catch (e) {
      // Handle errors, e.g., device doesn't have a torch
      print('Error toggling torch: $e');
    }
  }
}
