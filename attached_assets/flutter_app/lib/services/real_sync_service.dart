/// Real Sync Service for Yemen Construction Platform
/// Fetches tasks from actual API endpoints using JWT authentication

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:dreamflow_app/config/app_config.dart';
import 'package:dreamflow_app/services/secure_auth_service.dart';
import 'package:dreamflow_app/models/updated_survey_models.dart';

/// Real sync service that connects to mobile API endpoints
class RealSyncService {
  static bool _isInitialized = false;
  static Timer? _syncTimer;
  static Timer? _connectivityTimer;
  
  // Sync configuration
  static const Duration syncInterval = Duration(minutes: 5);
  static const Duration retryDelay = Duration(seconds: 30);
  static const int maxRetries = 3;
  
  // Sync statistics
  static int _totalSyncAttempts = 0;
  static int _successfulSyncs = 0;
  static int _failedSyncs = 0;
  static DateTime? _lastSyncTime;
  static List<SurveyTask> _cachedTasks = [];

  /// Initialize real sync service
  static Future<void> init() async {
    if (_isInitialized) return;
    _isInitialized = true;
    
    // Start periodic task sync
    _syncTimer = Timer.periodic(syncInterval, (_) => fetchTasks());
    
    print('🔄 RealSyncService initialized - Auto-sync every ${syncInterval.inMinutes} minutes');
    
    // Initial task fetch
    await fetchTasks();
  }

  /// Fetch tasks from real API endpoint
  static Future<Map<String, dynamic>> fetchTasks({bool forceRefresh = false}) async {
    if (!SecureAuthService.isLoggedIn) {
      print('❌ Cannot fetch tasks - user not authenticated');
      return {
        'success': false,
        'error': 'User not authenticated',
        'errorCode': 'NOT_AUTHENTICATED',
      };
    }

    _totalSyncAttempts++;
    
    try {
      print('🔄 Fetching tasks from GET /api/mobile/v1/tasks...');
      
      final headers = await SecureAuthService.getAuthHeaders();
      
      final response = await http.get(
        Uri.parse('${AppConfig.backendUrl}/api/mobile/v1/tasks'),
        headers: headers,
      ).timeout(Duration(seconds: AppConfig.requestTimeoutSeconds));

      print('🌐 Tasks response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        
        // Parse tasks from server response
        final List<SurveyTask> tasks = [];
        
        if (responseData['data'] != null && responseData['data'] is List) {
          for (final taskData in responseData['data']) {
            try {
              final task = SurveyTask(
                id: taskData['id'] ?? 'unknown_${DateTime.now().millisecondsSinceEpoch}',
                sessionNumber: taskData['sessionNumber'] ?? 'Unknown Session',
                applicationId: taskData['applicationId'] ?? '',
                citizenName: taskData['citizenName'] ?? 'Unknown Citizen',
                location: taskData['location'] ?? 'Unknown Location',
                status: _translateTaskStatus(taskData['status'] ?? 'pending'),
                surveyBounds: taskData['surveyBounds'] != null 
                  ? SurveyBounds.fromJson(taskData['surveyBounds'])
                  : null,
                createdAt: taskData['createdAt'] != null 
                  ? DateTime.parse(taskData['createdAt'])
                  : DateTime.now(),
                startedAt: taskData['startedAt'] != null 
                  ? DateTime.parse(taskData['startedAt'])
                  : null,
                completedAt: taskData['completedAt'] != null 
                  ? DateTime.parse(taskData['completedAt'])
                  : null,
                isSynced: true, // Tasks from server are synced by definition
                lastSyncAttempt: DateTime.now(),
                notes: taskData['notes'] ?? '',
                metadata: taskData['metadata'] ?? {},
              );
              tasks.add(task);
            } catch (e) {
              print('⚠️ Error parsing task ${taskData['id']}: $e');
            }
          }
        }

        _cachedTasks = tasks;
        _successfulSyncs++;
        _lastSyncTime = DateTime.now();
        
        print('✅ Fetched ${tasks.length} tasks from server');
        
        return {
          'success': true,
          'tasks': tasks,
          'totalTasks': tasks.length,
          'timestamp': DateTime.now().toIso8601String(),
          'source': 'server',
        };
        
      } else if (response.statusCode == 401) {
        // Unauthorized - try to refresh token
        print('🔒 Unauthorized response - attempting token refresh...');
        
        try {
          await SecureAuthService.refreshToken();
          // Retry with refreshed token
          return await fetchTasks(forceRefresh: forceRefresh);
        } catch (e) {
          print('❌ Token refresh failed: $e');
          
          _failedSyncs++;
          
          return {
            'success': false,
            'error': 'Session expired. Please login again.',
            'errorCode': 'TOKEN_EXPIRED',
            'needsReauth': true,
          };
        }
      } else {
        // Other HTTP errors
        _failedSyncs++;
        
        final errorMessage = response.statusCode == 404 
          ? 'Tasks endpoint not found'
          : 'Server error: ${response.statusCode}';
          
        print('❌ HTTP Error ${response.statusCode}: $errorMessage');
        
        return {
          'success': false,
          'error': errorMessage,
          'errorCode': 'HTTP_ERROR_${response.statusCode}',
          'statusCode': response.statusCode,
        };
      }
      
    } on http.ClientException catch (e) {
      _failedSyncs++;
      print('🌐 Network error fetching tasks: $e');
      
      return {
        'success': false,
        'error': 'Network connection error. Check your internet connection.',
        'errorCode': 'NETWORK_ERROR',
        'details': e.toString(),
      };
      
    } on FormatException catch (e) {
      _failedSyncs++;
      print('📄 JSON parse error: $e');
      
      return {
        'success': false,
        'error': 'Server response format error',
        'errorCode': 'PARSE_ERROR',
        'details': e.toString(),
      };
      
    } catch (e) {
      _failedSyncs++;
      print('🔥 Unexpected error fetching tasks: $e');
      
      return {
        'success': false,
        'error': 'Unexpected error occurred',
        'errorCode': 'UNEXPECTED_ERROR',
        'details': e.toString(),
      };
    }
  }

  /// Get cached tasks (for offline use)
  static List<SurveyTask> getCachedTasks() => List.from(_cachedTasks);

  /// Force refresh tasks from server
  static Future<Map<String, dynamic>> forceFetchTasks() async {
    print('🔄 Force fetch tasks requested');
    return await fetchTasks(forceRefresh: true);
  }

  /// Submit survey session to server
  static Future<Map<String, dynamic>> submitSurveySession({
    required String sessionId,
    required List<SurveyPoint> points,
    required List<SurveyGeometry> geometries,
    required List<SurveyAttachment> attachments,
  }) async {
    if (!SecureAuthService.isLoggedIn) {
      return {
        'success': false,
        'error': 'User not authenticated',
        'errorCode': 'NOT_AUTHENTICATED',
      };
    }

    try {
      print('📤 Submitting survey session: $sessionId');
      
      final headers = await SecureAuthService.getAuthHeaders();
      
      final payload = {
        'sessionId': sessionId,
        'points': points.map((p) => p.toJson()).toList(),
        'geometries': geometries.map((g) => g.toJson()).toList(),
        'attachments': attachments.map((a) => a.toJson()).toList(),
        'submittedAt': DateTime.now().toIso8601String(),
      };
      
      final response = await http.post(
        Uri.parse('${AppConfig.backendUrl}/api/mobile/v1/survey/submit'),
        headers: headers,
        body: jsonEncode(payload),
      ).timeout(Duration(seconds: AppConfig.requestTimeoutSeconds));

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        
        print('✅ Survey session submitted successfully');
        
        return {
          'success': true,
          'message': 'Survey session submitted successfully',
          'serverId': responseData['id'],
          'timestamp': DateTime.now().toIso8601String(),
        };
      } else {
        print('❌ Survey submission failed: ${response.statusCode}');
        
        return {
          'success': false,
          'error': 'Survey submission failed',
          'errorCode': 'SUBMISSION_ERROR',
          'statusCode': response.statusCode,
        };
      }
      
    } catch (e) {
      print('❌ Error submitting survey: $e');
      
      return {
        'success': false,
        'error': 'Survey submission error',
        'errorCode': 'SUBMISSION_EXCEPTION',
        'details': e.toString(),
      };
    }
  }

  /// Get sync statistics
  static Map<String, dynamic> getSyncStatistics() {
    return {
      'isAuthenticated': SecureAuthService.isLoggedIn,
      'lastSyncTime': _lastSyncTime?.toIso8601String(),
      'totalAttempts': _totalSyncAttempts,
      'successfulSyncs': _successfulSyncs,
      'failedSyncs': _failedSyncs,
      'successRate': _totalSyncAttempts > 0 
        ? (_successfulSyncs / _totalSyncAttempts * 100).toStringAsFixed(1)
        : '0.0',
      'cachedTasksCount': _cachedTasks.length,
      'configuration': {
        'syncInterval': '${syncInterval.inMinutes} minutes',
        'retryDelay': '${retryDelay.inSeconds} seconds',
        'maxRetries': maxRetries,
      },
    };
  }

  /// Test API connectivity
  static Future<Map<String, dynamic>> testConnectivity() async {
    print('🔍 Testing tasks API connectivity...');
    
    if (!SecureAuthService.isLoggedIn) {
      return {
        'success': false,
        'message': 'User not authenticated',
        'timestamp': DateTime.now().toIso8601String(),
      };
    }
    
    try {
      final startTime = DateTime.now();
      final headers = await SecureAuthService.getAuthHeaders();
      
      // Test API health endpoint
      final response = await http.get(
        Uri.parse('${AppConfig.backendUrl}/api/mobile/v1/health'),
        headers: headers,
      ).timeout(const Duration(seconds: 10));
      
      final responseTime = DateTime.now().difference(startTime).inMilliseconds;
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': 'API server reachable',
          'responseTime': '${responseTime}ms',
          'endpoints': {
            'tasks': '/api/mobile/v1/tasks',
            'submit': '/api/mobile/v1/survey/submit',
            'health': '/api/mobile/v1/health',
          },
          'timestamp': DateTime.now().toIso8601String(),
        };
      } else {
        return {
          'success': false,
          'message': 'API server not responding correctly',
          'statusCode': response.statusCode,
          'timestamp': DateTime.now().toIso8601String(),
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'API connectivity test failed',
        'error': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      };
    }
  }

  /// Clear sync statistics
  static void clearStatistics() {
    _totalSyncAttempts = 0;
    _successfulSyncs = 0;
    _failedSyncs = 0;
    _lastSyncTime = null;
    print('📊 Sync statistics cleared');
  }

  /// Set sync interval (for testing)
  static void setSyncInterval(Duration interval) {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(interval, (_) => fetchTasks());
    print('⏰ Sync interval updated to ${interval.inMinutes} minutes');
  }

  /// Dispose sync service
  static void dispose() {
    _syncTimer?.cancel();
    _connectivityTimer?.cancel();
    _isInitialized = false;
    print('🛑 RealSyncService disposed');
  }

  /// Translate server task status to Arabic
  static String _translateTaskStatus(String serverStatus) {
    switch (serverStatus.toLowerCase()) {
      case 'pending':
      case 'assigned':
        return 'مخصصة';
      case 'in_progress':
      case 'started':
        return 'قيد التنفيذ';
      case 'completed':
      case 'finished':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغية';
      default:
        return 'غير محدد';
    }
  }
}