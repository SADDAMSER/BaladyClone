class LegacySurveyTask {
  String id;
  String citizenName;
  String location;
  String status; // مخصصة، قيد التنفيذ، مكتمل
  DateTime createdAt;
  DateTime? completedAt;
  bool isSynced; // synced with backend

  LegacySurveyTask({
    required this.id,
    required this.citizenName,
    required this.location,
    required this.status,
    required this.createdAt,
    this.completedAt,
    this.isSynced = false,
  });
}

class LegacySurveyPoint {
  String id;
  String taskId;
  double latitude;
  double longitude;
  double? elevation;
  double accuracy;
  DateTime timestamp;
  String? description;
  String? featureCode; // e.g., Tree, Manhole
  bool isSynced;

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
}

// A simple polygon captured on the map canvas (local pixel coordinates for demo)
class DraftPolygon {
  String id;
  String taskId;
  String featureCode; // e.g., Building, Vacant Land, Courtyard
  List<PolygonPoint> points; // in canvas space for simulation
  bool closed;
  DateTime createdAt;
  bool isSynced;

  DraftPolygon({
    required this.id,
    required this.taskId,
    required this.featureCode,
    required this.points,
    required this.closed,
    required this.createdAt,
    this.isSynced = false,
  });
}

// A simple polyline feature captured on the canvas (local pixel coordinates)
class DraftLine {
  String id;
  String taskId;
  String featureCode; // e.g., Fence, Road Centerline
  List<PolygonPoint> points; // in canvas space for simulation
  DateTime createdAt;
  bool isSynced;

  DraftLine({
    required this.id,
    required this.taskId,
    required this.featureCode,
    required this.points,
    required this.createdAt,
    this.isSynced = false,
  });
}

class PolygonPoint {
  double x;
  double y;
  PolygonPoint({required this.x, required this.y});
}

class SurveyAttachment {
  String id;
  String taskId;
  String? polygonId; // optional, attached to polygon
  String type; // photo
  String url; // network image url for demo
  String? note; // text note
  DateTime createdAt;
  bool isSynced;

  SurveyAttachment({
    required this.id,
    required this.taskId,
    required this.polygonId,
    required this.type,
    required this.url,
    this.note,
    required this.createdAt,
    this.isSynced = false,
  });
}
