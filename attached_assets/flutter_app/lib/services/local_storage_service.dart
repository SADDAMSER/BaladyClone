import 'dart:io';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';
import '../models/local_storage_models.dart';

class LocalStorageService {
  static final LocalStorageService _instance = LocalStorageService._internal();
  factory LocalStorageService() => _instance;
  LocalStorageService._internal();

  static const String _attachmentsBoxName = 'attachments';
  static const String _surveySessionsBoxName = 'survey_sessions';

  late Box<AttachmentModel> _attachmentsBox;
  late Box<SurveySessionModel> _surveySessionsBox;

  // تهيئة Hive وقواعد البيانات المحلية
  Future<void> initialize() async {
    await Hive.initFlutter();
    
    // تسجيل نماذج البيانات
    if (!Hive.isAdapterRegistered(0)) {
      Hive.registerAdapter(AttachmentModelAdapter());
    }
    if (!Hive.isAdapterRegistered(1)) {
      Hive.registerAdapter(SurveySessionModelAdapter());
    }

    // فتح قواعد البيانات المحلية
    _attachmentsBox = await Hive.openBox<AttachmentModel>(_attachmentsBoxName);
    _surveySessionsBox = await Hive.openBox<SurveySessionModel>(_surveySessionsBoxName);
  }

  // === إدارة المرفقات (الصور) ===
  
  // حفظ مرفق جديد
  Future<void> saveAttachment(AttachmentModel attachment) async {
    await _attachmentsBox.put(attachment.id, attachment);
  }

  // الحصول على مرفق بالمعرف
  AttachmentModel? getAttachment(String id) {
    return _attachmentsBox.get(id);
  }

  // الحصول على جميع مرفقات مهمة محددة
  List<AttachmentModel> getTaskAttachments(String taskId) {
    return _attachmentsBox.values
        .where((attachment) => attachment.taskId == taskId)
        .toList()
      ..sort((a, b) => b.capturedAt.compareTo(a.capturedAt)); // ترتيب حسب وقت التقاط
  }

  // الحصول على جميع المرفقات غير المرفوعة
  List<AttachmentModel> getUnuploadedAttachments() {
    return _attachmentsBox.values
        .where((attachment) => !attachment.isUploaded)
        .toList();
  }

  // تحديث حالة الرفع للمرفق
  Future<void> markAttachmentAsUploaded(String id) async {
    final attachment = _attachmentsBox.get(id);
    if (attachment != null) {
      attachment.isUploaded = true;
      await attachment.save();
    }
  }

  // حذف مرفق
  Future<void> deleteAttachment(String id) async {
    final attachment = _attachmentsBox.get(id);
    if (attachment != null) {
      // حذف الملف من النظام
      try {
        final file = File(attachment.filePath);
        if (await file.exists()) {
          await file.delete();
        }
      } catch (e) {
        print('خطأ في حذف الملف: $e');
      }
      
      // حذف من قاعدة البيانات
      await _attachmentsBox.delete(id);
    }
  }

  // === إدارة جلسات المسح ===
  
  // حفظ جلسة مسح جديدة
  Future<void> saveSurveySession(SurveySessionModel session) async {
    await _surveySessionsBox.put(session.id, session);
  }

  // الحصول على جلسة مسح بالمعرف
  SurveySessionModel? getSurveySession(String id) {
    return _surveySessionsBox.get(id);
  }

  // الحصول على جميع جلسات المسح لمهمة محددة
  List<SurveySessionModel> getTaskSurveySessions(String taskId) {
    return _surveySessionsBox.values
        .where((session) => session.taskId == taskId)
        .toList()
      ..sort((a, b) => b.startTime.compareTo(a.startTime)); // ترتيب حسب وقت البدء
  }

  // الحصول على الجلسة النشطة لمهمة محددة
  SurveySessionModel? getActiveSessionForTask(String taskId) {
    return _surveySessionsBox.values
        .where((session) => session.taskId == taskId && session.isActive)
        .firstOrNull;
  }

  // الحصول على جميع الجلسات غير المتزامنة
  List<SurveySessionModel> getUnsyncedSessions() {
    return _surveySessionsBox.values
        .where((session) => !session.isSynced)
        .toList();
  }

  // إنهاء جلسة مسح
  Future<void> completeSurveySession(String sessionId, {
    double? endLatitude,
    double? endLongitude,
    String? surveyorNotes,
    Map<String, dynamic>? additionalData,
  }) async {
    final session = _surveySessionsBox.get(sessionId);
    if (session != null) {
      session.endTime = DateTime.now();
      session.status = 'completed';
      if (endLatitude != null) session.endLatitude = endLatitude;
      if (endLongitude != null) session.endLongitude = endLongitude;
      if (surveyorNotes != null) session.surveyorNotes = surveyorNotes;
      if (additionalData != null) {
        session.surveyData.addAll(additionalData);
      }
      await session.save();
    }
  }

  // إضافة مرفق إلى جلسة مسح
  Future<void> addAttachmentToSession(String sessionId, String attachmentId) async {
    final session = _surveySessionsBox.get(sessionId);
    if (session != null && !session.attachmentIds.contains(attachmentId)) {
      session.attachmentIds.add(attachmentId);
      await session.save();
    }
  }

  // تحديث حالة المزامنة للجلسة
  Future<void> markSessionAsSynced(String sessionId) async {
    final session = _surveySessionsBox.get(sessionId);
    if (session != null) {
      session.isSynced = true;
      await session.save();
    }
  }

  // === إحصائيات عامة ===
  
  // عدد المرفقات الكلي
  int get totalAttachments => _attachmentsBox.length;

  // عدد الجلسات الكلي
  int get totalSurveySessions => _surveySessionsBox.length;

  // عدد المرفقات غير المرفوعة
  int get unuploadedAttachmentsCount => 
      _attachmentsBox.values.where((a) => !a.isUploaded).length;

  // عدد الجلسات غير المتزامنة
  int get unsyncedSessionsCount => 
      _surveySessionsBox.values.where((s) => !s.isSynced).length;

  // حجم البيانات المحلية (تقديري)
  Future<int> getLocalDataSize() async {
    int totalSize = 0;
    for (final attachment in _attachmentsBox.values) {
      totalSize += attachment.fileSizeBytes;
    }
    return totalSize;
  }

  // === تنظيف البيانات ===
  
  // حذف جميع البيانات المتزامنة القديمة
  Future<void> cleanupSyncedData({int daysOld = 30}) async {
    final cutoffDate = DateTime.now().subtract(Duration(days: daysOld));
    
    // حذف المرفقات القديمة المرفوعة
    final oldAttachments = _attachmentsBox.values
        .where((a) => a.isUploaded && a.capturedAt.isBefore(cutoffDate))
        .toList();
    
    for (final attachment in oldAttachments) {
      await deleteAttachment(attachment.id);
    }

    // حذف الجلسات القديمة المتزامنة
    final oldSessions = _surveySessionsBox.values
        .where((s) => s.isSynced && s.startTime.isBefore(cutoffDate))
        .map((s) => s.id)
        .toList();
    
    for (final sessionId in oldSessions) {
      await _surveySessionsBox.delete(sessionId);
    }
  }

  // إغلاق قواعد البيانات
  Future<void> close() async {
    await _attachmentsBox.close();
    await _surveySessionsBox.close();
  }
}