/// Updated Sync Service for GeoJSON Survey Models
/// Handles synchronization with Yemen Digital Construction Platform APIs

import 'dart:async';
import 'dart:convert';
import 'package:dreamflow_app/services/updated_database_service.dart';
import 'package:dreamflow_app/models/updated_survey_models.dart';

/// Sync service for mobile survey data with server
class UpdatedSyncService {
  static bool _isInitialized = false;
  static Timer? _syncTimer;
  static Timer? _connectivityTimer;
  
  // Connectivity simulation
  static bool isOnline = true;
  static bool isWifiConnected = false;
  static String networkStatus = 'mobile_data';
  
  // Sync configuration
  static const Duration syncInterval = Duration(minutes: 5);
  static const Duration retryDelay = Duration(seconds: 30);
  static const int maxRetries = 3;
  
  // Sync statistics
  static int _totalSyncAttempts = 0;
  static int _successfulSyncs = 0;
  static int _failedSyncs = 0;
  static DateTime? _lastSyncTime;

  /// Initialize sync service
  static Future<void> init() async {
    if (_isInitialized) return;
    _isInitialized = true;
    
    // Start periodic sync
    _syncTimer = Timer.periodic(syncInterval, (_) => syncAll());
    
    // Simulate connectivity changes
    _connectivityTimer = Timer.periodic(const Duration(minutes: 2), (_) => _simulateConnectivityChange());
    
    // Initial connectivity check
    await checkConnectivity();
    
    print('🔄 UpdatedSyncService initialized - Auto-sync every ${syncInterval.inMinutes} minutes');
  }

  /// Simulate network connectivity changes (for testing)
  static void _simulateConnectivityChange() {
    // Randomly change connectivity status for testing
    final random = DateTime.now().millisecondsSinceEpoch % 10;
    
    if (random < 8) {
      isOnline = true;
      isWifiConnected = random < 4;
      networkStatus = isWifiConnected ? 'wifi' : 'mobile_data';
    } else {
      isOnline = false;
      isWifiConnected = false;
      networkStatus = 'offline';
    }
  }

  /// Check network connectivity
  static Future<bool> checkConnectivity() async {
    // In a real app, use connectivity_plus package
    // await Connectivity().checkConnectivity();
    
    return isOnline;
  }

  /// Sync all pending sessions
  static Future<Map<String, dynamic>> syncAll() async {
    if (!isOnline) {
      print('📵 Sync skipped - No internet connection');
      return {'status': 'skipped', 'reason': 'offline'};
    }

    _totalSyncAttempts++;
    final results = <String, dynamic>{
      'startTime': DateTime.now().toIso8601String(),
      'sessionsSynced': 0,
      'sessionsFailed': 0,
      'totalPoints': 0,
      'totalGeometries': 0,
      'totalAttachments': 0,
      'errors': <String>[],
    };

    try {
      final allTasks = UpdatedDatabaseService.getAllTasks();
      final pendingSessions = allTasks.where((task) => 
        UpdatedDatabaseService.hasPendingSync(task.id)
      ).toList();

      if (pendingSessions.isEmpty) {
        print('✅ No sessions require sync');
        return {'status': 'success', 'message': 'All sessions up to date', 'results': results};
      }

      print('🔄 Starting sync for ${pendingSessions.length} sessions...');

      for (final task in pendingSessions) {
        try {
          final syncResult = await syncSession(task.id);
          if (syncResult['success']) {
            results['sessionsSynced']++;
            results['totalPoints'] += syncResult['pointsSynced'] ?? 0;
            results['totalGeometries'] += syncResult['geometriesSynced'] ?? 0;
            results['totalAttachments'] += syncResult['attachmentsSynced'] ?? 0;
          } else {
            results['sessionsFailed']++;
            results['errors'].add('Session ${task.sessionNumber}: ${syncResult['error']}');
          }
        } catch (e) {
          results['sessionsFailed']++;
          results['errors'].add('Session ${task.sessionNumber}: $e');
          print('❌ Error syncing session ${task.id}: $e');
        }
      }

      results['endTime'] = DateTime.now().toIso8601String();
      _lastSyncTime = DateTime.now();

      if (results['sessionsFailed'] == 0) {
        _successfulSyncs++;
        print('✅ All sessions synced successfully');
        return {'status': 'success', 'results': results};
      } else {
        _failedSyncs++;
        print('⚠️  Some sessions failed to sync');
        return {'status': 'partial', 'results': results};
      }

    } catch (e) {
      _failedSyncs++;
      results['errors'].add('Sync process error: $e');
      print('❌ Sync process failed: $e');
      return {'status': 'failed', 'error': e.toString(), 'results': results};
    }
  }

  /// Sync specific session with server
  static Future<Map<String, dynamic>> syncSession(String sessionId) async {
    if (!isOnline) {
      return {'success': false, 'error': 'No internet connection'};
    }

    try {
      final sessionSummary = UpdatedDatabaseService.getSessionSummary(sessionId);
      if (sessionSummary == null) {
        return {'success': false, 'error': 'Session not found'};
      }

      // Export session data in server format
      final sessionPayload = UpdatedDatabaseService.exportSessionForSync(sessionId);
      
      print('🔄 Syncing session ${sessionSummary.task.sessionNumber}...');
      print('   📊 ${sessionSummary.points.length} points, ${sessionSummary.geometries.length} geometries, ${sessionSummary.attachments.length} attachments');

      // Simulate API calls to mobile endpoints
      final syncResults = await _performServerSync(sessionPayload);

      if (syncResults['success']) {
        // Mark session as synced in local database
        UpdatedDatabaseService.markSessionAsSynced(sessionId);
        
        // Update task status if completed
        if (sessionSummary.task.status == 'in_progress' && 
            sessionSummary.geometries.isNotEmpty) {
          final updatedTask = SurveyTask(
            id: sessionSummary.task.id,
            sessionNumber: sessionSummary.task.sessionNumber,
            applicationId: sessionSummary.task.applicationId,
            citizenName: sessionSummary.task.citizenName,
            location: sessionSummary.task.location,
            status: 'completed',
            surveyBounds: sessionSummary.task.surveyBounds,
            createdAt: sessionSummary.task.createdAt,
            startedAt: sessionSummary.task.startedAt,
            completedAt: DateTime.now(),
            isSynced: true,
            lastSyncAttempt: DateTime.now(),
            notes: sessionSummary.task.notes,
            metadata: sessionSummary.task.metadata,
          );
          UpdatedDatabaseService.saveTask(updatedTask);
        }

        print('✅ Session ${sessionSummary.task.sessionNumber} synced successfully');
        return {
          'success': true,
          'sessionNumber': sessionSummary.task.sessionNumber,
          'pointsSynced': sessionSummary.points.length,
          'geometriesSynced': sessionSummary.geometries.length,
          'attachmentsSynced': sessionSummary.attachments.length,
          'serverResponse': syncResults,
        };
      } else {
        print('❌ Session ${sessionSummary.task.sessionNumber} sync failed: ${syncResults['error']}');
        return {'success': false, 'error': syncResults['error']};
      }

    } catch (e) {
      print('❌ Exception during session sync: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Simulate server API sync calls
  static Future<Map<String, dynamic>> _performServerSync(Map<String, dynamic> sessionPayload) async {
    // Simulate network delay
    await Future.delayed(Duration(milliseconds: 500 + (DateTime.now().millisecondsSinceEpoch % 1000)));

    try {
      // Simulate different server responses
      final random = DateTime.now().millisecondsSinceEpoch % 10;
      
      if (random < 8) { // 80% success rate
        // Simulate successful sync to mobile API endpoints:
        // POST /api/mobile/v1/survey/sessions
        // POST /api/mobile/v1/survey/points  
        // POST /api/mobile/v1/survey/geometries
        // POST /api/mobile/v1/survey/attachments

        print('🌐 API SYNC -> Session: ${sessionPayload['session']['sessionNumber']}');
        print('🌐 API SYNC -> Points: ${(sessionPayload['points'] as List).length}');
        print('🌐 API SYNC -> Geometries: ${(sessionPayload['geometries'] as List).length}');
        print('🌐 API SYNC -> Attachments: ${(sessionPayload['attachments'] as List).length}');
        
        // Log GeoJSON output for debugging
        if ((sessionPayload['geometries'] as List).isNotEmpty) {
          final firstGeometry = sessionPayload['geometries'][0];
          print('🗺️  GeoJSON Sample: ${firstGeometry['geometryType']} - ${jsonEncode(firstGeometry['coordinates']).substring(0, 100)}...');
        }

        return {
          'success': true,
          'message': 'Session synced successfully',
          'serverId': 'srv_${DateTime.now().millisecondsSinceEpoch}',
          'timestamp': DateTime.now().toIso8601String(),
          'syncedCounts': {
            'points': (sessionPayload['points'] as List).length,
            'geometries': (sessionPayload['geometries'] as List).length,
            'attachments': (sessionPayload['attachments'] as List).length,
          }
        };
      } else if (random < 9) { // 10% network error
        return {
          'success': false,
          'error': 'Network timeout - server not responding',
          'errorCode': 'NETWORK_TIMEOUT',
          'retryable': true,
        };
      } else { // 10% validation error
        return {
          'success': false,
          'error': 'Server validation failed - invalid geometry format',
          'errorCode': 'VALIDATION_ERROR', 
          'retryable': false,
          'details': 'GeoJSON coordinates array malformed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'API call exception: $e',
        'errorCode': 'API_EXCEPTION',
        'retryable': true,
      };
    }
  }

  /// Force sync specific session (manual trigger)
  static Future<Map<String, dynamic>> forceSyncSession(String sessionId) async {
    print('🔄 Force sync requested for session: $sessionId');
    return await syncSession(sessionId);
  }

  /// Force sync all sessions (manual trigger)
  static Future<Map<String, dynamic>> forceSyncAll() async {
    print('🔄 Force sync all sessions requested');
    return await syncAll();
  }

  /// Upload specific attachment file
  static Future<Map<String, dynamic>> uploadAttachment(String attachmentId) async {
    if (!isOnline) {
      return {'success': false, 'error': 'No internet connection'};
    }

    // Simulate file upload to object storage
    await Future.delayed(const Duration(milliseconds: 2000)); // Upload delay

    final random = DateTime.now().millisecondsSinceEpoch % 10;
    if (random < 8) { // 80% success
      final serverUrl = 'https://storage.yemenplatform.gov.ye/attachments/att_${DateTime.now().millisecondsSinceEpoch}.jpg';
      print('📤 Attachment uploaded successfully: $serverUrl');
      
      return {
        'success': true,
        'serverUrl': serverUrl,
        'uploadedAt': DateTime.now().toIso8601String(),
      };
    } else {
      return {
        'success': false,
        'error': 'File upload failed - server storage full',
        'errorCode': 'UPLOAD_FAILED',
      };
    }
  }

  /// Export session as GeoJSON file
  static Map<String, dynamic> exportSessionAsGeoJSON(String sessionId) {
    return UpdatedDatabaseService.exportSessionAsGeoJSON(sessionId);
  }

  /// Get sync statistics  
  static Map<String, dynamic> getSyncStatistics() {
    return {
      'isOnline': isOnline,
      'networkStatus': networkStatus,
      'isWifiConnected': isWifiConnected,
      'lastSyncTime': _lastSyncTime?.toIso8601String(),
      'totalAttempts': _totalSyncAttempts,
      'successfulSyncs': _successfulSyncs,
      'failedSyncs': _failedSyncs,
      'successRate': _totalSyncAttempts > 0 
        ? (_successfulSyncs / _totalSyncAttempts * 100).toStringAsFixed(1)
        : '0.0',
      'pendingSessions': UpdatedDatabaseService.getAllTasks()
        .where((task) => UpdatedDatabaseService.hasPendingSync(task.id))
        .length,
      'configuration': {
        'syncInterval': '${syncInterval.inMinutes} minutes',
        'retryDelay': '${retryDelay.inSeconds} seconds',
        'maxRetries': maxRetries,
      },
    };
  }

  /// Test API connectivity
  static Future<Map<String, dynamic>> testConnectivity() async {
    print('🔍 Testing API connectivity...');
    
    try {
      // Simulate API health check
      await Future.delayed(const Duration(milliseconds: 500));
      
      if (!isOnline) {
        return {
          'success': false,
          'message': 'No internet connection',
          'timestamp': DateTime.now().toIso8601String(),
        };
      }

      // Simulate server health check
      return {
        'success': true,
        'message': 'API server reachable',
        'serverVersion': '2.1.0',
        'endpoints': {
          'sessions': '/api/mobile/v1/survey/sessions',
          'points': '/api/mobile/v1/survey/points',
          'geometries': '/api/mobile/v1/survey/geometries',
          'attachments': '/api/mobile/v1/survey/attachments',
        },
        'responseTime': '${500 + (DateTime.now().millisecondsSinceEpoch % 200)}ms',
        'timestamp': DateTime.now().toIso8601String(),
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'API connectivity test failed',
        'error': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      };
    }
  }

  /// Toggle connectivity for testing
  static void toggleConnectivity() {
    isOnline = !isOnline;
    networkStatus = isOnline ? 'wifi' : 'offline';
    print('📶 Connectivity toggled: ${isOnline ? 'ONLINE' : 'OFFLINE'}');
  }

  /// Set sync interval (for testing)
  static void setSyncInterval(Duration interval) {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(interval, (_) => syncAll());
    print('⏰ Sync interval updated to ${interval.inMinutes} minutes');
  }

  /// Clear sync statistics
  static void clearStatistics() {
    _totalSyncAttempts = 0;
    _successfulSyncs = 0;
    _failedSyncs = 0;
    _lastSyncTime = null;
    print('📊 Sync statistics cleared');
  }

  /// Dispose sync service
  static void dispose() {
    _syncTimer?.cancel();
    _connectivityTimer?.cancel();
    _isInitialized = false;
    print('🛑 UpdatedSyncService disposed');
  }
}