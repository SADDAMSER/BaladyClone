/// Enhanced API Client with JWT Authentication Support
/// Integrates with AuthService for mobile API requests

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:dreamflow_app/config/app_config.dart';
import 'package:dreamflow_app/services/auth_service.dart';

/// HTTP response wrapper for API calls
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? error;
  final String? errorCode;
  final int statusCode;
  
  ApiResponse({
    required this.success,
    this.data,
    this.error,
    this.errorCode,
    required this.statusCode,
  });
}

/// Enhanced API client with authentication support
class ApiClient {
  static const Duration _timeout = Duration(seconds: 30);
  
  /// GET request with authentication
  static Future<ApiResponse<Map<String, dynamic>>> get(String endpoint) async {
    try {
      final headers = await AuthService.getAuthHeaders();
      
      print('📤 GET ${AppConfig.backendUrl}$endpoint');
      
      final response = await http
          .get(
            Uri.parse('${AppConfig.backendUrl}$endpoint'),
            headers: headers,
          )
          .timeout(_timeout);

      return _handleResponse(response);
    } on http.ClientException catch (e) {
      print('🌐 GET Network error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ في الاتصال بالخادم',
        errorCode: 'NETWORK_ERROR',
        statusCode: 0,
      );
    } catch (e) {
      print('🔥 GET Unexpected error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ غير متوقع',
        errorCode: 'UNKNOWN_ERROR',
        statusCode: 0,
      );
    }
  }

  /// POST request with authentication
  static Future<ApiResponse<Map<String, dynamic>>> post(
    String endpoint, 
    Map<String, dynamic> data,
  ) async {
    try {
      final headers = await AuthService.getAuthHeaders();
      
      print('📤 POST ${AppConfig.backendUrl}$endpoint');
      print('📋 Payload keys: ${data.keys.join(', ')}');
      
      final response = await http
          .post(
            Uri.parse('${AppConfig.backendUrl}$endpoint'),
            headers: headers,
            body: jsonEncode(data),
          )
          .timeout(_timeout);

      return _handleResponse(response);
    } on http.ClientException catch (e) {
      print('🌐 POST Network error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ في الاتصال بالخادم',
        errorCode: 'NETWORK_ERROR',
        statusCode: 0,
      );
    } catch (e) {
      print('🔥 POST Unexpected error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ غير متوقع',
        errorCode: 'UNKNOWN_ERROR',
        statusCode: 0,
      );
    }
  }

  /// PUT request with authentication
  static Future<ApiResponse<Map<String, dynamic>>> put(
    String endpoint, 
    Map<String, dynamic> data,
  ) async {
    try {
      final headers = await AuthService.getAuthHeaders();
      
      print('📤 PUT ${AppConfig.backendUrl}$endpoint');
      
      final response = await http
          .put(
            Uri.parse('${AppConfig.backendUrl}$endpoint'),
            headers: headers,
            body: jsonEncode(data),
          )
          .timeout(_timeout);

      return _handleResponse(response);
    } on http.ClientException catch (e) {
      print('🌐 PUT Network error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ في الاتصال بالخادم',
        errorCode: 'NETWORK_ERROR',
        statusCode: 0,
      );
    } catch (e) {
      print('🔥 PUT Unexpected error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ غير متوقع',
        errorCode: 'UNKNOWN_ERROR',
        statusCode: 0,
      );
    }
  }

  /// DELETE request with authentication
  static Future<ApiResponse<Map<String, dynamic>>> delete(String endpoint) async {
    try {
      final headers = await AuthService.getAuthHeaders();
      
      print('📤 DELETE ${AppConfig.backendUrl}$endpoint');
      
      final response = await http
          .delete(
            Uri.parse('${AppConfig.backendUrl}$endpoint'),
            headers: headers,
          )
          .timeout(_timeout);

      return _handleResponse(response);
    } on http.ClientException catch (e) {
      print('🌐 DELETE Network error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ في الاتصال بالخادم',
        errorCode: 'NETWORK_ERROR',
        statusCode: 0,
      );
    } catch (e) {
      print('🔥 DELETE Unexpected error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ غير متوقع',
        errorCode: 'UNKNOWN_ERROR',
        statusCode: 0,
      );
    }
  }

  /// Handle HTTP response and parse JSON
  static ApiResponse<Map<String, dynamic>> _handleResponse(http.Response response) {
    print('📥 Response ${response.statusCode}: ${response.body.length} bytes');
    
    try {
      final Map<String, dynamic> responseData = jsonDecode(response.body);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse(
          success: true,
          data: responseData,
          statusCode: response.statusCode,
        );
      } else {
        // Handle different error response formats
        String errorMessage = 'خطأ في الخادم';
        String? errorCode;

        if (responseData.containsKey('error')) {
          final error = responseData['error'];
          if (error is String) {
            errorMessage = error;
          } else if (error is Map && error.containsKey('message')) {
            errorMessage = error['message'];
            errorCode = error['code'];
          }
        } else if (responseData.containsKey('message')) {
          errorMessage = responseData['message'];
        }

        return ApiResponse(
          success: false,
          error: errorMessage,
          errorCode: errorCode,
          statusCode: response.statusCode,
        );
      }
    } on FormatException catch (e) {
      print('📄 JSON parse error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ في تحليل استجابة الخادم',
        errorCode: 'PARSE_ERROR',
        statusCode: response.statusCode,
      );
    }
  }

  /// Upload file (for survey attachments)
  static Future<ApiResponse<Map<String, dynamic>>> uploadFile(
    String endpoint,
    String filePath,
    String fieldName, {
    Map<String, String>? additionalFields,
  }) async {
    try {
      final headers = await AuthService.getAuthHeaders();
      
      // Remove Content-Type header for multipart requests
      headers.remove('Content-Type');
      
      print('📤 UPLOAD ${AppConfig.backendUrl}$endpoint');
      print('📁 File: $filePath');
      
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConfig.backendUrl}$endpoint'),
      );
      
      request.headers.addAll(headers);
      
      // Add file
      request.files.add(await http.MultipartFile.fromPath(fieldName, filePath));
      
      // Add additional fields
      if (additionalFields != null) {
        request.fields.addAll(additionalFields);
      }

      final streamedResponse = await request.send().timeout(_timeout);
      final response = await http.Response.fromStream(streamedResponse);

      return _handleResponse(response);
    } on http.ClientException catch (e) {
      print('🌐 UPLOAD Network error: $e');
      return ApiResponse(
        success: false,
        error: 'خطأ في رفع الملف',
        errorCode: 'UPLOAD_NETWORK_ERROR',
        statusCode: 0,
      );
    } catch (e) {
      print('🔥 UPLOAD Unexpected error: $e');
      return ApiResponse(
        success: false,
        error: 'فشل في رفع الملف',
        errorCode: 'UPLOAD_ERROR',
        statusCode: 0,
      );
    }
  }

  /// Check API connectivity  
  static Future<ApiResponse<Map<String, dynamic>>> checkConnectivity() async {
    try {
      print('🔍 Checking API connectivity...');
      
      final response = await http
          .get(
            Uri.parse('${AppConfig.backendUrl}/api/health'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return ApiResponse(
          success: true,
          data: {'message': 'API server reachable'},
          statusCode: response.statusCode,
        );
      } else {
        return ApiResponse(
          success: false,
          error: 'خادم API غير متاح',
          errorCode: 'SERVER_UNAVAILABLE',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      print('🌐 Connectivity check failed: $e');
      return ApiResponse(
        success: false,
        error: 'لا يمكن الوصول للخادم',
        errorCode: 'NO_CONNECTIVITY',
        statusCode: 0,
      );
    }
  }

  /// Get backend URL for reference
  static String get baseUrl => AppConfig.backendUrl;

  /// Get request timeout duration
  static Duration get timeout => _timeout;
}