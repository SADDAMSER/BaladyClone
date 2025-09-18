import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Location Service for GPS functionality
/// Handles location permissions and GPS positioning for Yemen Construction Platform
class LocationService {
  static LocationService? _instance;
  static LocationService get instance => _instance ??= LocationService._internal();

  LocationService._internal();

  Position? _lastKnownPosition;
  StreamSubscription<Position>? _positionSubscription;
  final StreamController<Position> _positionController = StreamController<Position>.broadcast();

  /// Stream of location updates
  Stream<Position> get positionStream => _positionController.stream;

  /// Get current location with error handling
  Future<LocationResult> getCurrentLocation() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return LocationResult.error('خدمات الموقع غير مفعلة. يرجى تفعيل الـ GPS.|ENABLE_LOCATION');
      }

      // Check permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return LocationResult.error('تم رفض أذونات الموقع. يرجى تفعيل أذونات الموقع للتطبيق.');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return LocationResult.error('أذونات الموقع مرفوضة نهائياً. يرجى تفعيلها من إعدادات الجهاز.|OPEN_SETTINGS');
      }

      // Get current position with high accuracy for surveying
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );

      _lastKnownPosition = position;
      _positionController.add(position);

      return LocationResult.success(position);
    } catch (e) {
      debugPrint('خطأ في الحصول على الموقع: $e');
      return LocationResult.error('فشل في الحصول على الموقع: ${e.toString()}');
    }
  }

  /// Get last known position (cached)
  Position? get lastKnownPosition => _lastKnownPosition;

  /// Start continuous location updates for surveying
  Future<bool> startLocationUpdates() async {
    try {
      final locationResult = await getCurrentLocation();
      if (!locationResult.isSuccess) {
        return false;
      }

      // Start continuous location updates
      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 1, // Update every 1 meter
        ),
      ).listen((Position position) {
        _lastKnownPosition = position;
        _positionController.add(position);
      });

      return true;
    } catch (e) {
      debugPrint('خطأ في بدء تحديثات الموقع: $e');
      return false;
    }
  }

  /// Stop location updates to save battery
  void stopLocationUpdates() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
  }

  /// Calculate distance between two points in meters
  double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }

  /// Format coordinates for display
  String formatCoordinates(double latitude, double longitude) {
    return '${latitude.toStringAsFixed(6)}°، ${longitude.toStringAsFixed(6)}°';
  }

  /// Get accuracy description in Arabic
  String getAccuracyDescription(double accuracy) {
    if (accuracy <= 3) {
      return 'دقة عالية جداً';
    } else if (accuracy <= 5) {
      return 'دقة عالية';
    } else if (accuracy <= 10) {
      return 'دقة متوسطة';
    } else {
      return 'دقة منخفضة';
    }
  }

  /// Check if location is suitable for surveying (high accuracy)
  bool isSuitableForSurveying(Position position) {
    return position.accuracy <= 5.0; // 5 meters or better
  }

  /// Dispose resources
  void dispose() {
    stopLocationUpdates();
    _positionController.close();
  }
}

/// Result wrapper for location operations
class LocationResult {
  final bool isSuccess;
  final Position? position;
  final String? error;

  LocationResult._({required this.isSuccess, this.position, this.error});

  factory LocationResult.success(Position position) =>
      LocationResult._(isSuccess: true, position: position);

  factory LocationResult.error(String error) =>
      LocationResult._(isSuccess: false, error: error);
}