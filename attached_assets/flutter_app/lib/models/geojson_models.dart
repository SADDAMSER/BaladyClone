/// GeoJSON-compatible models for Yemen Construction Platform
/// Aligned with server schema (shared/schema.ts)

import 'dart:convert';

/// Base GeoJSON coordinate - always [longitude, latitude, elevation?]
/// Following GeoJSON RFC 7946 specification
typedef GeoJSONCoordinate = List<double>;

/// GeoJSON Position - 2D or 3D coordinate
/// [longitude, latitude] or [longitude, latitude, elevation]
class GeoJSONPosition {
  final double longitude;
  final double latitude;
  final double? elevation;
  
  const GeoJSONPosition({
    required this.longitude,
    required this.latitude,
    this.elevation,
  });

  GeoJSONCoordinate toCoordinate() {
    if (elevation != null) {
      return [longitude, latitude, elevation!];
    }
    return [longitude, latitude];
  }

  factory GeoJSONPosition.fromCoordinate(GeoJSONCoordinate coord) {
    return GeoJSONPosition(
      longitude: coord[0],
      latitude: coord[1],
      elevation: coord.length > 2 ? coord[2] : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'longitude': longitude,
    'latitude': latitude,
    if (elevation != null) 'elevation': elevation,
  };

  factory GeoJSONPosition.fromJson(Map<String, dynamic> json) {
    return GeoJSONPosition(
      longitude: json['longitude']?.toDouble() ?? 0.0,
      latitude: json['latitude']?.toDouble() ?? 0.0,
      elevation: json['elevation']?.toDouble(),
    );
  }
}

/// GeoJSON Geometry Types
enum GeoJSONGeometryType {
  point('Point'),
  lineString('LineString'),
  polygon('Polygon'),
  multiPolygon('MultiPolygon');

  const GeoJSONGeometryType(this.value);
  final String value;
}

/// Base GeoJSON Geometry
abstract class GeoJSONGeometry {
  final GeoJSONGeometryType type;
  
  const GeoJSONGeometry(this.type);
  
  /// Get coordinates in GeoJSON format
  dynamic get coordinates;
  
  /// Convert to GeoJSON Map
  Map<String, dynamic> toGeoJSON();
  
  /// Create geometry from GeoJSON
  factory GeoJSONGeometry.fromGeoJSON(Map<String, dynamic> geoJson) {
    final type = geoJson['type'] as String;
    final coordinates = geoJson['coordinates'];
    
    switch (type) {
      case 'Point':
        return GeoJSONPoint.fromCoordinates(coordinates.cast<double>());
      case 'LineString':
        return GeoJSONLineString.fromCoordinates(
          (coordinates as List).cast<List<double>>()
        );
      case 'Polygon':
        return GeoJSONPolygon.fromCoordinates(
          (coordinates as List).cast<List<List<double>>>()
        );
      case 'MultiPolygon':
        return GeoJSONMultiPolygon.fromCoordinates(
          (coordinates as List).cast<List<List<List<double>>>>()
        );
      default:
        throw ArgumentError('Unsupported geometry type: $type');
    }
  }
}

/// GeoJSON Point Geometry
class GeoJSONPoint extends GeoJSONGeometry {
  final GeoJSONPosition position;
  
  const GeoJSONPoint(this.position) : super(GeoJSONGeometryType.point);
  
  @override
  GeoJSONCoordinate get coordinates => position.toCoordinate();
  
  @override
  Map<String, dynamic> toGeoJSON() => {
    'type': type.value,
    'coordinates': coordinates,
  };
  
  factory GeoJSONPoint.fromCoordinates(List<double> coords) {
    return GeoJSONPoint(GeoJSONPosition.fromCoordinate(coords));
  }
}

/// GeoJSON LineString Geometry
class GeoJSONLineString extends GeoJSONGeometry {
  final List<GeoJSONPosition> positions;
  
  const GeoJSONLineString(this.positions) : super(GeoJSONGeometryType.lineString);
  
  @override
  List<GeoJSONCoordinate> get coordinates => 
    positions.map((p) => p.toCoordinate()).toList();
  
  @override
  Map<String, dynamic> toGeoJSON() => {
    'type': type.value,
    'coordinates': coordinates,
  };
  
  factory GeoJSONLineString.fromCoordinates(List<List<double>> coords) {
    return GeoJSONLineString(
      coords.map((c) => GeoJSONPosition.fromCoordinate(c)).toList()
    );
  }

  /// Calculate approximate length in meters using Haversine formula
  double get lengthInMeters {
    if (positions.length < 2) return 0.0;
    
    double totalLength = 0.0;
    for (int i = 0; i < positions.length - 1; i++) {
      totalLength += _haversineDistance(positions[i], positions[i + 1]);
    }
    return totalLength;
  }
}

/// GeoJSON Polygon Geometry
class GeoJSONPolygon extends GeoJSONGeometry {
  final List<List<GeoJSONPosition>> rings; // First ring is exterior, rest are holes
  
  const GeoJSONPolygon(this.rings) : super(GeoJSONGeometryType.polygon);
  
  List<GeoJSONPosition> get exteriorRing => rings.isNotEmpty ? rings[0] : [];
  List<List<GeoJSONPosition>> get holes => rings.length > 1 ? rings.sublist(1) : [];
  
  @override
  List<List<GeoJSONCoordinate>> get coordinates => 
    rings.map((ring) => ring.map((p) => p.toCoordinate()).toList()).toList();
  
  @override
  Map<String, dynamic> toGeoJSON() => {
    'type': type.value,
    'coordinates': coordinates,
  };
  
  factory GeoJSONPolygon.fromCoordinates(List<List<List<double>>> coords) {
    return GeoJSONPolygon(
      coords.map((ring) => 
        ring.map((c) => GeoJSONPosition.fromCoordinate(c)).toList()
      ).toList()
    );
  }

  /// Calculate approximate area in square meters using shoelace formula
  double get areaInSquareMeters {
    if (exteriorRing.length < 3) return 0.0;
    return _calculatePolygonArea(exteriorRing);
  }

  /// Calculate perimeter in meters
  double get perimeterInMeters {
    if (exteriorRing.length < 2) return 0.0;
    return GeoJSONLineString(exteriorRing).lengthInMeters;
  }

  /// Check if polygon is closed (first point equals last point with tolerance)
  bool get isClosed {
    if (exteriorRing.length < 4) return false; // Minimum for closed polygon
    final first = exteriorRing.first;
    final last = exteriorRing.last;
    return _isPositionsEqual(first, last);
  }

  /// Ensure polygon is closed by adding first point as last if needed
  GeoJSONPolygon ensureClosed() {
    if (isClosed) return this;
    
    final newRings = rings.map((ring) {
      if (ring.length < 3) return ring;
      final newRing = List<GeoJSONPosition>.from(ring);
      if (!_isPositionsEqual(newRing.first, newRing.last)) {
        newRing.add(newRing.first); // Close the ring
      }
      return newRing;
    }).toList();
    
    return GeoJSONPolygon(newRings);
  }
}

/// GeoJSON MultiPolygon Geometry  
class GeoJSONMultiPolygon extends GeoJSONGeometry {
  final List<GeoJSONPolygon> polygons;
  
  const GeoJSONMultiPolygon(this.polygons) : super(GeoJSONGeometryType.multiPolygon);
  
  @override
  List<List<List<GeoJSONCoordinate>>> get coordinates =>
    polygons.map((p) => p.coordinates).toList();
  
  @override
  Map<String, dynamic> toGeoJSON() => {
    'type': type.value,
    'coordinates': coordinates,
  };
  
  factory GeoJSONMultiPolygon.fromCoordinates(List<List<List<List<double>>>> coords) {
    return GeoJSONMultiPolygon(
      coords.map((polygonCoords) => GeoJSONPolygon.fromCoordinates(polygonCoords)).toList()
    );
  }

  /// Calculate total area of all polygons
  double get totalAreaInSquareMeters =>
    polygons.fold(0.0, (sum, polygon) => sum + polygon.areaInSquareMeters);
}

/// GeoJSON Feature with geometry and properties
class GeoJSONFeature {
  final String? id;
  final GeoJSONGeometry geometry;
  final Map<String, dynamic> properties;
  
  const GeoJSONFeature({
    this.id,
    required this.geometry,
    required this.properties,
  });
  
  Map<String, dynamic> toGeoJSON() => {
    'type': 'Feature',
    if (id != null) 'id': id,
    'geometry': geometry.toGeoJSON(),
    'properties': properties,
  };
  
  factory GeoJSONFeature.fromGeoJSON(Map<String, dynamic> geoJson) {
    return GeoJSONFeature(
      id: geoJson['id']?.toString(),
      geometry: GeoJSONGeometry.fromGeoJSON(geoJson['geometry']),
      properties: Map<String, dynamic>.from(geoJson['properties'] ?? {}),
    );
  }
}

/// GeoJSON FeatureCollection
class GeoJSONFeatureCollection {
  final List<GeoJSONFeature> features;
  
  const GeoJSONFeatureCollection(this.features);
  
  Map<String, dynamic> toGeoJSON() => {
    'type': 'FeatureCollection',
    'features': features.map((f) => f.toGeoJSON()).toList(),
  };
  
  factory GeoJSONFeatureCollection.fromGeoJSON(Map<String, dynamic> geoJson) {
    final features = (geoJson['features'] as List)
        .map((f) => GeoJSONFeature.fromGeoJSON(f))
        .toList();
    return GeoJSONFeatureCollection(features);
  }
}

// Utility functions for geometric calculations

/// Calculate distance between two positions using Haversine formula
double _haversineDistance(GeoJSONPosition p1, GeoJSONPosition p2) {
  const double R = 6371000; // Earth's radius in meters
  
  final lat1Rad = p1.latitude * (3.141592653589793 / 180);
  final lat2Rad = p2.latitude * (3.141592653589793 / 180);
  final deltaLatRad = (p2.latitude - p1.latitude) * (3.141592653589793 / 180);
  final deltaLngRad = (p2.longitude - p1.longitude) * (3.141592653589793 / 180);
  
  final a = (deltaLatRad / 2).sin() * (deltaLatRad / 2).sin() +
      lat1Rad.cos() * lat2Rad.cos() *
      (deltaLngRad / 2).sin() * (deltaLngRad / 2).sin();
  
  final c = 2 * (a.sqrt()).atan2((1 - a).sqrt());
  
  return R * c;
}

/// Calculate polygon area using shoelace formula (approximate for small areas)
double _calculatePolygonArea(List<GeoJSONPosition> ring) {
  if (ring.length < 3) return 0.0;
  
  // Convert to approximate meters using simple projection
  // For more accuracy, use proper map projection
  final double avgLat = ring.map((p) => p.latitude).reduce((a, b) => a + b) / ring.length;
  final double mPerDegreeLat = 111320.0; // meters per degree latitude
  final double mPerDegreeLng = 111320.0 * (avgLat * 3.141592653589793 / 180).cos();
  
  double area = 0.0;
  final int n = ring.length;
  
  for (int i = 0; i < n; i++) {
    final j = (i + 1) % n;
    final xi = ring[i].longitude * mPerDegreeLng;
    final yi = ring[i].latitude * mPerDegreeLat;
    final xj = ring[j].longitude * mPerDegreeLng;
    final yj = ring[j].latitude * mPerDegreeLat;
    
    area += xi * yj - xj * yi;
  }
  
  return (area / 2).abs();
}

/// Check if two positions are equal within tolerance
bool _isPositionsEqual(GeoJSONPosition p1, GeoJSONPosition p2) {
  return (p1.longitude - p2.longitude).abs() < _COORDINATE_TOLERANCE &&
         (p1.latitude - p2.latitude).abs() < _COORDINATE_TOLERANCE &&
         ((p1.elevation ?? 0.0) - (p2.elevation ?? 0.0)).abs() < _COORDINATE_TOLERANCE;
}

/// Extension methods for mathematical operations
extension NumExtensions on num {
  double sin() => math.sin(this.toDouble());
  double cos() => math.cos(this.toDouble());
  double atan2(num other) => math.atan2(this.toDouble(), other.toDouble());
  double sqrt() => math.sqrt(this.toDouble());
}

// Import math library
import 'dart:math' as math;

// Constants for geometric calculations  
const double _COORDINATE_TOLERANCE = 1e-7; // ~1cm precision (appropriate for GPS)