import 'package:hive/hive.dart';

part 'local_storage_models.g.dart';

// النموذج لتخزين المرفقات (الصور) محلياً
@HiveType(typeId: 0)
class AttachmentModel extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  String taskId; // ربط بالمهمة

  @HiveField(2)  
  String filePath; // مسار الملف المحلي

  @HiveField(3)
  String fileName; // اسم الملف

  @HiveField(4)
  String fileType; // نوع الملف (image/jpeg, image/png)

  @HiveField(5)
  int fileSizeBytes; // حجم الملف بالبايت

  @HiveField(6)
  DateTime capturedAt; // وقت التقاط الصورة

  @HiveField(7)
  double? latitude; // الإحداثيات - خط العرض

  @HiveField(8)
  double? longitude; // الإحداثيات - خط الطول

  @HiveField(9)
  double? accuracy; // دقة الموقع

  @HiveField(10)
  String description; // وصف الصورة

  @HiveField(11)
  bool isUploaded; // هل تم رفعها للخادم

  AttachmentModel({
    required this.id,
    required this.taskId,
    required this.filePath,
    required this.fileName,
    required this.fileType,
    required this.fileSizeBytes,
    required this.capturedAt,
    this.latitude,
    this.longitude,
    this.accuracy,
    this.description = '',
    this.isUploaded = false,
  });

  // تحويل من JSON
  factory AttachmentModel.fromJson(Map<String, dynamic> json) {
    return AttachmentModel(
      id: json['id'],
      taskId: json['taskId'],
      filePath: json['filePath'],
      fileName: json['fileName'],
      fileType: json['fileType'],
      fileSizeBytes: json['fileSizeBytes'],
      capturedAt: DateTime.parse(json['capturedAt']),
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      accuracy: json['accuracy']?.toDouble(),
      description: json['description'] ?? '',
      isUploaded: json['isUploaded'] ?? false,
    );
  }

  // تحويل إلى JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'filePath': filePath,
      'fileName': fileName,
      'fileType': fileType,
      'fileSizeBytes': fileSizeBytes,
      'capturedAt': capturedAt.toIso8601String(),
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'description': description,
      'isUploaded': isUploaded,
    };
  }
}

// النموذج لتخزين جلسات المسح محلياً  
@HiveType(typeId: 1)
class SurveySessionModel extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  String taskId; // ربط بالمهمة

  @HiveField(2)
  DateTime startTime; // وقت بدء المسح

  @HiveField(3)
  DateTime? endTime; // وقت انتهاء المسح

  @HiveField(4)
  String status; // active, paused, completed

  @HiveField(5)
  double? startLatitude; // نقطة البداية - خط العرض

  @HiveField(6)
  double? startLongitude; // نقطة البداية - خط الطول

  @HiveField(7)
  double? endLatitude; // نقطة النهاية - خط العرض

  @HiveField(8)
  double? endLongitude; // نقطة النهاية - خط الطول

  @HiveField(9)
  List<String> attachmentIds; // معرفات المرفقات المرتبطة

  @HiveField(10)
  Map<String, dynamic> surveyData; // بيانات المسح (قابلة للتوسع)

  @HiveField(11)
  String surveyorNotes; // ملاحظات المساح

  @HiveField(12)
  bool isSynced; // هل تم المزامنة مع الخادم

  SurveySessionModel({
    required this.id,
    required this.taskId,
    required this.startTime,
    this.endTime,
    this.status = 'active',
    this.startLatitude,
    this.startLongitude,
    this.endLatitude,
    this.endLongitude,
    required this.attachmentIds,
    required this.surveyData,
    this.surveyorNotes = '',
    this.isSynced = false,
  });

  // تحويل من JSON
  factory SurveySessionModel.fromJson(Map<String, dynamic> json) {
    return SurveySessionModel(
      id: json['id'],
      taskId: json['taskId'],
      startTime: DateTime.parse(json['startTime']),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      status: json['status'] ?? 'active',
      startLatitude: json['startLatitude']?.toDouble(),
      startLongitude: json['startLongitude']?.toDouble(),
      endLatitude: json['endLatitude']?.toDouble(),
      endLongitude: json['endLongitude']?.toDouble(),
      attachmentIds: List<String>.from(json['attachmentIds'] ?? []),
      surveyData: Map<String, dynamic>.from(json['surveyData'] ?? {}),
      surveyorNotes: json['surveyorNotes'] ?? '',
      isSynced: json['isSynced'] ?? false,
    );
  }

  // تحويل إلى JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'status': status,
      'startLatitude': startLatitude,
      'startLongitude': startLongitude,
      'endLatitude': endLatitude,
      'endLongitude': endLongitude,
      'attachmentIds': attachmentIds,
      'surveyData': surveyData,
      'surveyorNotes': surveyorNotes,
      'isSynced': isSynced,
    };
  }

  // حساب مدة المسح
  Duration? get duration {
    if (endTime != null) {
      return endTime!.difference(startTime);
    } else if (status == 'active') {
      return DateTime.now().difference(startTime);
    }
    return null;
  }

  // عدد المرفقات
  int get attachmentCount => attachmentIds.length;

  // هل الجلسة نشطة
  bool get isActive => status == 'active';

  // هل الجلسة مكتملة  
  bool get isCompleted => status == 'completed';
}