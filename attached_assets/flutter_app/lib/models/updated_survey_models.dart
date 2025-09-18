/// Updated Survey Models with GeoJSON Support
/// Aligned with Yemen Digital Construction Platform server schema
/// Compatible with shared/schema.ts and mobile API contracts

import 'package:dreamflow_app/models/geojson_models.dart';

/// Survey Task - Mobile Survey Session
/// Matches mobileSurveySessions table in server schema
class SurveyTask {
  final String id;
  final String sessionNumber; // Unique session identifier
  final String applicationId; // Reference to building permit application
  
  // Task details
  final String citizenName;
  final String location; // Human-readable location
  final String status; // assigned, in_progress, completed, submitted
  
  // Geographic bounds for the survey area
  final SurveyBounds? surveyBounds;
  
  // Timestamps
  final DateTime createdAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  
  // Sync status
  final bool isSynced;
  final String? syncError;
  final DateTime? lastSyncAttempt;
  
  // Survey metadata
  final String? notes;
  final Map<String, dynamic>? metadata;

  SurveyTask({
    required this.id,
    required this.sessionNumber,
    required this.applicationId,
    required this.citizenName,
    required this.location,
    required this.status,
    this.surveyBounds,
    required this.createdAt,
    this.startedAt,
    this.completedAt,
    this.isSynced = false,
    this.syncError,
    this.lastSyncAttempt,
    this.notes,
    this.metadata,
  });

  /// Convert to server format for API calls
  Map<String, dynamic> toServerJson() => {
    'id': id,
    'sessionNumber': sessionNumber,
    'applicationId': applicationId,
    'citizenName': citizenName,
    'location': location,
    'status': status,
    'startedAt': startedAt?.toIso8601String(),
    'completedAt': completedAt?.toIso8601String(),
    'surveyBounds': surveyBounds?.toGeoJSON(),
    'notes': notes,
    'metadata': metadata,
  };

  factory SurveyTask.fromServerJson(Map<String, dynamic> json) {
    return SurveyTask(
      id: json['id'],
      sessionNumber: json['sessionNumber'],
      applicationId: json['applicationId'],
      citizenName: json['citizenName'] ?? 'Unknown',
      location: json['location'] ?? 'Unknown Location',
      status: json['status'],
      surveyBounds: json['surveyBounds'] != null 
        ? SurveyBounds.fromGeoJSON(json['surveyBounds'])
        : null,
      createdAt: DateTime.parse(json['createdAt']),
      startedAt: json['startedAt'] != null 
        ? DateTime.parse(json['startedAt'])
        : null,
      completedAt: json['completedAt'] != null 
        ? DateTime.parse(json['completedAt'])
        : null,
      isSynced: json['isSynced'] ?? false,
      notes: json['notes'],
      metadata: json['metadata']?.cast<String, dynamic>(),
    );
  }
}

/// Survey Bounds - Geographic area for survey
class SurveyBounds {
  final GeoJSONPolygon boundaryPolygon;
  final String? description;

  const SurveyBounds({
    required this.boundaryPolygon,
    this.description,
  });

  /// Convert to GeoJSON Feature (not geometry) per RFC 7946
  GeoJSONFeature toGeoJSONFeature() => GeoJSONFeature(
    geometry: boundaryPolygon,
    properties: {
      'description': description,
      'type': 'survey_boundary',
    },
  );

  /// Convert to plain GeoJSON geometry for server storage
  Map<String, dynamic> toGeoJSON() => boundaryPolygon.toGeoJSON();

  factory SurveyBounds.fromGeoJSON(Map<String, dynamic> geoJson) {
    return SurveyBounds(
      boundaryPolygon: GeoJSONPolygon.fromCoordinates(
        geoJson['coordinates'].cast<List<List<double>>>()
      ),
      description: geoJson['properties']?['description'],
    );
  }
}

/// Survey Point - Individual point measurement
/// Matches mobileSurveyPoints table in server schema
class SurveyPoint {
  final String id;
  final String sessionId;
  final int pointNumber; // Sequential within session
  
  // Location data (WGS84 - EPSG:4326)
  final GeoJSONPosition position;
  final double accuracy; // Accuracy in meters
  final double? hdop; // Horizontal Dilution of Precision
  final double? vdop; // Vertical Dilution of Precision
  final int? satelliteCount;
  
  // Point metadata
  final String? pointType; // control, detail, boundary
  final String? featureCode; // Feature classification
  final String? description;
  final Map<String, dynamic>? properties;
  
  // Timestamps
  final DateTime capturedAt;
  final DateTime createdAt;
  
  // Sync status
  final bool isSynced;
  final String? idempotencyKey;

  SurveyPoint({
    required this.id,
    required this.sessionId,
    required this.pointNumber,
    required this.position,
    required this.accuracy,
    this.hdop,
    this.vdop,
    this.satelliteCount,
    this.pointType,
    this.featureCode,
    this.description,
    this.properties,
    required this.capturedAt,
    required this.createdAt,
    this.isSynced = false,
    this.idempotencyKey,
  });

  /// Create GeoJSON Point geometry
  GeoJSONPoint get geometry => GeoJSONPoint(position);

  /// Convert to GeoJSON Feature
  GeoJSONFeature toGeoJSONFeature() => GeoJSONFeature(
    id: id,
    geometry: geometry,
    properties: {
      'pointNumber': pointNumber,
      'pointType': pointType,
      'featureCode': featureCode,
      'description': description,
      'accuracy': accuracy,
      'hdop': hdop,
      'vdop': vdop,
      'satelliteCount': satelliteCount,
      'capturedAt': capturedAt.toIso8601String(),
      ...?properties,
    },
  );

  /// Convert to server format
  Map<String, dynamic> toServerJson() => {
    'id': id,
    'sessionId': sessionId,
    'pointNumber': pointNumber,
    'idempotencyKey': idempotencyKey,
    'latitude': position.latitude,
    'longitude': position.longitude,
    'elevation': position.elevation,
    'accuracy': accuracy,
    'hdop': hdop,
    'vdop': vdop,
    'satelliteCount': satelliteCount,
    'pointType': pointType,
    'featureCode': featureCode,
    'description': description,
    'properties': properties,
    'capturedAt': capturedAt.toIso8601String(),
  };

  factory SurveyPoint.fromServerJson(Map<String, dynamic> json) {
    return SurveyPoint(
      id: json['id'],
      sessionId: json['sessionId'],
      pointNumber: json['pointNumber'],
      position: GeoJSONPosition(
        longitude: json['longitude'].toDouble(),
        latitude: json['latitude'].toDouble(),
        elevation: json['elevation']?.toDouble(),
      ),
      accuracy: json['accuracy'].toDouble(),
      hdop: json['hdop']?.toDouble(),
      vdop: json['vdop']?.toDouble(),
      satelliteCount: json['satelliteCount'],
      pointType: json['pointType'],
      featureCode: json['featureCode'],
      description: json['description'],
      properties: json['properties']?.cast<String, dynamic>(),
      capturedAt: DateTime.parse(json['capturedAt']),
      createdAt: DateTime.parse(json['createdAt']),
      isSynced: json['isSynced'] ?? false,
      idempotencyKey: json['idempotencyKey'],
    );
  }
}

/// Survey Geometry - Complex geometric features
/// Matches mobileSurveyGeometries table in server schema  
class SurveyGeometry {
  final String id;
  final String sessionId;
  final int geometryNumber; // Sequential within session
  
  // GeoJSON geometry data
  final GeoJSONGeometry geometry;
  final Map<String, dynamic> properties;
  final String crs; // Coordinate Reference System (default: EPSG:4326)
  
  // Feature metadata
  final String? featureType; // building, boundary, infrastructure
  final String? featureCode; // Detailed classification
  final String? description;
  
  // Geometric properties (calculated from coordinates)
  final double? area; // Square meters (for polygons)
  final double? perimeter; // Meters (for polygons)
  final double? length; // Meters (for lines)
  
  // Status
  final bool isClosed; // For polygons/lines
  final bool isComplete;
  final DateTime? completedAt;
  
  // Timestamps
  final DateTime createdAt;
  final DateTime updatedAt;
  
  // Sync status
  final bool isSynced;
  final String? idempotencyKey;

  SurveyGeometry({
    required this.id,
    required this.sessionId,
    required this.geometryNumber,
    required this.geometry,
    required this.properties,
    this.crs = 'EPSG:4326',
    this.featureType,
    this.featureCode,
    this.description,
    this.area,
    this.perimeter,
    this.length,
    this.isClosed = false,
    this.isComplete = false,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
    this.idempotencyKey,
  });

  /// Convert to GeoJSON Feature
  GeoJSONFeature toGeoJSONFeature() => GeoJSONFeature(
    id: id,
    geometry: geometry,
    properties: {
      'geometryNumber': geometryNumber,
      'featureType': featureType,
      'featureCode': featureCode,
      'description': description,
      'area': area,
      'perimeter': perimeter,
      'length': length,
      'isClosed': isClosed,
      'isComplete': isComplete,
      'crs': crs,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      ...properties,
    },
  );

  /// Calculate geometric properties based on geometry type
  SurveyGeometry calculateProperties() {
    double? newArea;
    double? newPerimeter;
    double? newLength;
    bool newIsClosed = isClosed;

    switch (geometry.type) {
      case GeoJSONGeometryType.polygon:
        final polygon = geometry as GeoJSONPolygon;
        newArea = polygon.areaInSquareMeters;
        newPerimeter = polygon.perimeterInMeters;
        newIsClosed = polygon.isClosed;
        break;
      case GeoJSONGeometryType.lineString:
        final lineString = geometry as GeoJSONLineString;
        newLength = lineString.lengthInMeters;
        // Check if line is closed using geometry's built-in method
        if (lineString.positions.length >= 2) {
          newIsClosed = _isLineStringClosed(lineString);
        }
        break;
      case GeoJSONGeometryType.multiPolygon:
        final multiPolygon = geometry as GeoJSONMultiPolygon;
        newArea = multiPolygon.totalAreaInSquareMeters;
        break;
      default:
        break;
    }

    return SurveyGeometry(
      id: id,
      sessionId: sessionId,
      geometryNumber: geometryNumber,
      geometry: geometry,
      properties: properties,
      crs: crs,
      featureType: featureType,
      featureCode: featureCode,
      description: description,
      area: newArea,
      perimeter: newPerimeter,
      length: newLength,
      isClosed: newIsClosed,
      isComplete: isComplete,
      completedAt: completedAt,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
      isSynced: isSynced,
      idempotencyKey: idempotencyKey,
    );
  }

  /// Convert to server format
  Map<String, dynamic> toServerJson() {
    // Ensure polygons are closed before sending to server
    dynamic coordinates = geometry.coordinates;
    bool geometryIsClosed = isClosed;
    
    if (geometry.type == GeoJSONGeometryType.polygon) {
      final polygon = geometry as GeoJSONPolygon;
      if (!polygon.isClosed) {
        final closedPolygon = polygon.ensureClosed();
        coordinates = closedPolygon.coordinates;
        geometryIsClosed = true;
      }
    }
    
    return {
      'id': id,
      'sessionId': sessionId,
      'geometryNumber': geometryNumber,
      'idempotencyKey': idempotencyKey,
      'geometryType': geometry.type.value,
      'coordinates': coordinates,
      'properties': properties,
    'crs': crs,
    'featureType': featureType,
    'featureCode': featureCode,
    'description': description,
    'area': area,
    'perimeter': perimeter,
    'length': length,
    'isClosed': geometryIsClosed,
    'isComplete': isComplete,
    'completedAt': completedAt?.toIso8601String(),
  };
  }

  factory SurveyGeometry.fromServerJson(Map<String, dynamic> json) {
    // Reconstruct geometry from server data
    final geometryJson = {
      'type': json['geometryType'],
      'coordinates': json['coordinates'],
    };
    
    return SurveyGeometry(
      id: json['id'],
      sessionId: json['sessionId'],
      geometryNumber: json['geometryNumber'],
      geometry: GeoJSONGeometry.fromGeoJSON(geometryJson),
      properties: json['properties']?.cast<String, dynamic>() ?? {},
      crs: json['crs'] ?? 'EPSG:4326',
      featureType: json['featureType'],
      featureCode: json['featureCode'],
      description: json['description'],
      area: json['area']?.toDouble(),
      perimeter: json['perimeter']?.toDouble(),
      length: json['length']?.toDouble(),
      isClosed: json['isClosed'] ?? false,
      isComplete: json['isComplete'] ?? false,
      completedAt: json['completedAt'] != null 
        ? DateTime.parse(json['completedAt'])
        : null,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      isSynced: json['isSynced'] ?? false,
      idempotencyKey: json['idempotencyKey'],
    );
  }
}

/// Survey Attachment - Photos, documents, notes
/// Matches mobileSurveyAttachments table in server schema
class SurveyAttachment {
  final String id;
  final String sessionId;
  final String? relatedPointId; // Optional link to survey point
  final String? relatedGeometryId; // Optional link to survey geometry
  
  // Attachment metadata
  final String attachmentType; // photo, document, voice_note, text_note
  final String fileName;
  final String? filePath; // Local file path
  final String? serverUrl; // URL after upload
  final int? fileSize; // File size in bytes
  final String? thumbnailPath; // Thumbnail for images
  
  // Capture context
  final GeoJSONPosition? captureLocation; // Where attachment was captured
  final DateTime? captureTimestamp;
  final Map<String, dynamic>? deviceInfo; // Device metadata
  final Map<String, dynamic>? metadata; // Additional metadata
  
  // Content
  final String? description;
  final String? notes;
  
  // Timestamps
  final DateTime createdAt;
  final DateTime updatedAt;
  
  // Sync status
  final bool isSynced;
  final String? idempotencyKey;

  SurveyAttachment({
    required this.id,
    required this.sessionId,
    this.relatedPointId,
    this.relatedGeometryId,
    required this.attachmentType,
    required this.fileName,
    this.filePath,
    this.serverUrl,
    this.fileSize,
    this.thumbnailPath,
    this.captureLocation,
    this.captureTimestamp,
    this.deviceInfo,
    this.metadata,
    this.description,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
    this.idempotencyKey,
  });

  /// Convert to server format
  Map<String, dynamic> toServerJson() => {
    'id': id,
    'sessionId': sessionId,
    'relatedPointId': relatedPointId,
    'relatedGeometryId': relatedGeometryId,
    'idempotencyKey': idempotencyKey,
    'attachmentType': attachmentType,
    'fileName': fileName,
    'fileSize': fileSize,
    'thumbnailPath': thumbnailPath,
    'coordinates': captureLocation != null ? {
      'latitude': captureLocation!.latitude,
      'longitude': captureLocation!.longitude,
      'elevation': captureLocation!.elevation,
    } : null,
    'captureTimestamp': captureTimestamp?.toIso8601String(),
    'deviceInfo': deviceInfo,
    'metadata': metadata,
    'description': description,
    'notes': notes,
  };

  factory SurveyAttachment.fromServerJson(Map<String, dynamic> json) {
    GeoJSONPosition? captureLocation;
    if (json['coordinates'] != null) {
      final coords = json['coordinates'];
      captureLocation = GeoJSONPosition(
        longitude: coords['longitude'].toDouble(),
        latitude: coords['latitude'].toDouble(),
        elevation: coords['elevation']?.toDouble(),
      );
    }

    return SurveyAttachment(
      id: json['id'],
      sessionId: json['sessionId'],
      relatedPointId: json['relatedPointId'],
      relatedGeometryId: json['relatedGeometryId'],
      attachmentType: json['attachmentType'],
      fileName: json['fileName'],
      filePath: json['filePath'],
      serverUrl: json['serverUrl'],
      fileSize: json['fileSize'],
      thumbnailPath: json['thumbnailPath'],
      captureLocation: captureLocation,
      captureTimestamp: json['captureTimestamp'] != null 
        ? DateTime.parse(json['captureTimestamp'])
        : null,
      deviceInfo: json['deviceInfo']?.cast<String, dynamic>(),
      metadata: json['metadata']?.cast<String, dynamic>(),
      description: json['description'],
      notes: json['notes'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      isSynced: json['isSynced'] ?? false,
      idempotencyKey: json['idempotencyKey'],
    );
  }
}

/// Survey Session Summary - Complete session data
class SurveySessionSummary {
  final SurveyTask task;
  final List<SurveyPoint> points;
  final List<SurveyGeometry> geometries;
  final List<SurveyAttachment> attachments;

  const SurveySessionSummary({
    required this.task,
    required this.points,
    required this.geometries,
    required this.attachments,
  });

  /// Convert entire session to GeoJSON FeatureCollection
  GeoJSONFeatureCollection toGeoJSONFeatureCollection() {
    final features = <GeoJSONFeature>[];
    
    // Add survey bounds if available
    if (task.surveyBounds != null) {
      features.add(GeoJSONFeature(
        id: '${task.id}_bounds',
        geometry: task.surveyBounds!.boundaryPolygon,
        properties: {
          'type': 'survey_boundary',
          'sessionId': task.id,
          'description': task.surveyBounds!.description,
        },
      ));
    }
    
    // Add all points
    features.addAll(points.map((p) => p.toGeoJSONFeature()));
    
    // Add all geometries
    features.addAll(geometries.map((g) => g.toGeoJSONFeature()));
    
    return GeoJSONFeatureCollection(features);
  }

  /// Calculate session statistics
  Map<String, dynamic> get statistics => {
    'totalPoints': points.length,
    'totalGeometries': geometries.length,
    'totalAttachments': attachments.length,
    'pointTypes': _countByProperty(points, (p) => p.pointType ?? 'unknown'),
    'geometryTypes': _countByProperty(geometries, (g) => g.geometry.type.value),
    'attachmentTypes': _countByProperty(attachments, (a) => a.attachmentType),
    'totalArea': geometries
        .where((g) => g.area != null)
        .fold(0.0, (sum, g) => sum + g.area!),
    'totalLength': geometries
        .where((g) => g.length != null)
        .fold(0.0, (sum, g) => sum + g.length!),
    'syncStatus': {
      'points': {
        'synced': points.where((p) => p.isSynced).length,
        'pending': points.where((p) => !p.isSynced).length,
      },
      'geometries': {
        'synced': geometries.where((g) => g.isSynced).length,
        'pending': geometries.where((g) => !g.isSynced).length,
      },
      'attachments': {
        'synced': attachments.where((a) => a.isSynced).length,
        'pending': attachments.where((a) => !a.isSynced).length,
      },
    },
  };

  Map<String, int> _countByProperty<T>(List<T> items, String Function(T) getValue) {
    final counts = <String, int>{};
    for (final item in items) {
      final value = getValue(item);
      counts[value] = (counts[value] ?? 0) + 1;
    }
    return counts;
  }
}

/// Helper function to check if LineString is closed with tolerance
bool _isLineStringClosed(GeoJSONLineString lineString) {
  if (lineString.positions.length < 2) return false;
  final first = lineString.positions.first;
  final last = lineString.positions.last;
  
  // Use same tolerance as geojson_models.dart
  const double tolerance = 1e-7;
  return (first.longitude - last.longitude).abs() < tolerance &&
         (first.latitude - last.latitude).abs() < tolerance &&
         ((first.elevation ?? 0.0) - (last.elevation ?? 0.0)).abs() < tolerance;
}

/// Backward compatibility - Legacy models that can be migrated
/// These will be deprecated in future versions
@Deprecated('Use SurveyPoint with GeoJSON coordinates instead')
class LegacySurveyPoint {
  final String id;
  final String taskId;
  final double latitude;
  final double longitude;
  final double? elevation;
  final double accuracy;
  final DateTime timestamp;
  final String? description;
  final String? featureCode;
  final bool isSynced;

  LegacySurveyPoint({
    required this.id,
    required this.taskId,
    required this.latitude,
    required this.longitude,
    this.elevation,
    required this.accuracy,
    required this.timestamp,
    this.description,
    this.featureCode,
    this.isSynced = false,
  });

  /// Convert to new SurveyPoint model
  SurveyPoint toSurveyPoint({
    required String sessionId,
    required int pointNumber,
  }) {
    return SurveyPoint(
      id: id,
      sessionId: sessionId,
      pointNumber: pointNumber,
      position: GeoJSONPosition(
        longitude: longitude,
        latitude: latitude,
        elevation: elevation,
      ),
      accuracy: accuracy,
      featureCode: featureCode,
      description: description,
      capturedAt: timestamp,
      createdAt: timestamp,
      isSynced: isSynced,
    );
  }
}

@Deprecated('Use SurveyGeometry with GeoJSON coordinates instead')
class LegacyPolygonPoint {
  final double x;
  final double y;
  
  LegacyPolygonPoint({required this.x, required this.y});
}

@Deprecated('Use SurveyGeometry with GeoJSON Polygon instead')
class LegacySurveyPolygon {
  final String id;
  final String taskId;
  final String featureCode;
  final List<LegacyPolygonPoint> points; // Canvas coordinates
  final bool closed;
  final DateTime createdAt;
  final bool isSynced;

  LegacySurveyPolygon({
    required this.id,
    required this.taskId,
    required this.featureCode,
    required this.points,
    required this.closed,
    required this.createdAt,
    this.isSynced = false,
  });
}