import 'package:flutter_test/flutter_test.dart';
import 'package:cybersphere_mobile/config.dart';

void main() {
  test('Config should return a valid API URL', () {
    final url = Config.apiBaseUrl;
    expect(url, isNotEmpty);
    expect(url.startsWith('http'), isTrue);
  });
}
