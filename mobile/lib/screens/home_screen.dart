import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
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

  // Map & Location
  LatLng? _currentLocation;
  LatLng? _assignmentDestination;
  String _gpsStatus = 'GPS: INITIALIZING...';
  
  final MapController _mapController = MapController();
  bool _mapReady = false;
  
  StreamSubscription<Position>? _positionStreamSubscription;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_authData == null) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args != null && args is Map<String, dynamic>) {
        _authData = args;
        _initLocationTracking();
        _fetchAssignments();
      }
    }
  }

  @override
  void dispose() {
    _positionStreamSubscription?.cancel();
    super.dispose();
  }

  Future<void> _initLocationTracking() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() => _gpsStatus = 'GPS: DISABLED');
        _showSnackBar('Location services disabled. Please enable GPS.', isError: true);
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() => _gpsStatus = 'GPS: PERMISSION DENIED');
          _showSnackBar('Location permissions denied.', isError: true);
          return;
        }
      }
      
      if (permission == LocationPermission.deniedForever) {
        setState(() => _gpsStatus = 'GPS: PERMANENTLY DENIED');
        _showSnackBar('Location permissions permanently denied in OS.', isError: true);
        return;
      }

      final position = await Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high));
      setState(() {
        _currentLocation = LatLng(position.latitude, position.longitude);
        _gpsStatus = 'GPS: ACTIVE';
      });
      
      await _sendGPSPing(position.latitude, position.longitude);

      final locationSettings = const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 20,
      );

      _positionStreamSubscription = Geolocator.getPositionStream(locationSettings: locationSettings).listen(
        (Position pos) {
          setState(() {
            _currentLocation = LatLng(pos.latitude, pos.longitude);
          });
          _sendGPSPing(pos.latitude, pos.longitude);
        },
        onError: (e) {
          setState(() => _gpsStatus = 'GPS: ERROR STREAMING');
          debugPrint('Geolocator stream error: $e');
        }
      );
    } catch (e) {
      setState(() => _gpsStatus = 'GPS: EXCEPTION OCCCURRED');
      debugPrint('Geolocator Exception: $e');
    }
  }

  Future<void> _sendGPSPing(double lat, double lng) async {
    if (_assignments.isEmpty) return;
    final assignId = _assignments.first['id'];
    
    try {
      final token = _authData?['access'];
      final url = Uri.parse('${Config.apiBaseUrl}/api/patrol/assignments/$assignId/ping/');
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'lat': lat, 'lng': lng}),
      );
      
      if (response.statusCode == 201) {
        setState(() => _gpsStatus = 'GPS: PING SENT');
        debugPrint('GPS Ping Success. AssignID: $assignId, Lat: $lat, Lng: $lng');
      } else {
        setState(() => _gpsStatus = 'GPS: PING FAILED');
        debugPrint('GPS Ping Failed. Status: ${response.statusCode}');
      }
    } catch (e) {
      setState(() => _gpsStatus = 'GPS: OFFLINE');
      debugPrint('GPS Ping Exception: $e');
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
        
        final activeList = data.where((a) => a['status'] != 'COMPLETED' && a['status'] != 'CANCELLED').toList();
        
        setState(() {
          _assignments = activeList;
        });

        if (activeList.isNotEmpty) {
          final assignment = activeList.first;
          
          // Parse destination directly from assignment
          if (assignment['destination'] != null && assignment['destination']['coordinates'] != null) {
            final coords = assignment['destination']['coordinates'];
            final lng = coords[0];
            final lat = coords[1];
            
            setState(() {
              _assignmentDestination = LatLng(lat, lng);
            });
            
            // Center map to destination
            if (_mapReady && _assignmentDestination != null) {
               _mapController.move(_assignmentDestination!, 15.0);
            }
          }
        } else {
          setState(() => _assignmentDestination = null);
        }
        
      } else {
        setState(() => _errorMsg = 'CONNECTION FAILED (${response.statusCode})');
        _showSnackBar('Failed to fetch assignments. Server returned ${response.statusCode}', isError: true);
      }
    } catch (e) {
      setState(() => _errorMsg = 'NETWORK OFFLINE');
      _showSnackBar('Network offline or cannot reach backend.', isError: true);
      debugPrint('Fetch Assignments Exception: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> _updateStatus(String newStatus) async {
    if (_assignments.isEmpty) return;
    final activeAssignment = _assignments.first;
    final assignId = activeAssignment['id'];

    setState(() => _isLoading = true);

    try {
      final token = _authData?['access'];
      final url = Uri.parse('${Config.apiBaseUrl}/api/patrol/assignments/$assignId/');
      
      final response = await http.patch(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'status': newStatus}),
      );

      if (response.statusCode == 200) {
        _showSnackBar('STATUS UPDATED TO $newStatus');
        await _fetchAssignments(); 
      } else {
        setState(() => _errorMsg = 'STATUS UPDATE FAILED (${response.statusCode})');
        _showSnackBar('Status update failed: ${response.statusCode}', isError: true);
      }
    } catch (e) {
      setState(() => _errorMsg = 'NETWORK OFFLINE');
      _showSnackBar('Failed to update status due to network error.', isError: true);
      debugPrint('Status Update Exception: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _navigate() async {
    if (_assignmentDestination == null) {
      _showSnackBar('NO DESTINATION COORDINATES AVAILABLE FOR NAVIGATION', isError: true);
      return;
    }

    final lat = _assignmentDestination!.latitude;
    final lng = _assignmentDestination!.longitude;

    try {
      final googleMapsUrl = Uri.parse('google.navigation:q=$lat,$lng');
      final geoUrl = Uri.parse('geo:$lat,$lng?q=$lat,$lng(Incident+Location)');
      final webUrl = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
      
      debugPrint('Attempting to launch navigation to Lat: $lat Lng: $lng');

      if (await canLaunchUrl(googleMapsUrl)) {
        await launchUrl(googleMapsUrl);
      } else if (await canLaunchUrl(geoUrl)) {
        await launchUrl(geoUrl);
      } else {
        // Fallback to web map
        await launchUrl(webUrl, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      _showSnackBar('NAVIGATION FAILED', isError: true);
      debugPrint('Navigate Exception: $e');
    }
  }

  Future<void> _uploadEvidence() async {
    if (_assignments.isEmpty) return;
    final activeAssignment = _assignments.first;
    final assignId = activeAssignment['id'];
    final incidentId = activeAssignment['incident'];
    final firId = activeAssignment['fir'];

    final picker = ImagePicker();
    XFile? image;
    
    try {
      image = await picker.pickImage(source: ImageSource.camera);
    } catch (e) {
      debugPrint('Camera exception: $e. Falling back to gallery.');
      try {
        image = await picker.pickImage(source: ImageSource.gallery);
      } catch (e2) {
        _showSnackBar('CAMERA/GALLERY ACCESS FAILED', isError: true);
        debugPrint('Gallery exception: $e2');
        return;
      }
    }

    if (image == null) return; 
    if (!mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final token = _authData?['access'];
      final url = Uri.parse('${Config.apiBaseUrl}/api/crimes/evidence/');
      
      debugPrint('Uploading evidence for Assignment $assignId');

      var request = http.MultipartRequest('POST', url)
        ..headers['Authorization'] = 'Bearer $token'
        ..fields['assignment'] = assignId.toString()
        ..files.add(await http.MultipartFile.fromPath('file', image.path));
        
      if (incidentId != null) request.fields['incident'] = incidentId.toString();
      if (firId != null) request.fields['fir'] = firId.toString();

      var response = await request.send();

      if (response.statusCode == 200 || response.statusCode == 201) {
        _showSnackBar('EVIDENCE UPLOADED SECURELY');
      } else {
        final respBody = await response.stream.bytesToString();
        _showSnackBar('UPLOAD FAILED (${response.statusCode})', isError: true);
        debugPrint('Upload error body: $respBody');
      }
    } catch (e) {
      _showSnackBar('UPLOAD FAILED: NETWORK OFFLINE', isError: true);
      debugPrint('Evidence Upload Exception: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildActionButton(String label, IconData icon, Color color, VoidCallback? onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 60,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: onTap == null ? color.withValues(alpha: 0.3) : color,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: onTap == null ? Colors.white38 : Colors.white, size: 24),
              const SizedBox(height: 4),
              Text(label, style: TextStyle(color: onTap == null ? Colors.white38 : Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildStateActions(String status) {
    if (status == 'ASSIGNED') {
      return Row(
        children: [
          _buildActionButton('ACKNOWLEDGE', Icons.thumb_up, const Color(0xFF3B82F6), () => _updateStatus('ACKNOWLEDGED')),
        ],
      );
    } else if (status == 'ACKNOWLEDGED') {
      return Row(
        children: [
          _buildActionButton('START NAVIGATION / EN ROUTE', Icons.directions_car, const Color(0xFFF59E0B), () {
             _updateStatus('EN_ROUTE');
             _navigate();
          }),
        ],
      );
    } else if (status == 'EN_ROUTE') {
      return Row(
        children: [
          _buildActionButton('NAVIGATE', Icons.navigation, const Color(0xFF3B82F6), _navigate),
          _buildActionButton('ARRIVED', Icons.place, const Color(0xFF10B981), () => _updateStatus('ARRIVED')),
        ],
      );
    } else if (status == 'ARRIVED') {
      return Row(
        children: [
          _buildActionButton('CAPTURE EVIDENCE', Icons.camera_alt, const Color(0xFF3B82F6), _uploadEvidence),
          _buildActionButton('COMPLETE', Icons.check_circle, const Color(0xFFEF4444), () => _updateStatus('COMPLETED')),
        ],
      );
    }
    return Container();
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
                            decoration: BoxDecoration(color: _gpsStatus.contains('ACTIVE') || _gpsStatus.contains('SENT') ? const Color(0xFF10B981) : Colors.orange, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 8),
                          Text('UNIT: P-${user['id']?.toString().padLeft(3, '0') ?? '000'}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white, fontFamily: 'monospace')),
                          const Spacer(),
                          Text(_gpsStatus, style: TextStyle(fontSize: 10, color: _gpsStatus.contains('ERROR') || _gpsStatus.contains('FAIL') || _gpsStatus.contains('DENIED') ? const Color(0xFFEF4444) : const Color(0xFF10B981), fontWeight: FontWeight.bold, fontFamily: 'monospace')),
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
                                Text('ASSIGNMENT #${currentAssignment["id"]}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  color: currentAssignment["priority"] == 'CRITICAL' ? const Color(0xFFEF4444) : (currentAssignment["priority"] == 'HIGH' ? Colors.orange : const Color(0xFF10B981)),
                                  child: Text('PRIORITY: ${currentAssignment["priority"]}', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                )
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text('INCIDENT #${currentAssignment["incident"] ?? "UNKNOWN"}', style: const TextStyle(fontSize: 14, color: Colors.white, fontWeight: FontWeight.bold)),
                            if (currentAssignment["incident_details"] != null) 
                               Text('${currentAssignment["incident_details"]["title"]}', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                            const SizedBox(height: 8),
                            if (_assignmentDestination != null)
                              Text('Destination: ${_assignmentDestination!.latitude.toStringAsFixed(4)}, ${_assignmentDestination!.longitude.toStringAsFixed(4)}', style: const TextStyle(fontSize: 12, color: Colors.white, fontFamily: 'monospace')),
                            const SizedBox(height: 4),
                            Text('Instructions: ${currentAssignment["instructions"] ?? "None"}', style: const TextStyle(fontSize: 12, color: Colors.white)),
                            const SizedBox(height: 8),
                            Text('STATUS: ${currentAssignment["status"]}', style: TextStyle(fontSize: 14, color: currentAssignment["status"] == 'ARRIVED' ? const Color(0xFF10B981) : const Color(0xFF3B82F6), fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(currentAssignment["fir"] != null ? 'FIR LINKED: #${currentAssignment["fir"]}' : 'FIR: Not created (Optional)', style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontStyle: FontStyle.italic)),
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
                            mapController: _mapController,
                            options: MapOptions(
                              initialCenter: _assignmentDestination ?? _currentLocation ?? const LatLng(23.0225, 72.5714),
                              initialZoom: 14,
                              onMapReady: () {
                                _mapReady = true;
                                if (_assignmentDestination != null) {
                                  _mapController.move(_assignmentDestination!, 15.0);
                                }
                              },
                            ),
                            children: [
                              TileLayer(
                                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                                userAgentPackageName: 'com.example.cybersphere_mobile',
                                errorTileCallback: (tile, error, stackTrace) {
                                  debugPrint("Map tile failed to load: $error");
                                },
                              ),
                              MarkerLayer(
                                markers: [
                                  // Destination (Red Pin)
                                  if (_assignmentDestination != null)
                                    Marker(
                                      point: _assignmentDestination!,
                                      width: 40,
                                      height: 40,
                                      child: const Icon(Icons.location_on, color: Color(0xFFEF4444), size: 36),
                                    ),
                                  // Current Location (Blue Pulse)
                                  if (_currentLocation != null)
                                    Marker(
                                      point: _currentLocation!,
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
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // ACTIONS: Field Operations
                    if (hasAssignment)
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(
                          color: Color(0xFF1E293B),
                          border: Border(top: BorderSide(color: Color(0xFF334155))),
                        ),
                        child: Column(
                          children: [
                            _buildStateActions(currentAssignment["status"]),
                          ],
                        ),
                      ),
                  ],
                ),
    );
  }
}
