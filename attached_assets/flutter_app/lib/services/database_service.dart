import 'package:dreamflow_app/models/survey_models.dart';

class DatabaseService {
  // Static data storage for now
  static final List<SurveyTask> _tasks = [
    SurveyTask(id: '1', citizenName: 'أحمد محمد الحميدي', location: 'صنعاء - حي السبعين', status: 'مخصصة', createdAt: DateTime.now().subtract(const Duration(days: 2))),
    SurveyTask(id: '2', citizenName: 'فاطمة علي السالمي', location: 'عدن - المعلا', status: 'قيد التنفيذ', createdAt: DateTime.now().subtract(const Duration(days: 1))),
    SurveyTask(id: '3', citizenName: 'محمد سالم الزبيدي', location: 'تعز - صالة', status: 'مكتمل', createdAt: DateTime.now().subtract(const Duration(days: 5)), completedAt: DateTime.now().subtract(const Duration(days: 1)), isSynced: true),
  ];

  static final List<SurveyPoint> _points = [];
  static final List<SurveyPolygon> _polygons = [];
  static final List<SurveyLine> _lines = [];
  static final List<SurveyAttachment> _attachments = [];

  static Future<void> init() async {
    // Simple initialization - no Hive for now
  }

  static List<SurveyTask> getAllTasks() => _tasks;

  static SurveyTask? getTask(String id) {
    try {
      return _tasks.firstWhere((task) => task.id == id);
    } catch (e) {
      return null;
    }
  }

  static void saveTask(SurveyTask task) {
    final index = _tasks.indexWhere((t) => t.id == task.id);
    if (index != -1) {
      _tasks[index] = task;
    } else {
      _tasks.add(task);
    }
  }

  static List<SurveyPoint> getPointsByTask(String taskId) => _points.where((p) => p.taskId == taskId).toList();

  static void savePoint(SurveyPoint point) {
    final index = _points.indexWhere((p) => p.id == point.id);
    if (index != -1) {
      _points[index] = point;
    } else {
      _points.add(point);
    }
  }

  // Polygons
  static List<SurveyPolygon> getPolygonsByTask(String taskId) => _polygons.where((p) => p.taskId == taskId).toList();

  static void savePolygon(SurveyPolygon polygon) {
    final index = _polygons.indexWhere((p) => p.id == polygon.id);
    if (index != -1) {
      _polygons[index] = polygon;
    } else {
      _polygons.add(polygon);
    }
  }

  // Lines
  static List<SurveyLine> getLinesByTask(String taskId) => _lines.where((l) => l.taskId == taskId).toList();

  static void saveLine(SurveyLine line) {
    final index = _lines.indexWhere((l) => l.id == line.id);
    if (index != -1) {
      _lines[index] = line;
    } else {
      _lines.add(line);
    }
  }

  // Attachments
  static List<SurveyAttachment> getAttachmentsByPolygon(String polygonId) => _attachments.where((a) => a.polygonId == polygonId).toList();

  static void saveAttachment(SurveyAttachment attachment) {
    final index = _attachments.indexWhere((a) => a.id == attachment.id);
    if (index != -1) {
      _attachments[index] = attachment;
    } else {
      _attachments.add(attachment);
    }
  }

  static bool hasPendingSync(String taskId) {
    final task = getTask(taskId);
    if (task == null) return false;
    final anyPolygonPending = _polygons.any((p) => p.taskId == taskId && !p.isSynced);
    final anyLinePending = _lines.any((l) => l.taskId == taskId && !l.isSynced);
    final anyPointPending = _points.any((p) => p.taskId == taskId && !p.isSynced);
    final anyAttachmentPending = _attachments.any((a) => a.taskId == taskId && !a.isSynced);
    return !task.isSynced || anyPolygonPending || anyLinePending || anyPointPending || anyAttachmentPending;
  }

  static Map<String, dynamic> exportTaskPayload(String taskId) {
    final task = getTask(taskId);
    final polygons = getPolygonsByTask(taskId);
    final lines = getLinesByTask(taskId);
    final points = getPointsByTask(taskId);
    final attachments = _attachments.where((a) => a.taskId == taskId).toList();
    return {
      'task': {
        'id': task?.id,
        'citizenName': task?.citizenName,
        'location': task?.location,
        'status': task?.status,
        'createdAt': task?.createdAt.toIso8601String(),
        'completedAt': task?.completedAt?.toIso8601String(),
      },
      'polygons': polygons.map((p) => {
        'id': p.id,
        'featureCode': p.featureCode,
        'closed': p.closed,
        'createdAt': p.createdAt.toIso8601String(),
        'points': p.points.map((pt) => {'x': pt.x, 'y': pt.y}).toList(),
      }).toList(),
      'lines': lines.map((l) => {
        'id': l.id,
        'featureCode': l.featureCode,
        'createdAt': l.createdAt.toIso8601String(),
        'points': l.points.map((pt) => {'x': pt.x, 'y': pt.y}).toList(),
      }).toList(),
      'points': points.map((pt) => {
        'id': pt.id,
        'featureCode': pt.featureCode,
        'lat': pt.latitude,
        'lng': pt.longitude,
        'acc': pt.accuracy,
        'timestamp': pt.timestamp.toIso8601String(),
      }).toList(),
      'attachments': attachments.map((a) => {
        'id': a.id,
        'polygonId': a.polygonId,
        'type': a.type,
        'url': a.url,
        'note': a.note,
      }).toList(),
    };
  }
}
