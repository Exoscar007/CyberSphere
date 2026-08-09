import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:image_picker/image_picker.dart';
import '../config.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isLoading = true;
  String? _errorMsg;
  List<dynamic> _assignments = [];
  Map<String, dynamic>? _authData;

  // Ahmedabad Center for demo
  final LatLng _currentLocation = const LatLng(23.0395, 72.5571);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_authData == null) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args != null && args is Map<String, dynamic>) {
        _authData = args;
        _fetchAssignments();
      }
    }
  }

  Future<void> _fetchAssignments() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      final token = _authData?['access'];
      final url = Uri.parse('${Config.apiBaseUrl}/api/patrol/assignments/');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List;
        setState(() {
          _assignments = data;
        });
      } else {
        setState(() => _errorMsg = 'CONNECTION FAILED (${response.statusCode})');
      }
    } catch (e) {
      setState(() => _errorMsg = 'NETWORK OFFLINE');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _uploadEvidence() async {
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.camera); // Prefer camera for field ops

    if (image == null) return; 
    if (!mounted) return;

    // Fast-path evidence attach to FIR 1 (simulated current assignment logic)
    setState(() {
      _isLoading = true;
    });

    try {
      final token = _authData?['access'];
      final url = Uri.parse('${Config.apiBaseUrl}/api/crimes/fir/1/evidence/');
      
      var request = http.MultipartRequest('POST', url)
        ..headers['Authorization'] = 'Bearer $token'
        ..files.add(await http.MultipartFile.fromPath('file', image.path));

      var response = await request.send();

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('EVIDENCE UPLOADED SECURELY TO FIR'), backgroundColor: Color(0xFF10B981)),
        );
      } else {
        setState(() => _errorMsg = 'UPLOAD FAILED (${response.statusCode})');
      }
    } catch (e) {
      setState(() => _errorMsg = 'UPLOAD FAILED: NETWORK OFFLINE');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildActionButton(String label, IconData icon, Color color, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 60,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 24),
              const SizedBox(height: 4),
              Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = _authData?['user'] ?? {};
    final hasAssignment = _assignments.isNotEmpty;
    final currentAssignment = hasAssignment ? _assignments[0] : null;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('CYBERSPHERE', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1, color: Colors.white)),
            const Text('FIELD OPERATIONS', style: TextStyle(fontSize: 10, letterSpacing: 1, color: Color(0xFF94A3B8))),
          ],
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF3B82F6)),
            onPressed: _fetchAssignments,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF94A3B8)),
            onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
          : _errorMsg != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 60),
                        const SizedBox(height: 16),
                        Text(_errorMsg!, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B82F6)),
                          onPressed: _fetchAssignments, 
                          child: const Text('RETRY CONNECTION', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                        ),
                      ],
                    ),
                  ),
                )
              : Column(
                  children: [
                    // TOP: Officer Status
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: const BoxDecoration(
                        color: Color(0xFF1E293B),
                        border: Border(bottom: BorderSide(color: Color(0xFF334155))),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 8),
                          Text('UNIT: P-${user['id']?.toString().padLeft(3, '0') ?? '000'}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white, fontFamily: 'monospace')),
                          const Spacer(),
                          const Text('GPS: ACTIVE', style: TextStyle(fontSize: 10, color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                        ],
                      ),
                    ),
                    
                    // MAIN: CURRENT ASSIGNMENT
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: Color(0xFF0F172A),
                        border: Border(bottom: BorderSide(color: Color(0xFF334155))),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('CURRENT ASSIGNMENT', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold, letterSpacing: 1)),
                          const SizedBox(height: 8),
                          if (hasAssignment) ...[
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('ZONE DISPATCH: ${currentAssignment["zone_name"]?.toUpperCase()}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  color: const Color(0xFFEF4444),
                                  child: const Text('HIGH PRIORITY', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                )
                              ],
                            ),
                            const SizedBox(height: 8),
                            const Text('INCIDENT: VEHICLE THEFT / BREAK-IN', style: TextStyle(fontSize: 12, color: Colors.white)),
                            const SizedBox(height: 4),
                            Text('STATUS: ${currentAssignment["status"]}', style: const TextStyle(fontSize: 12, color: Color(0xFF3B82F6), fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                          ] else ...[
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 16.0),
                              child: Text('NO ACTIVE ASSIGNMENT', style: TextStyle(color: Color(0xFF64748B), fontSize: 14, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ],
                      ),
                    ),

                    // MAP: Navigation and Context
                    Expanded(
                      child: Stack(
                        children: [
                          FlutterMap(
                            options: MapOptions(
                              initialCenter: _currentLocation,
                              initialZoom: 15,
                            ),
                            children: [
                              TileLayer(
                                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                                userAgentPackageName: 'com.example.cybersphere_mobile',
                              ),
                              MarkerLayer(
                                markers: [
                                  // Current Location (Blue Pulse)
                                  Marker(
                                    point: _currentLocation,
                                    width: 40,
                                    height: 40,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF3B82F6).withValues(alpha: 0.3),
                                        shape: BoxShape.circle,
                                        border: Border.all(color: const Color(0xFF3B82F6), width: 2),
                                      ),
                                      child: const Center(
                                        child: Icon(Icons.my_location, color: Colors.white, size: 20),
                                      ),
                                    ),
                                  ),
                                  // Destination (Red if assigned)
                                  if (hasAssignment)
                                    Marker(
                                      point: LatLng(_currentLocation.latitude + 0.005, _currentLocation.longitude + 0.002), // Simulating destination
                                      width: 40,
                                      height: 40,
                                      child: const Icon(Icons.location_on, color: Color(0xFFEF4444), size: 36),
                                    ),
                                ],
                              ),
                            ],
                          ),
                          // Map Overlay Status
                          Positioned(
                            top: 8,
                            right: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              color: const Color(0xFF1E293B).withValues(alpha: 0.9),
                              child: const Text('LIVE TRACKING ENABLED', style: TextStyle(color: Color(0xFF10B981), fontSize: 9, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                            ),
                          )
                        ],
                      ),
                    ),

                    // ACTIONS: Field Operations
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Color(0xFF1E293B),
                        border: Border(top: BorderSide(color: Color(0xFF334155))),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              _buildActionButton('NAVIGATE', Icons.navigation, const Color(0xFF3B82F6), () {}),
                              _buildActionButton('ARRIVED', Icons.place, const Color(0xFF10B981), () {}),
                              _buildActionButton('REPORT', Icons.warning, const Color(0xFFF59E0B), () {}),
                            ],
                          ),
                          const SizedBox(height: 8),
                          // EVIDENCE SECTION (Huge Touch Target)
                          GestureDetector(
                            onTap: _uploadEvidence,
                            child: Container(
                              height: 70,
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                border: Border.all(color: const Color(0xFF3B82F6), width: 2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.camera_alt, color: Color(0xFF3B82F6), size: 32),
                                  SizedBox(width: 16),
                                  Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('CAPTURE EVIDENCE', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1)),
                                      Text('PHOTO / VIDEO UPLOAD TO STATION', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'monospace')),
                                    ],
                                  )
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}
