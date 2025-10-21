// lib/utils/storage.dart
import 'package:flutter/foundation.dart' show kIsWeb;

import 'storage_stub.dart'
    if (dart.library.html) 'storage_web.dart'
    if (dart.library.io) 'storage_mobile.dart';

final storageHelper = StorageHelper();
