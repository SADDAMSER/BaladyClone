import 'dart:async';
import 'dart:convert';
import 'package:dreamflow_app/services/database_service.dart';

class SyncService {
  static bool _isInitialized = false;
  static Timer? _syncTimer;
  static bool isOnline = true; // simulation toggle

  static Future<void> init() async {
    if (_isInitialized) return;
    _isInitialized = true;
    _syncTimer = Timer.periodic(const Duration(minutes: 5), (timer) => syncAll());
  }

  static Future<void> syncAll() async {
    if (!isOnline) return;
    try {
      final tasks = DatabaseService.getAllTasks();
      for (final t in tasks) {
        if (DatabaseService.hasPendingSync(t.id)) {
          await syncTask(t.id);
        }
      }
    } catch (e) {
      // ignore: avoid_print
      print('Sync error: $e');
    }
  }

  static Future<void> syncTask(String taskId) async {
    if (!isOnline) return;
    final payload = DatabaseService.exportTaskPayload(taskId);
    // ignore: avoid_print
    print('SYNC->TASK:$taskId:PAYLOAD:${jsonEncode(payload)}');
    final task = DatabaseService.getTask(taskId);
    if (task != null) {
      task.isSynced = true;
      if (payload['polygons'] != null && (payload['polygons'] as List).isNotEmpty) {
        task.status = 'مكتمل';
        task.completedAt = DateTime.now();
      }
      DatabaseService.saveTask(task);
    }
  }

  static void dispose() {
    _syncTimer?.cancel();
    _isInitialized = false;
  }
}
