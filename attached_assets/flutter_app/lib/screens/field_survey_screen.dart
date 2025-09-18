import 'dart:math';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dreamflow_app/models/survey_models.dart';
import 'package:dreamflow_app/models/updated_survey_models.dart';
import 'package:dreamflow_app/models/geojson_models.dart';
import 'package:dreamflow_app/services/updated_database_service.dart';
import 'package:dreamflow_app/services/location_service.dart';
import 'package:dreamflow_app/services/sync_service.dart';
import 'package:dreamflow_app/widgets/gnss_status_panel.dart';

class FieldSurveyScreen extends StatefulWidget {
  final SurveyTask task;

  const FieldSurveyScreen({super.key, required this.task});

  @override
  State<FieldSurveyScreen> createState() => _FieldSurveyScreenState();
}

class _FieldSurveyScreenState extends State<FieldSurveyScreen> {
  // GNSS simulated state
  String _gnssStatusLabel = 'Disconnected';
  String _accuracyLabel = '-';
  String _hdop = '-';
  String _vdop = '-';

  // Feature coding and tool
  String _activeTool = 'Polygon'; // Polygon, Line, Point
  String? _selectedFeatureCode; // مبنى، سياج، شجرة ...

  // Geometry capture state (for Polygon/Line)
  final List<GeoJSONPosition> _currentPoints = [];
  bool _polygonClosed = false;
  String? _savedGeometryId;
  
  // Map and location state
  final MapController _mapController = MapController();
  Position? _currentPosition;
  StreamSubscription<Position>? _positionSubscription;
  
  // Yemen default center coordinates (Sanaa)
  LatLng _mapCenter = const LatLng(15.3694, 44.1910);

  // Attachment and notes
  final TextEditingController _noteController = TextEditingController();
  String? _attachedPhotoUrl;

  @override
  void initState() {
    super.initState();
    _initializeLocation();
  }

  @override
  void dispose() {
    _noteController.dispose();
    _positionSubscription?.cancel();
    LocationService.instance.stopLocationUpdates();
    super.dispose();
  }
  
  /// Initialize location services and GPS
  Future<void> _initializeLocation() async {
    final locationResult = await LocationService.instance.getCurrentLocation();
    if (locationResult.isSuccess && mounted) {
      setState(() {
        _currentPosition = locationResult.position;
        if (_currentPosition != null) {
          _mapCenter = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
          _mapController.move(_mapCenter, 18.0);
        }
      });
      
      // Start continuous location updates
      final started = await LocationService.instance.startLocationUpdates();
      if (started) {
        _positionSubscription = LocationService.instance.positionStream.listen((position) {
          if (mounted) {
            setState(() {
              _currentPosition = position;
              _gnssStatusLabel = _getGnssStatusFromPosition(position);
              _accuracyLabel = '${position.accuracy.toStringAsFixed(1)}م';
              // Real HDOP/VDOP would come from GNSS hardware - simulating based on accuracy
              _hdop = (position.accuracy / 2).toStringAsFixed(1);
              _vdop = (position.accuracy / 1.5).toStringAsFixed(1);
            });
          }
        });
      }
    }
  }
  
  /// Get GNSS status description from position accuracy
  String _getGnssStatusFromPosition(Position position) {
    if (position.accuracy <= 1.0) {
      return 'RTK Fixed';
    } else if (position.accuracy <= 3.0) {
      return 'DGPS';
    } else if (position.accuracy <= 10.0) {
      return 'GPS';
    } else {
      return 'Low Accuracy';
    }
  }
  
  /// Capture a real GPS point using LocationService
  Future<void> _captureRealGPSPoint(LatLng? tapLocation) async {
    try {
      final locationResult = await LocationService.instance.getCurrentLocation();
      
      if (!locationResult.isSuccess) {
        _showSnack('فشل في الحصول على الموقع: ${locationResult.errorMessage}');
        return;
      }
      
      final position = locationResult.position!;
      
      // Check if accuracy is suitable for surveying
      if (!LocationService.instance.isSuitableForSurveying(position)) {
        final proceed = await _showAccuracyWarning(position.accuracy);
        if (!proceed) return;
      }
      
      final surveyPoint = SurveyPoint(
        id: 'point_${DateTime.now().millisecondsSinceEpoch}',
        sessionId: widget.task.id,
        pointNumber: await _getNextPointNumber(),
        position: GeoJSONPosition(
          longitude: position.longitude,
          latitude: position.latitude,
          elevation: position.altitude,
        ),
        accuracy: position.accuracy,
        hdop: double.tryParse(_hdop) ?? 999.0,
        vdop: double.tryParse(_vdop) ?? 999.0,
        satelliteCount: 12, // Would come from GNSS hardware in real implementation
        pointType: 'survey',
        featureCode: _selectedFeatureCode!,
        description: 'نقطة مسح ميداني - ${_selectedFeatureCode}',
        capturedAt: DateTime.now(),
        createdAt: DateTime.now(),
        isSynced: false,
        idempotencyKey: 'point_${widget.task.id}_${DateTime.now().millisecondsSinceEpoch}',
      );
      
      UpdatedDatabaseService.savePoint(surveyPoint);
      _showSnack('تم حفظ النقطة بدقة ${position.accuracy.toStringAsFixed(1)} متر');
      
    } catch (e) {
      _showSnack('خطأ في حفظ النقطة: $e');
    }
  }
  
  /// Get next point number for the session
  Future<int> _getNextPointNumber() async {
    final existingPoints = UpdatedDatabaseService.getPointsBySession(widget.task.id);
    return existingPoints.length + 1;
  }
  
  /// Show accuracy warning dialog
  Future<bool> _showAccuracyWarning(double accuracy) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('تحذير دقة الموقع'),
        content: Text(
          'دقة الموقع الحالية ${accuracy.toStringAsFixed(1)} متر.\n'
          'هذا قد يؤثر على جودة المسح. هل تريد المتابعة؟'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('إلغاء'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('متابعة'),
          ),
        ],
      ),
    ) ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('رفع المهمة ${widget.task.id}'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: 'مزامنة',
            onPressed: () => SyncService.syncTask(widget.task.id),
            icon: const Icon(Icons.cloud_upload),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.developer_mode),
            onSelected: _handleDevAction,
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'rtk', child: Text('Sim: RTK Fixed (0.02m, HDOP 0.8, VDOP 1.1)')),
              PopupMenuItem(value: 'disconnect', child: Text('Sim: Disconnect GNSS')),
              PopupMenuItem(value: 'clear', child: Text('Clear current geometry')),
              PopupMenuItem(value: 'simulate_happy', child: Text('Simulate Happy Path + Sync')),
            ],
          ),
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: GNSSStatusPanel(statusLabel: _gnssStatusLabel, accuracyLabel: _accuracyLabel, hdop: _hdop, vdop: _vdop),
        ),
        _TaskHeader(task: widget.task),
        const SizedBox(height: 8),
        _FeatureCodingBar(
          activeTool: _activeTool,
          selectedCode: _selectedFeatureCode,
          onToolTap: (tool) => setState(() {
            _activeTool = tool;
            _selectedFeatureCode = null;
            _currentPoints.clear();
            _polygonClosed = false;
          }),
          onCodeTap: (code) => setState(() => _selectedFeatureCode = code),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: _MapCard(
              mapController: _mapController,
              currentPosition: _currentPosition,
              mapCenter: _mapCenter,
              currentPoints: _currentPoints,
              closed: _activeTool == 'Polygon' ? _polygonClosed : false,
              onMapTap: (latLng) async {
                if (_selectedFeatureCode == null) {
                  _showSnack('اختر كود المَعْلَم أولاً');
                  return;
                }
                
                if (_activeTool == 'Point') {
                  await _captureRealGPSPoint(latLng);
                  return;
                }

                if (_currentPoints.isEmpty) {
                  final startFromDialog = await _askStartPoint();
                  if (startFromDialog == null) return;
                  if (startFromDialog == 'gnss') {
                    if (_currentPosition != null) {
                      final gpsPosition = GeoJSONPosition(
                        longitude: _currentPosition!.longitude,
                        latitude: _currentPosition!.latitude,
                        elevation: _currentPosition!.altitude,
                      );
                      setState(() => _currentPoints.add(gpsPosition));
                    } else {
                      _showSnack('موقع GPS غير متوفر');
                      return;
                    }
                  } else {
                    final tapPosition = GeoJSONPosition(
                      longitude: latLng.longitude,
                      latitude: latLng.latitude,
                    );
                    setState(() => _currentPoints.add(tapPosition));
                  }
                } else {
                  final tapPosition = GeoJSONPosition(
                    longitude: latLng.longitude,
                    latitude: latLng.latitude,
                  );
                  setState(() => _currentPoints.add(tapPosition));
                }
              },
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _activeTool == 'Point' ? null : (_currentPoints.isNotEmpty ? (_activeTool == 'Polygon' ? _finishPolygon : _finishLine) : null),
                icon: const Icon(Icons.done),
                label: const Text('إنهاء'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _currentPoints.isNotEmpty ? _undoLastPoint : null,
                icon: const Icon(Icons.undo),
                label: const Text('تراجع'),
              ),
            ),
          ]),
        ),
        if (_savedGeometryId != null)
          _AttachmentSection(noteController: _noteController, attachedUrl: _attachedPhotoUrl, onAttachPhoto: _attachSamplePhoto, onSaveNote: _saveNote),
      ]),
    );
  }

  Size _canvasSize(BuildContext context) {
    final mq = MediaQuery.of(context);
    return Size(mq.size.width - 24, max(180, mq.size.height * 0.35));
  }

  // Map canvas pixel to a plausible lat/lng around Sana'a for simulation
  Offset _mapCanvasToLatLng(Offset local, BuildContext context) {
    final size = _canvasSize(context);
    final double minLng = 44.18, maxLng = 44.25; // x -> lng
    final double minLat = 15.30, maxLat = 15.35; // y -> lat (invert Y)
    final double lng = minLng + (local.dx.clamp(0, size.width) / size.width) * (maxLng - minLng);
    final double lat = maxLat - (local.dy.clamp(0, size.height) / size.height) * (maxLat - minLat);
    return Offset(lng, lat);
  }

  void _handleDevAction(String value) {
    if (value == 'rtk') {
      setState(() {
        _gnssStatusLabel = 'RTK Fixed';
        _accuracyLabel = '0.02m';
        _hdop = '0.8';
        _vdop = '1.1';
      });
      _showSnack('تم ضبط GNSS على RTK Fixed');
    } else if (value == 'disconnect') {
      setState(() {
        _gnssStatusLabel = 'Disconnected';
        _accuracyLabel = '-';
        _hdop = '-';
        _vdop = '-';
      });
      _showSnack('GNSS غير متصل');
    } else if (value == 'clear') {
      setState(() {
        _currentPoints.clear();
        _polygonClosed = false;
        _savedGeometryId = null;
        _attachedPhotoUrl = null;
        _noteController.clear();
      });
    } else if (value == 'simulate_happy') {
      _simulateHappyPath();
    }
  }

  Future<String?> _askStartPoint() async {
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('اختيار نقطة البداية'),
        content: const Text('كيف ترغب بتحديد نقطة البداية؟'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop('gnss'), child: const Text('موقع GNSS الحالي')),
          TextButton(onPressed: () => Navigator.of(context).pop('tap'), child: const Text('اختيار من الخريطة')),
        ],
      ),
    );
  }

  Future<void> _finishPolygon() async {
    final choice = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('خيارات إنهاء المضلع'),
        content: const Text('اختر كيفية إنهاء المضلع:'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop('end'),
            child: const Text('نقطة نهاية وإبقاء المضلع مفتوحًا'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop('close'),
            child: const Text('نقطة إغلاق وربطها بالبداية'),
          ),
        ],
      ),
    );
    if (choice == null) return;
    setState(() => _polygonClosed = choice == 'close');

    try {
      // Create GeoJSON polygon from captured points
      final List<GeoJSONPosition> coordinates = List.from(_currentPoints);
      if (_polygonClosed && coordinates.isNotEmpty) {
        // Close the polygon by adding the first point at the end
        coordinates.add(coordinates.first);
      }
      
      final polygon = GeoJSONPolygon([coordinates]);
      
      final surveyGeometry = SurveyGeometry(
        id: 'geom_${DateTime.now().millisecondsSinceEpoch}',
        sessionId: widget.task.id,
        geometryType: 'polygon',
        geometry: polygon,
        featureCode: _selectedFeatureCode ?? 'غير محدد',
        properties: {
          'closed': _polygonClosed,
          'pointCount': _currentPoints.length,
          'capturedBy': 'mobile_surveyor',
        },
        accuracy: _currentPosition?.accuracy ?? 999.0,
        capturedAt: DateTime.now(),
        createdAt: DateTime.now(),
        isSynced: false,
        idempotencyKey: 'geom_${widget.task.id}_${DateTime.now().millisecondsSinceEpoch}',
      );
      
      UpdatedDatabaseService.saveGeometry(surveyGeometry);
      setState(() => _savedGeometryId = surveyGeometry.id);
      
      _showSnack('تم حفظ المضلع (${_selectedFeatureCode ?? ''}) محلياً');
      
    } catch (e) {
      _showSnack('خطأ في حفظ المضلع: $e');
    }
    _currentPoints.clear();
    _polygonClosed = false;
  }

  Future<void> _finishLine() async {
    if (_currentPoints.length < 2) {
      _showSnack('أضف نقطتين على الأقل للخط');
      return;
    }
    try {
      final lineString = GeoJSONLineString(_currentPoints);
      
      final surveyGeometry = SurveyGeometry(
        id: 'geom_${DateTime.now().millisecondsSinceEpoch}',
        sessionId: widget.task.id,
        geometryType: 'linestring',
        geometry: lineString,
        featureCode: _selectedFeatureCode ?? 'غير محدد',
        properties: {
          'pointCount': _currentPoints.length,
          'capturedBy': 'mobile_surveyor',
        },
        accuracy: _currentPosition?.accuracy ?? 999.0,
        capturedAt: DateTime.now(),
        createdAt: DateTime.now(),
        isSynced: false,
        idempotencyKey: 'geom_${widget.task.id}_${DateTime.now().millisecondsSinceEpoch}',
      );
      
      UpdatedDatabaseService.saveGeometry(surveyGeometry);
      _showSnack('تم حفظ الخط (${_selectedFeatureCode ?? ''}) محلياً');
      
    } catch (e) {
      _showSnack('خطأ في حفظ الخط: $e');
    }
    _currentPoints.clear();
  }

  void _undoLastPoint() {
    if (_currentPoints.isEmpty) return;
    setState(() {
      _currentPoints.removeLast();
      _polygonClosed = false;
    });
  }

  Future<void> _attachSamplePhoto() async {
    if (_savedGeometryId == null) {
      _showSnack('احفظ الشكل الهندسي أولاً');
      return;
    }
    
    try {
      const sampleUrl = 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=600&q=60';
      
      final attachment = SurveyAttachment(
        id: 'att_${DateTime.now().millisecondsSinceEpoch}',
        sessionId: widget.task.id,
        geometryId: _savedGeometryId,
        attachmentType: 'photo',
        filePath: sampleUrl,
        fileSize: 1024 * 500, // Simulated 500KB
        mimeType: 'image/jpeg',
        description: _noteController.text.isNotEmpty ? _noteController.text : 'صورة ميدانية',
        location: _currentPosition != null 
          ? GeoJSONPosition(
              longitude: _currentPosition!.longitude,
              latitude: _currentPosition!.latitude,
              elevation: _currentPosition!.altitude,
            )
          : null,
        capturedAt: DateTime.now(),
        createdAt: DateTime.now(),
        isSynced: false,
        idempotencyKey: 'att_${widget.task.id}_${DateTime.now().millisecondsSinceEpoch}',
      );
      
      UpdatedDatabaseService.saveAttachment(attachment);
      setState(() => _attachedPhotoUrl = sampleUrl);
      _showSnack('تم إرفاق صورة للشكل الهندسي');
      
    } catch (e) {
      _showSnack('خطأ في إرفاق الصورة: $e');
    }
  }

  Future<void> _saveNote() async {
    if (_savedGeometryId == null) {
      _showSnack('احفظ الشكل الهندسي أولاً');
      return;
    }
    final noteText = _noteController.text.trim();
    if (noteText.isEmpty) {
      _showSnack('أدخل الملاحظة');
      return;
    }
    
    try {
      final attachment = SurveyAttachment(
        id: 'note_${DateTime.now().millisecondsSinceEpoch}',
        sessionId: widget.task.id,
        geometryId: _savedGeometryId,
        attachmentType: 'note',
        filePath: '',
        fileSize: noteText.length,
        mimeType: 'text/plain',
        description: noteText,
        location: _currentPosition != null 
          ? GeoJSONPosition(
              longitude: _currentPosition!.longitude,
              latitude: _currentPosition!.latitude,
              elevation: _currentPosition!.altitude,
            )
          : null,
        capturedAt: DateTime.now(),
        createdAt: DateTime.now(),
        isSynced: false,
        idempotencyKey: 'note_${widget.task.id}_${DateTime.now().millisecondsSinceEpoch}',
      );
      
      UpdatedDatabaseService.saveAttachment(attachment);
      _showSnack('تم حفظ الملاحظة');
      
    } catch (e) {
      _showSnack('خطأ في حفظ الملاحظة: $e');
    }
  }

  Future<void> _simulateHappyPath() async {
    try {
      // Simulate building polygon with GeoJSON
      final buildingCoords = [
        const GeoJSONPosition(longitude: 44.21987, latitude: 15.34123),
        const GeoJSONPosition(longitude: 44.21997, latitude: 15.34123), 
        const GeoJSONPosition(longitude: 44.21997, latitude: 15.34133),
        const GeoJSONPosition(longitude: 44.21987, latitude: 15.34133),
        const GeoJSONPosition(longitude: 44.21987, latitude: 15.34123), // Close
      ];
      
      final buildingGeometry = SurveyGeometry(
        id: 'geom_${DateTime.now().millisecondsSinceEpoch}',
        sessionId: widget.task.id,
        geometryType: 'polygon',
        geometry: GeoJSONPolygon([buildingCoords]),
        featureCode: 'مبنى',
        properties: {
          'simulated': true,
          'pointCount': buildingCoords.length - 1,
          'capturedBy': 'simulation',
        },
        accuracy: 0.02,
        capturedAt: DateTime.now(),
        createdAt: DateTime.now(),
        isSynced: false,
        idempotencyKey: 'sim_geom_${widget.task.id}_${DateTime.now().millisecondsSinceEpoch}',
      );
      
      UpdatedDatabaseService.saveGeometry(buildingGeometry);

      // Simulate fence line
      final fenceCoords = [
        const GeoJSONPosition(longitude: 44.21980, latitude: 15.34140),
        const GeoJSONPosition(longitude: 44.22000, latitude: 15.34145),
      ];
      
      final fenceGeometry = SurveyGeometry(
        id: 'geom_${DateTime.now().millisecondsSinceEpoch + 1}',
        sessionId: widget.task.id,
        geometryType: 'linestring',
        geometry: GeoJSONLineString(fenceCoords),
        featureCode: 'سياج',
        properties: {
          'simulated': true,
          'pointCount': fenceCoords.length,
          'capturedBy': 'simulation',
        },
        accuracy: 0.02,
        capturedAt: DateTime.now(),
        createdAt: DateTime.now(),
        isSynced: false,
        idempotencyKey: 'sim_geom_${widget.task.id}_${DateTime.now().millisecondsSinceEpoch + 1}',
      );
      
      UpdatedDatabaseService.saveGeometry(fenceGeometry);

      // Simulate tree point
      final treePoint = SurveyPoint(
        id: 'point_${DateTime.now().millisecondsSinceEpoch}',
        sessionId: widget.task.id,
        pointNumber: 1,
        position: const GeoJSONPosition(
          longitude: 44.21990,
          latitude: 15.34130,
          elevation: 2200.0,
        ),
        accuracy: 0.02,
        hdop: 0.8,
        vdop: 1.1,
        satelliteCount: 14,
        pointType: 'survey',
        featureCode: 'شجرة',
        description: 'نقطة محاكاة - شجرة',
        capturedAt: DateTime.now(),
        createdAt: DateTime.now(),
        isSynced: false,
        idempotencyKey: 'sim_point_${widget.task.id}_${DateTime.now().millisecondsSinceEpoch}',
      );
      
      UpdatedDatabaseService.savePoint(treePoint);

      // Trigger sync (prints payload to logs)
      await SyncService.syncTask(widget.task.id);
      if (!mounted) return;
      _showSnack('تمت محاكاة المسار السعيد مع نماذج GeoJSON الجديدة');
      
    } catch (e) {
      _showSnack('خطأ في محاكاة المسار: $e');
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }
}

class _TaskHeader extends StatelessWidget {
  final SurveyTask task;
  const _TaskHeader({required this.task});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      color: theme.colorScheme.primaryContainer,
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(task.citizenName, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
        Text(task.location, style: theme.textTheme.bodyMedium, overflow: TextOverflow.ellipsis),
      ]),
    );
  }
}

class _FeatureCodingBar extends StatelessWidget {
  final String activeTool;
  final String? selectedCode;
  final ValueChanged<String> onToolTap;
  final ValueChanged<String> onCodeTap;
  const _FeatureCodingBar({required this.activeTool, required this.selectedCode, required this.onToolTap, required this.onCodeTap});

  @override
  Widget build(BuildContext context) {
    final polygonCodes = [
      _Code('مبنى', Icons.house_siding),
      _Code('أرض فضاء', Icons.terrain),
      _Code('عريم', Icons.crop_square),
    ];
    final lineCodes = [
      _Code('سياج', Icons.commit),
      _Code('رصيف', Icons.horizontal_rule),
      _Code('طريق', Icons.alt_route),
    ];
    final pointCodes = [
      _Code('شجرة', Icons.nature),
      _Code('منهل', Icons.water_drop),
      _Code('عمود', Icons.electric_bolt),
    ];
    final codes = activeTool == 'Polygon' ? polygonCodes : activeTool == 'Line' ? lineCodes : pointCodes;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(children: [
        _ChipButton(label: 'Polygon', icon: Icons.timeline, selected: activeTool == 'Polygon', onTap: () => onToolTap('Polygon')),
        const SizedBox(width: 6),
        _ChipButton(label: 'Line', icon: Icons.polyline, selected: activeTool == 'Line', onTap: () => onToolTap('Line')),
        const SizedBox(width: 6),
        _ChipButton(label: 'Point', icon: Icons.place, selected: activeTool == 'Point', onTap: () => onToolTap('Point')),
        const SizedBox(width: 8),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              for (final c in codes) _ChipButton(label: c.label, selected: selectedCode == c.label, onTap: () => onCodeTap(c.label), icon: c.icon),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _Code {
  final String label;
  final IconData icon;
  _Code(this.label, this.icon);
}

class _ChipButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;
  const _ChipButton({required this.label, required this.selected, required this.onTap, this.icon});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(start: 6),
      child: ChoiceChip(
        label: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 6)],
          Text(label),
        ]),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}

/// Interactive map card using FlutterMap for real GPS survey
class _MapCard extends StatelessWidget {
  final MapController mapController;
  final Position? currentPosition;
  final LatLng mapCenter;
  final List<GeoJSONPosition> currentPoints;
  final bool closed;
  final ValueChanged<LatLng> onMapTap;
  
  const _MapCard({
    required this.mapController,
    required this.currentPosition,
    required this.mapCenter,
    required this.currentPoints,
    required this.closed,
    required this.onMapTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12), 
        side: BorderSide(color: Colors.grey.withValues(alpha: 0.2))
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          height: max(220, MediaQuery.of(context).size.height * 0.4),
          child: FlutterMap(
            mapController: mapController,
            options: MapOptions(
              initialCenter: mapCenter,
              initialZoom: 18.0,
              minZoom: 10.0,
              maxZoom: 22.0,
              onTap: (tapPosition, point) => onMapTap(point),
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
              ),
            ),
            children: [
              // Base map tiles (OpenStreetMap)
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.dreamflow.survey',
                maxNativeZoom: 19,
              ),
              
              // Current GPS position marker
              if (currentPosition != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: LatLng(currentPosition!.latitude, currentPosition!.longitude),
                      width: 24,
                      height: 24,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.blue,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.3),
                              blurRadius: 3,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.my_location, size: 16, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              
              // Accuracy circle for current position
              if (currentPosition != null)
                CircleLayer(
                  circles: [
                    CircleMarker(
                      point: LatLng(currentPosition!.latitude, currentPosition!.longitude),
                      radius: currentPosition!.accuracy,
                      useRadiusInMeter: true,
                      color: Colors.blue.withValues(alpha: 0.1),
                      borderColor: Colors.blue.withValues(alpha: 0.3),
                      borderStrokeWidth: 1,
                    ),
                  ],
                ),
              
              // Survey points being captured
              if (currentPoints.isNotEmpty)
                MarkerLayer(
                  markers: currentPoints.asMap().entries.map((entry) {
                    final index = entry.key;
                    final point = entry.value;
                    return Marker(
                      point: LatLng(point.latitude, point.longitude),
                      width: 24,
                      height: 24,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: Center(
                          child: Text(
                            '${index + 1}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              
              // Polygon/Line visualization
              if (currentPoints.length >= 2)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: currentPoints.map((p) => LatLng(p.latitude, p.longitude)).toList(),
                      color: Colors.blue,
                      strokeWidth: 2,
                    ),
                    // Close polygon if needed
                    if (closed && currentPoints.length >= 3)
                      Polyline(
                        points: [
                          LatLng(currentPoints.last.latitude, currentPoints.last.longitude),
                          LatLng(currentPoints.first.latitude, currentPoints.first.longitude),
                        ],
                        color: Colors.blue,
                        strokeWidth: 2,
                        isDotted: true,
                      ),
                  ],
                ),
              
              // Polygon fill
              if (closed && currentPoints.length >= 3)
                PolygonLayer(
                  polygons: [
                    Polygon(
                      points: currentPoints.map((p) => LatLng(p.latitude, p.longitude)).toList(),
                      color: Colors.blue.withValues(alpha: 0.15),
                      borderColor: Colors.blue,
                      borderStrokeWidth: 2,
                    ),
                  ],
                ),
              
              // Overlay with map info
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    currentPoints.isEmpty
                        ? 'انقر على الخريطة لإضافة نقاط'
                        : 'النقاط: ${currentPoints.length}${closed ? ' (مغلق)' : ''}',
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AttachmentSection extends StatelessWidget {
  final TextEditingController noteController;
  final String? attachedUrl;
  final VoidCallback onAttachPhoto;
  final VoidCallback onSaveNote;
  const _AttachmentSection({required this.noteController, required this.attachedUrl, required this.onAttachPhoto, required this.onSaveNote});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.grey.withValues(alpha: 0.06),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('المرفقات والملاحظات', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (attachedUrl != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(attachedUrl!, height: 140, width: double.infinity, fit: BoxFit.cover),
          ),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: TextField(
              controller: noteController,
              decoration: const InputDecoration(labelText: 'ملاحظة', border: OutlineInputBorder()),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(onPressed: onSaveNote, icon: const Icon(Icons.note_add), label: const Text('حفظ ملاحظة')),
        ]),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(onPressed: onAttachPhoto, icon: const Icon(Icons.photo_camera), label: const Text('إرفاق صورة')),
        )
      ]),
    );
  }
}
