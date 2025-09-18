import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:dreamflow_app/services/updated_database_service.dart';
import 'package:dreamflow_app/models/updated_survey_models.dart';
import 'package:dreamflow_app/models/geojson_models.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// نتيجة المزامنة
class SyncResult {
  final bool isSuccess;
  final String? errorMessage;
  final int? submittedOperations;
  final Map<String, dynamic>? responseData;
  
  const SyncResult({
    required this.isSuccess,
    this.errorMessage,
    this.submittedOperations,
    this.responseData,
  });
}

/// عملية مزامنة واحدة
class SyncOperation {
  final String type; // 'create', 'update', 'delete'
  final String tableName;
  final String recordId;
  final DateTime timestamp;
  final Map<String, dynamic>? oldData;
  final Map<String, dynamic>? newData;
  
  SyncOperation({
    required this.type,
    required this.tableName,
    required this.recordId,
    required this.timestamp,
    this.oldData,
    this.newData,
  });
  
  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'tableName': tableName,
      'recordId': recordId,
      'timestamp': timestamp.toIso8601String(),
      if (oldData != null) 'oldData': oldData,
      if (newData != null) 'newData': newData,
    };
  }
}

class SyncService {
  static const String _baseUrl = 'http://localhost:5000';
  static const String _syncEndpoint = '/api/mobile/v1/sync/apply';
  static bool _isInitialized = false;
  static Timer? _syncTimer;
  static bool isOnline = true;
  static const _storage = FlutterSecureStorage();

  static Future<void> init() async {
    if (_isInitialized) return;
    _isInitialized = true;
    // Start periodic background sync every 10 minutes
    _syncTimer = Timer.periodic(const Duration(minutes: 10), (timer) => syncPendingTasks());
  }

  /// مزامنة جميع المهام المعلقة
  static Future<void> syncPendingTasks() async {
    if (!isOnline) return;
    try {
      final allTasks = UpdatedDatabaseService.getAllTasks();
      for (final task in allTasks) {
        if (!task.isSynced && task.status == 'completed') {
          await submitCompletedSurvey(task.id);
        }
      }
    } catch (e) {
      print('خطأ في المزامنة التلقائية: $e');
    }
  }

  /// إرسال مهمة مسح مكتملة للخادم
  static Future<SyncResult> submitCompletedSurvey(String taskId) async {
    if (!isOnline) {
      return const SyncResult(
        isSuccess: false,
        errorMessage: 'غير متصل بالإنترنت',
      );
    }

    try {
      // جمع البيانات المحلية للمهمة
      final surveyData = await _collectSurveyData(taskId);
      if (surveyData.isEmpty) {
        return const SyncResult(
          isSuccess: false,
          errorMessage: 'لا توجد بيانات للإرسال',
        );
      }

      // تحضير payload للإرسال
      final deviceId = await _getDeviceId();
      final payload = {
        'deviceId': deviceId,
        'operations': surveyData,
      };

      // إرسال البيانات للخادم
      final response = await http.post(
        Uri.parse('$_baseUrl$_syncEndpoint'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${await _getAuthToken()}',
        },
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        
        // تحديث حالة المهمة كمُرسلة
        final task = UpdatedDatabaseService.getTaskById(taskId);
        if (task != null) {
          final updatedTask = task.copyWith(
            isSynced: true,
            lastSyncedAt: DateTime.now(),
          );
          UpdatedDatabaseService.updateTask(updatedTask);
        }

        return SyncResult(
          isSuccess: true,
          submittedOperations: surveyData.length,
          responseData: responseData,
        );
      } else {
        final errorData = jsonDecode(response.body);
        return SyncResult(
          isSuccess: false,
          errorMessage: errorData['message'] ?? 'خطأ في الخادم: ${response.statusCode}',
        );
      }
    } catch (e) {
      return SyncResult(
        isSuccess: false,
        errorMessage: 'خطأ في الإرسال: $e',
      );
    }
  }

  /// جمع كافة البيانات المحلية لمهمة معينة
  static Future<List<Map<String, dynamic>>> _collectSurveyData(String taskId) async {
    final operations = <Map<String, dynamic>>[];
    final now = DateTime.now();

    try {
      // جمع النقاط
      final points = UpdatedDatabaseService.getPointsBySession(taskId);
      for (final point in points) {
        operations.add(SyncOperation(
          type: 'create',
          tableName: 'mobileSurveyPoints',
          recordId: point.id,
          timestamp: now,
          newData: {
            'id': point.id,
            'sessionId': point.sessionId,
            'pointNumber': point.pointNumber,
            'position': {
              'longitude': point.position.longitude,
              'latitude': point.position.latitude,
              'elevation': point.position.elevation,
            },
            'accuracy': point.accuracy,
            'hdop': point.hdop,
            'vdop': point.vdop,
            'satelliteCount': point.satelliteCount,
            'pointType': point.pointType,
            'featureCode': point.featureCode,
            'description': point.description,
            'capturedAt': point.capturedAt.toIso8601String(),
            'createdAt': point.createdAt.toIso8601String(),
            'idempotencyKey': point.idempotencyKey,
          },
        ).toJson());
      }

      // جمع الهندسات (المضلعات والخطوط)
      final geometries = UpdatedDatabaseService.getGeometriesBySession(taskId);
      for (final geometry in geometries) {
        operations.add(SyncOperation(
          type: 'create',
          tableName: 'mobileSurveyGeometries',
          recordId: geometry.id,
          timestamp: now,
          newData: {
            'id': geometry.id,
            'sessionId': geometry.sessionId,
            'geometryType': geometry.geometryType,
            'coordinates': geometry.coordinates.map((pos) => [
              pos.longitude,
              pos.latitude,
              if (pos.elevation != null) pos.elevation,
            ]).toList(),
            'featureCode': geometry.featureCode,
            'description': geometry.description,
            'capturedAt': geometry.capturedAt.toIso8601String(),
            'createdAt': geometry.createdAt.toIso8601String(),
            'idempotencyKey': geometry.idempotencyKey,
          },
        ).toJson());
      }

      // جمع المرفقات
      final attachments = UpdatedDatabaseService.getAttachmentsBySession(taskId);
      for (final attachment in attachments) {
        operations.add(SyncOperation(
          type: 'create',
          tableName: 'mobileSurveyAttachments',
          recordId: attachment.id,
          timestamp: now,
          newData: {
            'id': attachment.id,
            'sessionId': attachment.sessionId,
            'attachmentType': attachment.attachmentType,
            'fileName': attachment.fileName,
            'filePath': attachment.filePath,
            'fileSize': attachment.fileSize,
            'mimeType': attachment.mimeType,
            'description': attachment.description,
            'capturedAt': attachment.capturedAt.toIso8601String(),
            'createdAt': attachment.createdAt.toIso8601String(),
            'idempotencyKey': attachment.idempotencyKey,
          },
        ).toJson());
      }

      print('جُمعت ${operations.length} عملية للمهمة $taskId');
      return operations;
    } catch (e) {
      print('خطأ في جمع البيانات: $e');
      return [];
    }
  }

  /// الحصول على معرف الجهاز
  static Future<String> _getDeviceId() async {
    String? deviceId = await _storage.read(key: 'device_id');
    if (deviceId == null) {
      deviceId = 'device_${DateTime.now().millisecondsSinceEpoch}';
      await _storage.write(key: 'device_id', value: deviceId);
    }
    return deviceId;
  }

  /// الحصول على رمز المصادقة
  static Future<String?> _getAuthToken() async {
    return await _storage.read(key: 'auth_token');
  }

  /// تعيين رمز المصادقة
  static Future<void> setAuthToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  /// التحقق من وجود بيانات غير مُرسلة
  static bool hasUnsubmittedData(String taskId) {
    final points = UpdatedDatabaseService.getPointsBySession(taskId);
    final geometries = UpdatedDatabaseService.getGeometriesBySession(taskId);
    final attachments = UpdatedDatabaseService.getAttachmentsBySession(taskId);
    
    return points.isNotEmpty || geometries.isNotEmpty || attachments.isNotEmpty;
  }

  /// إيقاف الخدمة
  static void dispose() {
    _syncTimer?.cancel();
    _isInitialized = false;
  }
}
