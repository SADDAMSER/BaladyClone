import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dreamflow_app/models/survey_models.dart';
import 'dart:async';
import 'package:dreamflow_app/screens/field_survey_screen.dart';
import 'package:dreamflow_app/services/location_service.dart';

class TaskDetailsScreen extends StatefulWidget {
  final SurveyTask task;

  const TaskDetailsScreen({super.key, required this.task});

  @override
  State<TaskDetailsScreen> createState() => _TaskDetailsScreenState();
}

class _TaskDetailsScreenState extends State<TaskDetailsScreen> {
  final MapController _mapController = MapController();
  Position? _currentPosition;
  bool _isLoadingLocation = false;
  String? _locationError;
  LatLng? _taskLocation;
  StreamSubscription<Position>? _positionSubscription;

  @override
  void initState() {
    super.initState();
    _initializeMap();
    _startLocationUpdates();
  }

  void _startLocationUpdates() {
    // Subscribe to real-time location updates
    _positionSubscription = LocationService.instance.positionStream.listen((Position position) {
      if (mounted) {
        setState(() {
          _currentPosition = position;
        });
      }
    });
  }

  Future<void> _initializeMap() async {
    setState(() {
      _isLoadingLocation = true;
      _locationError = null;
    });

    // Get current GPS location
    final locationResult = await LocationService.instance.getCurrentLocation();
    
    if (mounted) {
      setState(() {
        _isLoadingLocation = false;
        if (locationResult.isSuccess && locationResult.position != null) {
          _currentPosition = locationResult.position;
          // Parse task location if available (assuming Yemen coordinates)
          _taskLocation = _parseTaskLocation();
          
          // Start continuous location updates for real-time positioning
          LocationService.instance.startLocationUpdates();
        } else {
          _locationError = locationResult.error;
        }
      });
    }
  }

  LatLng? _parseTaskLocation() {
    // Try to parse coordinates from task location string
    final locationStr = widget.task.location;
    
    // Enhanced coordinate parsing for various formats
    // Handles: "15.3544, 44.2066", "15.3544 44.2066", "15°21'15.84\"N, 44°12'23.76\"E", etc.
    final List<RegExp> patterns = [
      // Decimal degrees: 15.3544, 44.2066 or 15.3544 44.2066
      RegExp(r'(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)'),
      // Degrees with symbols: 15.3544° 44.2066°
      RegExp(r'(-?\d+\.?\d*)°[,\s]*(-?\d+\.?\d*)°'),
      // DMS format: 15°21'15.84"N 44°12'23.76"E (basic extraction)
      RegExp(r'(\d+)°\d+\'\d+\.?\d*\"[NS][,\s]*(\d+)°\d+\'\d+\.?\d*\"[EW]'),
    ];
    
    for (final pattern in patterns) {
      final match = pattern.firstMatch(locationStr);
      if (match != null) {
        final coord1 = double.tryParse(match.group(1) ?? '');
        final coord2 = double.tryParse(match.group(2) ?? '');
        
        if (coord1 != null && coord2 != null) {
          // Determine which is lat and which is lng based on Yemen bounds
          late double lat, lng;
          
          // Yemen bounds: lat 12-19°N, lng 42-54°E
          if (coord1 >= 12.0 && coord1 <= 19.0 && coord2 >= 42.0 && coord2 <= 54.0) {
            lat = coord1; lng = coord2; // Standard lat, lng order
          } else if (coord2 >= 12.0 && coord2 <= 19.0 && coord1 >= 42.0 && coord1 <= 54.0) {
            lat = coord2; lng = coord1; // Reversed lng, lat order
          } else {
            continue; // Try next pattern
          }
          
          return LatLng(lat, lng);
        }
      }
    }
    
    // If no coordinates found in text, show warning but don't default to Sana'a
    debugPrint('⚠️ لا يمكن استخراج إحداثيات صحيحة من موقع المهمة: $locationStr');
    return null; // Return null to indicate no task location available
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('تفاصيل المهمة'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'معلومات المواطن',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _InfoRow('الاسم', widget.task.citizenName),
                    _InfoRow('الموقع', widget.task.location),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Map Section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.map, color: theme.primaryColor),
                        const SizedBox(width: 8),
                        Text(
                          'خريطة الموقع',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        if (_isLoadingLocation)
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (_locationError != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          border: Border.all(color: Colors.red.shade200),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error, color: Colors.red.shade600),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _locationError!.split('|')[0], // Display only message part
                                style: TextStyle(color: Colors.red.shade800),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _initializeMap,
                              icon: const Icon(Icons.refresh, size: 18),
                              label: const Text('إعادة المحاولة'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: theme.primaryColor,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                          if (_locationError!.contains('OPEN_SETTINGS')) ...[
                            const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () => Geolocator.openAppSettings(),
                                icon: const Icon(Icons.settings, size: 18),
                                label: const Text('الإعدادات'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.orange,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                            ),
                          ],
                          if (_locationError!.contains('ENABLE_LOCATION')) ...[
                            const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () => Geolocator.openLocationSettings(),
                                icon: const Icon(Icons.location_on, size: 18),
                                label: const Text('تفعيل GPS'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ] else ...[
                      Container(
                        height: 250,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: FlutterMap(
                            mapController: _mapController,
                            options: MapOptions(
                              initialCenter: _currentPosition != null
                                  ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
                                  : _taskLocation ?? const LatLng(15.3548, 44.2066), // Default to Sana'a
                              initialZoom: 15.0,
                              minZoom: 5.0,
                              maxZoom: 18.0,
                            ),
                            children: [
                              TileLayer(
                                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                userAgentPackageName: 'com.yemen.construction.surveyor',
                              ),
                              MarkerLayer(
                                markers: _buildMapMarkers(),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildLocationInfo(),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'معلومات المهمة',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _InfoRow('رقم المهمة', widget.task.id),
                    _InfoRow('الحالة', widget.task.status),
                    _InfoRow('تاريخ الإنشاء', _formatDate(widget.task.createdAt)),
                    if (widget.task.completedAt != null)
                      _InfoRow('تاريخ الإكمال', _formatDate(widget.task.completedAt!)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            if (widget.task.status != 'مكتمل')
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => FieldSurveyScreen(task: widget.task),
                      ),
                    );
                  },
                  icon: const Icon(Icons.location_on),
                  label: const Text('بدء الرفع الميداني'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.all(16),
                    textStyle: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  List<Marker> _buildMapMarkers() {
    List<Marker> markers = [];

    // Current location marker (blue)
    if (_currentPosition != null) {
      markers.add(
        Marker(
          point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          width: 40,
          height: 40,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.blue,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.blue.withOpacity(0.3),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(
              Icons.my_location,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      );
    }

    // Task location marker (red)
    if (_taskLocation != null) {
      markers.add(
        Marker(
          point: _taskLocation!,
          width: 40,
          height: 40,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.red,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.red.withOpacity(0.3),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(
              Icons.location_on,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      );
    }

    return markers;
  }

  Widget _buildLocationInfo() {
    return Column(
      children: [
        if (_currentPosition != null) ...[
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: const BoxDecoration(
                  color: Colors.blue,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'الموقع الحالي',
                      style: TextStyle(fontWeight: FontWeight.w500),
                    ),
                    Text(
                      LocationService.instance.formatCoordinates(
                        _currentPosition!.latitude,
                        _currentPosition!.longitude,
                      ),
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    Text(
                      'الدقة: ${_currentPosition!.accuracy.toStringAsFixed(1)} م (${LocationService.instance.getAccuracyDescription(_currentPosition!.accuracy)})',
                      style: TextStyle(
                        fontSize: 12,
                        color: LocationService.instance.isSuitableForSurveying(_currentPosition!)
                            ? Colors.green.shade600
                            : Colors.orange.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        if (_taskLocation != null) ...[
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: const BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'موقع المهمة',
                      style: TextStyle(fontWeight: FontWeight.w500),
                    ),
                    Text(
                      LocationService.instance.formatCoordinates(
                        _taskLocation!.latitude,
                        _taskLocation!.longitude,
                      ),
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    if (_currentPosition != null) ...[
                      Text(
                        'المسافة: ${LocationService.instance.calculateDistance(_currentPosition!.latitude, _currentPosition!.longitude, _taskLocation!.latitude, _taskLocation!.longitude).toStringAsFixed(0)} متر',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue.shade600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
        // Map control buttons with RTL support
        Directionality(
          textDirection: TextDirection.rtl,
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _currentPosition != null
                      ? () => _mapController.move(
                            LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                            16.0,
                          )
                      : null,
                  icon: const Icon(Icons.my_location, size: 18),
                  label: const Text('موقعي'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade50,
                    foregroundColor: Colors.blue.shade700,
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (_taskLocation != null)
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _mapController.move(_taskLocation!, 16.0),
                    icon: const Icon(Icons.location_on, size: 18),
                    label: const Text('المهمة'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red.shade50,
                      foregroundColor: Colors.red.shade700,
                      elevation: 0,
                    ),
                  ),
                ),
              if (_taskLocation == null)
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.info_outline, size: 16, color: Colors.grey.shade600),
                        const SizedBox(width: 4),
                        Text(
                          'لا توجد إحداثيات للمهمة',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _initializeMap,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('تحديث'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.grey.shade50,
                    foregroundColor: Colors.grey.shade700,
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    LocationService.instance.stopLocationUpdates();
    _positionSubscription?.cancel();
    super.dispose();
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}