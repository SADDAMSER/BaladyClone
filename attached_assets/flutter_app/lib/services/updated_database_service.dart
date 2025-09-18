/// Updated Database Service for GeoJSON-enabled Survey Models
/// Aligned with Yemen Digital Construction Platform server schema

import 'package:dreamflow_app/models/updated_survey_models.dart';
import 'package:dreamflow_app/models/geojson_models.dart';

class UpdatedDatabaseService {
  // Static data storage - In production, use Hive or SQLite
  static final List<SurveyTask> _tasks = [];
  static final List<SurveyPoint> _points = [];
  static final List<SurveyGeometry> _geometries = [];
  static final List<SurveyAttachment> _attachments = [];
  
  static bool _isInitialized = false;

  /// Initialize the database service with sample data
  static Future<void> init() async {
    if (_isInitialized) return;
    _isInitialized = true;
    
    // Initialize with sample Yemen survey data
    await _loadSampleData();
  }

  /// Load sample survey data for Yemen locations
  static Future<void> _loadSampleData() async {
    // Sample tasks with proper session format
    _tasks.addAll([
      SurveyTask(
        id: 'session_001',
        sessionNumber: 'YE-2025-SNB-001',
        applicationId: 'app_001',
        citizenName: 'أحمد محمد الحميدي',
        location: 'صنعاء - حي السبعين - شارع الزبيري',
        status: 'assigned',
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
        surveyBounds: _createSampleBounds(15.3694, 44.1910), // Sanaa coordinates
        notes: 'مسح لقطعة أرض سكنية - مساحة مقدرة 400 متر مربع',
        metadata: {'priority': 'high', 'expectedDuration': 'half_day'},
      ),
      SurveyTask(
        id: 'session_002',
        sessionNumber: 'YE-2025-ADN-002',
        applicationId: 'app_002',
        citizenName: 'فاطمة علي السالمي',
        location: 'عدن - المعلا - شارع البحر',
        status: 'in_progress',
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        startedAt: DateTime.now().subtract(const Duration(hours: 8)),
        surveyBounds: _createSampleBounds(12.7797, 45.0365), // Aden coordinates
        notes: 'مسح تجاري لمحل على شارع رئيسي',
        metadata: {'priority': 'medium', 'surveyorId': 'surveyor_01'},
      ),
      SurveyTask(
        id: 'session_003',
        sessionNumber: 'YE-2025-TAZ-003',
        applicationId: 'app_003',
        citizenName: 'محمد سالم الزبيدي',
        location: 'تعز - صالة - حي الشموع',
        status: 'completed',
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
        startedAt: DateTime.now().subtract(const Duration(days: 1, hours: 6)),
        completedAt: DateTime.now().subtract(const Duration(days: 1)),
        surveyBounds: _createSampleBounds(13.5795, 44.0207), // Taiz coordinates
        isSynced: true,
        notes: 'مسح مكتمل لبناء سكني جديد - تم رفعه للخادم',
        metadata: {'completed': true, 'totalPoints': 25, 'totalGeometries': 3},
      ),
    ]);

    // Sample survey points for the completed task
    if (_tasks.isNotEmpty) {
      final completedTask = _tasks.firstWhere((t) => t.status == 'completed');
      await _addSamplePoints(completedTask.id);
      await _addSampleGeometries(completedTask.id);
      await _addSampleAttachments(completedTask.id);
    }
  }

  /// Create sample survey bounds polygon
  static SurveyBounds _createSampleBounds(double centerLat, double centerLng) {
    // Create a small rectangle around the center point (~50m x 50m)
    const double offset = 0.0005; // Approximately 50 meters
    
    final polygon = GeoJSONPolygon([
      [
        GeoJSONPosition(longitude: centerLng - offset, latitude: centerLat - offset),
        GeoJSONPosition(longitude: centerLng + offset, latitude: centerLat - offset),
        GeoJSONPosition(longitude: centerLng + offset, latitude: centerLat + offset),
        GeoJSONPosition(longitude: centerLng - offset, latitude: centerLat + offset),
        GeoJSONPosition(longitude: centerLng - offset, latitude: centerLat - offset), // Close
      ]
    ]);
    
    return SurveyBounds(
      boundaryPolygon: polygon,
      description: 'منطقة المسح المحددة للمشروع',
    );
  }

  /// Add sample survey points
  static Future<void> _addSamplePoints(String sessionId) async {
    final samplePoints = [
      SurveyPoint(
        id: 'point_001',
        sessionId: sessionId,
        pointNumber: 1,
        position: const GeoJSONPosition(longitude: 44.0207, latitude: 13.5795, elevation: 1365.2),
        accuracy: 0.8,
        hdop: 1.2,
        vdop: 2.1,
        satelliteCount: 12,
        pointType: 'control',
        featureCode: 'CP001',
        description: 'نقطة تحكم رئيسية - الزاوية الجنوبية الغربية',
        capturedAt: DateTime.now().subtract(const Duration(hours: 25)),
        createdAt: DateTime.now().subtract(const Duration(hours: 25)),
        isSynced: true,
        idempotencyKey: 'point_001_${DateTime.now().millisecondsSinceEpoch}',
      ),
      SurveyPoint(
        id: 'point_002',
        sessionId: sessionId,
        pointNumber: 2,
        position: const GeoJSONPosition(longitude: 44.0217, latitude: 13.5795, elevation: 1364.8),
        accuracy: 0.9,
        hdop: 1.1,
        satelliteCount: 11,
        pointType: 'boundary',
        featureCode: 'BP002',
        description: 'حد الملكية - الجهة الجنوبية',
        capturedAt: DateTime.now().subtract(const Duration(hours: 24, minutes: 30)),
        createdAt: DateTime.now().subtract(const Duration(hours: 24, minutes: 30)),
        isSynced: true,
        idempotencyKey: 'point_002_${DateTime.now().millisecondsSinceEpoch}',
      ),
    ];

    _points.addAll(samplePoints);
  }

  /// Add sample geometries
  static Future<void> _addSampleGeometries(String sessionId) async {
    // Sample building polygon
    final buildingPolygon = GeoJSONPolygon([
      [
        const GeoJSONPosition(longitude: 44.0207, latitude: 13.5795),
        const GeoJSONPosition(longitude: 44.0217, latitude: 13.5795),
        const GeoJSONPosition(longitude: 44.0217, latitude: 13.5805),
        const GeoJSONPosition(longitude: 44.0207, latitude: 13.5805),
        const GeoJSONPosition(longitude: 44.0207, latitude: 13.5795), // Close
      ]
    ]);

    final buildingGeometry = SurveyGeometry(
      id: 'geometry_001',
      sessionId: sessionId,
      geometryNumber: 1,
      geometry: buildingPolygon,
      properties: {'material': 'concrete', 'floors': 2, 'yearBuilt': 2020},
      featureType: 'building',
      featureCode: 'BUILDING_RESIDENTIAL',
      description: 'مبنى سكني من طابقين - خرسانة مسلحة',
      isClosed: true,
      isComplete: true,
      completedAt: DateTime.now().subtract(const Duration(hours: 23)),
      createdAt: DateTime.now().subtract(const Duration(hours: 24)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 23)),
      isSynced: true,
      idempotencyKey: 'geometry_001_${DateTime.now().millisecondsSinceEpoch}',
    );

    // Sample boundary line
    final boundaryLine = GeoJSONLineString([
      const GeoJSONPosition(longitude: 44.0207, latitude: 13.5795),
      const GeoJSONPosition(longitude: 44.0220, latitude: 13.5798),
      const GeoJSONPosition(longitude: 44.0225, latitude: 13.5805),
    ]);

    final boundaryGeometry = SurveyGeometry(
      id: 'geometry_002',
      sessionId: sessionId,
      geometryNumber: 2,
      geometry: boundaryLine,
      properties: {'fenceType': 'concrete_wall', 'height': 2.0},
      featureType: 'boundary',
      featureCode: 'FENCE_CONCRETE',
      description: 'سور خرسانی - الحد الشرقي للملكية',
      isComplete: true,
      completedAt: DateTime.now().subtract(const Duration(hours: 22)),
      createdAt: DateTime.now().subtract(const Duration(hours: 23)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 22)),
      isSynced: true,
      idempotencyKey: 'geometry_002_${DateTime.now().millisecondsSinceEpoch}',
    );

    _geometries.addAll([
      buildingGeometry.calculateProperties(),
      boundaryGeometry.calculateProperties(),
    ]);
  }

  /// Add sample attachments
  static Future<void> _addSampleAttachments(String sessionId) async {
    final buildingPhoto = SurveyAttachment(
      id: 'attachment_001',
      sessionId: sessionId,
      relatedGeometryId: 'geometry_001',
      attachmentType: 'photo',
      fileName: 'building_front_view.jpg',
      filePath: '/local/photos/building_front_view.jpg',
      fileSize: 2048576, // 2MB
      thumbnailPath: '/local/thumbnails/building_front_view_thumb.jpg',
      captureLocation: const GeoJSONPosition(longitude: 44.0212, latitude: 13.5800, elevation: 1364.5),
      captureTimestamp: DateTime.now().subtract(const Duration(hours: 23, minutes: 30)),
      deviceInfo: {
        'deviceModel': 'Samsung Galaxy S21',
        'cameraResolution': '64MP',
        'flashUsed': false,
      },
      metadata: {
        'direction': 'front',
        'weatherConditions': 'sunny',
        'photoQuality': 'high',
      },
      description: 'صورة المبنى من الجهة الأمامية',
      notes: 'صورة واضحة تظهر تفاصيل الواجهة والمداخل',
      createdAt: DateTime.now().subtract(const Duration(hours: 23, minutes: 30)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 23, minutes: 30)),
      isSynced: true,
      idempotencyKey: 'attachment_001_${DateTime.now().millisecondsSinceEpoch}',
    );

    _attachments.add(buildingPhoto);
  }

  // ==================== TASK OPERATIONS ====================

  /// Get all survey tasks
  static List<SurveyTask> getAllTasks() => List.unmodifiable(_tasks);

  /// Get tasks by status
  static List<SurveyTask> getTasksByStatus(String status) =>
      _tasks.where((task) => task.status == status).toList();

  /// Get task by ID
  static SurveyTask? getTask(String id) {
    try {
      return _tasks.firstWhere((task) => task.id == id);
    } catch (e) {
      return null;
    }
  }

  /// Save or update task
  static void saveTask(SurveyTask task) {
    final index = _tasks.indexWhere((t) => t.id == task.id);
    if (index != -1) {
      _tasks[index] = task;
    } else {
      _tasks.add(task);
    }
  }

  /// Delete task and all related data
  static void deleteTask(String taskId) {
    _tasks.removeWhere((t) => t.id == taskId);
    _points.removeWhere((p) => p.sessionId == taskId);
    _geometries.removeWhere((g) => g.sessionId == taskId);
    _attachments.removeWhere((a) => a.sessionId == taskId);
  }

  // ==================== POINT OPERATIONS ====================

  /// Get points by session ID
  static List<SurveyPoint> getPointsBySession(String sessionId) =>
      _points.where((p) => p.sessionId == sessionId).toList();

  /// Save survey point
  static void savePoint(SurveyPoint point) {
    final index = _points.indexWhere((p) => p.id == point.id);
    if (index != -1) {
      _points[index] = point;
    } else {
      _points.add(point);
    }
  }

  /// Delete point
  static void deletePoint(String pointId) {
    _points.removeWhere((p) => p.id == pointId);
  }

  /// Get next point number for session
  static int getNextPointNumber(String sessionId) {
    final sessionPoints = getPointsBySession(sessionId);
    if (sessionPoints.isEmpty) return 1;
    return sessionPoints.map((p) => p.pointNumber).reduce((a, b) => a > b ? a : b) + 1;
  }

  // ==================== GEOMETRY OPERATIONS ====================

  /// Get geometries by session ID
  static List<SurveyGeometry> getGeometriesBySession(String sessionId) =>
      _geometries.where((g) => g.sessionId == sessionId).toList();

  /// Save survey geometry
  static void saveGeometry(SurveyGeometry geometry) {
    // Auto-calculate properties before saving
    final calculatedGeometry = geometry.calculateProperties();
    
    final index = _geometries.indexWhere((g) => g.id == calculatedGeometry.id);
    if (index != -1) {
      _geometries[index] = calculatedGeometry;
    } else {
      _geometries.add(calculatedGeometry);
    }
  }

  /// Delete geometry
  static void deleteGeometry(String geometryId) {
    _geometries.removeWhere((g) => g.id == geometryId);
    // Also delete related attachments
    _attachments.removeWhere((a) => a.relatedGeometryId == geometryId);
  }

  /// Get next geometry number for session
  static int getNextGeometryNumber(String sessionId) {
    final sessionGeometries = getGeometriesBySession(sessionId);
    if (sessionGeometries.isEmpty) return 1;
    return sessionGeometries.map((g) => g.geometryNumber).reduce((a, b) => a > b ? a : b) + 1;
  }

  // ==================== ATTACHMENT OPERATIONS ====================

  /// Get attachments by session ID
  static List<SurveyAttachment> getAttachmentsBySession(String sessionId) =>
      _attachments.where((a) => a.sessionId == sessionId).toList();

  /// Get attachments by geometry ID
  static List<SurveyAttachment> getAttachmentsByGeometry(String geometryId) =>
      _attachments.where((a) => a.relatedGeometryId == geometryId).toList();

  /// Get attachments by point ID
  static List<SurveyAttachment> getAttachmentsByPoint(String pointId) =>
      _attachments.where((a) => a.relatedPointId == pointId).toList();

  /// Save attachment
  static void saveAttachment(SurveyAttachment attachment) {
    final index = _attachments.indexWhere((a) => a.id == attachment.id);
    if (index != -1) {
      _attachments[index] = attachment;
    } else {
      _attachments.add(attachment);
    }
  }

  /// Delete attachment
  static void deleteAttachment(String attachmentId) {
    _attachments.removeWhere((a) => a.id == attachmentId);
  }

  // ==================== SYNC OPERATIONS ====================

  /// Check if session has pending sync data
  static bool hasPendingSync(String sessionId) {
    final task = getTask(sessionId);
    if (task == null) return false;

    final anyPointPending = _points.any((p) => p.sessionId == sessionId && !p.isSynced);
    final anyGeometryPending = _geometries.any((g) => g.sessionId == sessionId && !g.isSynced);
    final anyAttachmentPending = _attachments.any((a) => a.sessionId == sessionId && !a.isSynced);

    return !task.isSynced || anyPointPending || anyGeometryPending || anyAttachmentPending;
  }

  /// Get complete session summary for display
  static SurveySessionSummary? getSessionSummary(String sessionId) {
    final task = getTask(sessionId);
    if (task == null) return null;

    return SurveySessionSummary(
      task: task,
      points: getPointsBySession(sessionId),
      geometries: getGeometriesBySession(sessionId),
      attachments: getAttachmentsBySession(sessionId),
    );
  }

  /// Export session data for API sync (server format)
  static Map<String, dynamic> exportSessionForSync(String sessionId) {
    final summary = getSessionSummary(sessionId);
    if (summary == null) return {};

    return {
      'session': summary.task.toServerJson(),
      'points': summary.points.map((p) => p.toServerJson()).toList(),
      'geometries': summary.geometries.map((g) => g.toServerJson()).toList(),
      'attachments': summary.attachments.map((a) => a.toServerJson()).toList(),
      'statistics': summary.statistics,
    };
  }

  /// Export session as GeoJSON FeatureCollection
  static Map<String, dynamic> exportSessionAsGeoJSON(String sessionId) {
    final summary = getSessionSummary(sessionId);
    if (summary == null) return {};

    final featureCollection = summary.toGeoJSONFeatureCollection();
    return featureCollection.toGeoJSON();
  }

  /// Mark all session data as synced
  static void markSessionAsSynced(String sessionId) {
    // Mark task as synced
    final task = getTask(sessionId);
    if (task != null) {
      final updatedTask = SurveyTask(
        id: task.id,
        sessionNumber: task.sessionNumber,
        applicationId: task.applicationId,
        citizenName: task.citizenName,
        location: task.location,
        status: task.status,
        surveyBounds: task.surveyBounds,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        isSynced: true,
        syncError: null,
        lastSyncAttempt: DateTime.now(),
        notes: task.notes,
        metadata: task.metadata,
      );
      saveTask(updatedTask);
    }

    // Mark all points as synced
    for (int i = 0; i < _points.length; i++) {
      if (_points[i].sessionId == sessionId && !_points[i].isSynced) {
        _points[i] = SurveyPoint(
          id: _points[i].id,
          sessionId: _points[i].sessionId,
          pointNumber: _points[i].pointNumber,
          position: _points[i].position,
          accuracy: _points[i].accuracy,
          hdop: _points[i].hdop,
          vdop: _points[i].vdop,
          satelliteCount: _points[i].satelliteCount,
          pointType: _points[i].pointType,
          featureCode: _points[i].featureCode,
          description: _points[i].description,
          properties: _points[i].properties,
          capturedAt: _points[i].capturedAt,
          createdAt: _points[i].createdAt,
          isSynced: true,
          idempotencyKey: _points[i].idempotencyKey,
        );
      }
    }

    // Mark all geometries as synced
    for (int i = 0; i < _geometries.length; i++) {
      if (_geometries[i].sessionId == sessionId && !_geometries[i].isSynced) {
        _geometries[i] = SurveyGeometry(
          id: _geometries[i].id,
          sessionId: _geometries[i].sessionId,
          geometryNumber: _geometries[i].geometryNumber,
          geometry: _geometries[i].geometry,
          properties: _geometries[i].properties,
          crs: _geometries[i].crs,
          featureType: _geometries[i].featureType,
          featureCode: _geometries[i].featureCode,
          description: _geometries[i].description,
          area: _geometries[i].area,
          perimeter: _geometries[i].perimeter,
          length: _geometries[i].length,
          isClosed: _geometries[i].isClosed,
          isComplete: _geometries[i].isComplete,
          completedAt: _geometries[i].completedAt,
          createdAt: _geometries[i].createdAt,
          updatedAt: _geometries[i].updatedAt,
          isSynced: true,
          idempotencyKey: _geometries[i].idempotencyKey,
        );
      }
    }

    // Mark all attachments as synced
    for (int i = 0; i < _attachments.length; i++) {
      if (_attachments[i].sessionId == sessionId && !_attachments[i].isSynced) {
        _attachments[i] = SurveyAttachment(
          id: _attachments[i].id,
          sessionId: _attachments[i].sessionId,
          relatedPointId: _attachments[i].relatedPointId,
          relatedGeometryId: _attachments[i].relatedGeometryId,
          attachmentType: _attachments[i].attachmentType,
          fileName: _attachments[i].fileName,
          filePath: _attachments[i].filePath,
          serverUrl: _attachments[i].serverUrl,
          fileSize: _attachments[i].fileSize,
          thumbnailPath: _attachments[i].thumbnailPath,
          captureLocation: _attachments[i].captureLocation,
          captureTimestamp: _attachments[i].captureTimestamp,
          deviceInfo: _attachments[i].deviceInfo,
          metadata: _attachments[i].metadata,
          description: _attachments[i].description,
          notes: _attachments[i].notes,
          createdAt: _attachments[i].createdAt,
          updatedAt: _attachments[i].updatedAt,
          isSynced: true,
          idempotencyKey: _attachments[i].idempotencyKey,
        );
      }
    }
  }

  // ==================== UTILITY OPERATIONS ====================

  /// Get database statistics
  static Map<String, dynamic> getStatistics() {
    return {
      'totalTasks': _tasks.length,
      'tasksByStatus': {
        'assigned': _tasks.where((t) => t.status == 'assigned').length,
        'in_progress': _tasks.where((t) => t.status == 'in_progress').length,
        'completed': _tasks.where((t) => t.status == 'completed').length,
      },
      'totalPoints': _points.length,
      'totalGeometries': _geometries.length,
      'geometryTypes': {
        'points': _geometries.where((g) => g.geometry.type == GeoJSONGeometryType.point).length,
        'lines': _geometries.where((g) => g.geometry.type == GeoJSONGeometryType.lineString).length,
        'polygons': _geometries.where((g) => g.geometry.type == GeoJSONGeometryType.polygon).length,
      },
      'totalAttachments': _attachments.length,
      'attachmentTypes': {
        'photos': _attachments.where((a) => a.attachmentType == 'photo').length,
        'documents': _attachments.where((a) => a.attachmentType == 'document').length,
        'notes': _attachments.where((a) => a.attachmentType == 'text_note').length,
      },
      'syncStatus': {
        'pendingSessions': _tasks.where((t) => hasPendingSync(t.id)).length,
        'syncedSessions': _tasks.where((t) => !hasPendingSync(t.id)).length,
      },
    };
  }

  /// Clear all data (for testing/debugging)
  static void clearAllData() {
    _tasks.clear();
    _points.clear();
    _geometries.clear();
    _attachments.clear();
  }
}