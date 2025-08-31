import 'package:flutter/material.dart';

class ProfileAvatar extends StatelessWidget {
  final String? imageURL;
  final double radius;

  const ProfileAvatar({
    super.key,
    this.imageURL,
    this.radius = 40,
  });

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundImage: imageURL != null && imageURL!.isNotEmpty
          ? NetworkImage(imageURL!)
          : null,
           child: imageURL == null || imageURL!.isEmpty
          ? Icon(Icons.person, size: radius, color: Colors.grey[700])
          : null,
    );
  }
}