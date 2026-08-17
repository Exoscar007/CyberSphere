import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMsg;

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      final url = Uri.parse('${Config.apiBaseUrl}/api/auth/login/');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': _usernameController.text,
          'password': _passwordController.text,
        }),
      );

      if (response.statusCode == 200) {
        // Success
        final data = jsonDecode(response.body);
        
        // Role check
        final role = data['user']['role'];
        if (role != 'PATROL_OFFICER' && role != 'PATROL') {
          setState(() {
            _errorMsg = 'Access Denied: Only Patrol Officers can use the mobile application.';
            _isLoading = false;
          });
          return;
        }

        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/home', arguments: data);
      } else {
        setState(() {
          _errorMsg = 'Invalid credentials or backend rejected request. (${response.statusCode})';
        });
      }
    } catch (e) {
      setState(() {
        _errorMsg = 'Network Error: Cannot reach backend at ${Config.apiBaseUrl}.';
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark slate
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF3B82F6), width: 2),
                  color: const Color(0xFF1E293B),
                ),
                child: const Icon(Icons.shield, size: 40, color: Color(0xFF3B82F6)),
              ),
              const SizedBox(height: 24),
              const Text(
                'CYBERSPHERE',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 2),
              ),
              const Text(
                'MOBILE FIELD TERMINAL',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8), letterSpacing: 1),
              ),
              const SizedBox(height: 48),
              if (_errorMsg != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    border: Border.all(color: Colors.red),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(_errorMsg!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                ),
              TextField(
                controller: _usernameController,
                style: const TextStyle(color: Colors.white, fontFamily: 'monospace'),
                decoration: InputDecoration(
                  labelText: 'BADGE ID',
                  labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, letterSpacing: 1),
                  enabledBorder: const OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF334155))),
                  focusedBorder: const OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF3B82F6))),
                  prefixIcon: const Icon(Icons.badge, color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                style: const TextStyle(color: Colors.white, fontFamily: 'monospace'),
                decoration: InputDecoration(
                  labelText: 'AUTHORIZATION KEY',
                  labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, letterSpacing: 1),
                  enabledBorder: const OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF334155))),
                  focusedBorder: const OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF3B82F6))),
                  prefixIcon: const Icon(Icons.lock, color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _login,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
                child: _isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('ESTABLISH SECURE LINK', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
