import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class Config {
  // Use 10.0.2.2 for Android emulator, localhost for Web/Windows/iOS simulator.
  static String get apiBaseUrl {
    if (kIsWeb) return 'http://localhost:8000';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:8000';
    } catch (e) {
      // Ignored
    }
    return 'http://localhost:8000';
  }
}
