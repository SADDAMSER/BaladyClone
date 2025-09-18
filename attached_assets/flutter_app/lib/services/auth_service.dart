/// Real Authentication Service for Yemen Construction Platform
/// Connects to mobile authentication API endpoints

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dreamflow_app/config/app_config.dart';

/// Authentication response from server
class AuthResponse {
  final bool success;
  final String? accessToken;
  final String? refreshToken;
  final Map<String, dynamic>? user;
  final String? error;
  final String? errorCode;
  final DateTime? expiresAt;

  AuthResponse({
    required this.success,
    this.accessToken,
    this.refreshToken,
    this.user,
    this.error,
    this.errorCode,
    this.expiresAt,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      success: json['success'] ?? false,
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
      user: json['user'],
      error: json['error'] is Map ? json['error']['message'] : json['error'],
      errorCode: json['error'] is Map ? json['error']['code'] : null,
      expiresAt: json['expiresAt'] != null 
        ? DateTime.parse(json['expiresAt'])
        : null,
    );
  }
}

/// Main authentication service for mobile app
class AuthService {
  // SharedPreferences keys for secure token storage
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token'; 
  static const String _userDataKey = 'user_data';
  static const String _deviceIdKey = 'device_id';
  static const String _tokenExpiryKey = 'token_expiry';

  // Current authentication state
  static bool _isLoggedIn = false;
  static Map<String, dynamic>? _currentUser;
  static String? _accessToken;
  static String? _refreshToken;
  static DateTime? _tokenExpiry;

  /// Initialize authentication service
  static Future<void> init() async {
    try {
      await _loadStoredTokens();
      await _validateTokens();
    } catch (e) {
      print('AuthService init error: $e');
      // Clear any corrupt data
      await _clearStoredTokens();
    }
  }

  /// Login with username and password
  static Future<AuthResponse> login(String username, String password) async {
    try {
      // Get device information
      final deviceInfo = await _getDeviceInfo();
      
      // Prepare login payload
      final payload = {
        'username': username.trim(),
        'password': password,
        'deviceName': deviceInfo['deviceName'],
        'deviceModel': deviceInfo['deviceModel'],
        'osVersion': deviceInfo['osVersion'],
        'appVersion': AppConfig.version,
      };

      print('🔐 Attempting login for user: $username');
      
      // Make API request to mobile login endpoint
      final response = await http.post(
        Uri.parse('${AppConfig.backendUrl}/api/mobile/v1/auth/login'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Device-ID': deviceInfo['deviceId'],
        },
        body: jsonEncode(payload),
      ).timeout(Duration(seconds: AppConfig.requestTimeoutSeconds));

      print('🌐 Login response status: ${response.statusCode}');
      
      // Parse response
      final responseData = jsonDecode(response.body);
      final authResponse = AuthResponse.fromJson(responseData);

      if (response.statusCode == 200 && authResponse.success) {
        // Login successful - store tokens and user data
        await _storeAuthData(
          accessToken: authResponse.accessToken!,
          refreshToken: authResponse.refreshToken,
          userData: authResponse.user!,
          expiresAt: authResponse.expiresAt,
        );

        _isLoggedIn = true;
        _currentUser = authResponse.user;
        _accessToken = authResponse.accessToken;
        _refreshToken = authResponse.refreshToken;
        _tokenExpiry = authResponse.expiresAt;

        print('✅ Login successful for user: ${authResponse.user?['username']}');
        
        return authResponse;
      } else {
        // Login failed
        print('❌ Login failed: ${authResponse.error}');
        await _clearStoredTokens();
        return authResponse;
      }

    } on http.ClientException catch (e) {
      print('🌐 Network error during login: $e');
      return AuthResponse(
        success: false,
        error: 'خطأ في الاتصال بالخادم. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.',
        errorCode: 'NETWORK_ERROR',
      );
    } on FormatException catch (e) {
      print('📄 JSON parse error: $e');
      return AuthResponse(
        success: false,
        error: 'خطأ في تحليل استجابة الخادم',
        errorCode: 'PARSE_ERROR',
      );
    } catch (e) {
      print('🔥 Unexpected login error: $e');
      return AuthResponse(
        success: false,
        error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        errorCode: 'UNKNOWN_ERROR',
      );
    }
  }

  /// Logout and clear stored tokens
  static Future<void> logout() async {
    try {
      // Optionally call logout API endpoint
      if (_accessToken != null) {
        try {
          await http.post(
            Uri.parse('${AppConfig.backendUrl}/api/mobile/v1/auth/logout'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $_accessToken',
            },
          ).timeout(const Duration(seconds: 5));
        } catch (e) {
          // Continue with local logout even if server logout fails
          print('Server logout failed (continuing with local logout): $e');
        }
      }

      // Clear local authentication state
      await _clearStoredTokens();
      _isLoggedIn = false;
      _currentUser = null;
      _accessToken = null;
      _refreshToken = null;
      _tokenExpiry = null;

      print('👋 User logged out successfully');
    } catch (e) {
      print('Logout error: $e');
    }
  }

  /// Check if user is currently logged in with valid token
  static bool get isLoggedIn {
    if (!_isLoggedIn || _accessToken == null) return false;
    
    // Check token expiry
    if (_tokenExpiry != null && DateTime.now().isAfter(_tokenExpiry!)) {
      print('🕒 Access token expired');
      // Should trigger refresh or logout
      return false;
    }
    
    return true;
  }

  /// Get current authenticated user data
  static Map<String, dynamic>? get currentUser => _currentUser;

  /// Get current access token
  static String? get accessToken => _accessToken;

  /// Get device-specific authorization headers for API requests
  static Future<Map<String, String>> getAuthHeaders() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (_accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }

    // Add device ID if available
    final prefs = await SharedPreferences.getInstance();
    final deviceId = prefs.getString(_deviceIdKey);
    if (deviceId != null) {
      headers['X-Device-ID'] = deviceId;
    }

    return headers;
  }

  /// Refresh access token using refresh token
  static Future<AuthResponse> refreshToken() async {
    if (_refreshToken == null) {
      return AuthResponse(
        success: false,
        error: 'لا يوجد رمز تجديد متاح',
        errorCode: 'NO_REFRESH_TOKEN',
      );
    }

    try {
      final response = await http.post(
        Uri.parse('${AppConfig.backendUrl}/api/mobile/v1/auth/refresh'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_refreshToken',
        },
      ).timeout(Duration(seconds: AppConfig.requestTimeoutSeconds));

      final responseData = jsonDecode(response.body);
      final authResponse = AuthResponse.fromJson(responseData);

      if (response.statusCode == 200 && authResponse.success) {
        // Update tokens
        await _storeAuthData(
          accessToken: authResponse.accessToken!,
          refreshToken: authResponse.refreshToken ?? _refreshToken,
          userData: _currentUser!,
          expiresAt: authResponse.expiresAt,
        );

        _accessToken = authResponse.accessToken;
        _refreshToken = authResponse.refreshToken ?? _refreshToken;
        _tokenExpiry = authResponse.expiresAt;

        print('🔄 Token refreshed successfully');
        return authResponse;
      } else {
        // Refresh failed - force logout
        print('❌ Token refresh failed: ${authResponse.error}');
        await logout();
        return authResponse;
      }
    } catch (e) {
      print('🔄 Token refresh error: $e');
      return AuthResponse(
        success: false,
        error: 'فشل في تجديد رمز المصادقة',
        errorCode: 'REFRESH_ERROR',
      );
    }
  }

  /// Store authentication data securely
  static Future<void> _storeAuthData({
    required String accessToken,
    String? refreshToken,
    required Map<String, dynamic> userData,
    DateTime? expiresAt,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    
    await prefs.setString(_accessTokenKey, accessToken);
    if (refreshToken != null) {
      await prefs.setString(_refreshTokenKey, refreshToken);
    }
    await prefs.setString(_userDataKey, jsonEncode(userData));
    if (expiresAt != null) {
      await prefs.setString(_tokenExpiryKey, expiresAt.toIso8601String());
    }

    print('💾 Auth data stored successfully');
  }

  /// Load stored tokens from SharedPreferences
  static Future<void> _loadStoredTokens() async {
    final prefs = await SharedPreferences.getInstance();
    
    _accessToken = prefs.getString(_accessTokenKey);
    _refreshToken = prefs.getString(_refreshTokenKey);
    
    final userDataJson = prefs.getString(_userDataKey);
    if (userDataJson != null) {
      _currentUser = jsonDecode(userDataJson);
    }

    final tokenExpiryString = prefs.getString(_tokenExpiryKey);
    if (tokenExpiryString != null) {
      _tokenExpiry = DateTime.parse(tokenExpiryString);
    }

    _isLoggedIn = _accessToken != null && _currentUser != null;
    
    if (_isLoggedIn) {
      print('📱 Loaded stored auth data for user: ${_currentUser?['username']}');
    }
  }

  /// Validate stored tokens and refresh if needed
  static Future<void> _validateTokens() async {
    if (!_isLoggedIn || _accessToken == null) return;

    // Check if token is expired
    if (_tokenExpiry != null && DateTime.now().isAfter(_tokenExpiry!)) {
      print('🕒 Token expired, attempting refresh...');
      final refreshResult = await refreshToken();
      if (!refreshResult.success) {
        print('❌ Token refresh failed, logging out');
        await logout();
      }
    }
  }

  /// Clear all stored tokens and auth data
  static Future<void> _clearStoredTokens() async {
    final prefs = await SharedPreferences.getInstance();
    
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
    await prefs.remove(_userDataKey);
    await prefs.remove(_tokenExpiryKey);
    
    print('🗑️  Cleared stored auth tokens');
  }

  /// Generate device information for registration
  static Future<Map<String, String>> _getDeviceInfo() async {
    final prefs = await SharedPreferences.getInstance();
    
    // Get or generate device ID
    String? deviceId = prefs.getString(_deviceIdKey);
    if (deviceId == null) {
      deviceId = _generateDeviceId();
      await prefs.setString(_deviceIdKey, deviceId);
      print('📱 Generated new device ID: $deviceId');
    } else {
      print('📱 Using existing device ID: $deviceId');
    }

    // Get platform information
    final platform = Platform.operatingSystem;
    final version = Platform.operatingSystemVersion;

    return {
      'deviceId': deviceId,
      'deviceName': '$platform Device', // In real app, get actual device name
      'deviceModel': Platform.isAndroid ? 'Android Device' : 'iOS Device',
      'osVersion': version,
    };
  }

  /// Generate unique device ID
  static String _generateDeviceId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp % 10000).toString();
    return 'flutter_device_$timestamp$random';
  }

  /// Get user role for role-based UI logic
  static String? getUserRole() {
    return _currentUser?['role'];
  }

  /// Get user permissions list
  static List<String> getUserPermissions() {
    final permissions = _currentUser?['permissions'];
    if (permissions is List) {
      return permissions.cast<String>();
    }
    return [];
  }

  /// Check if user has specific permission
  static bool hasPermission(String permission) {
    return getUserPermissions().contains(permission);
  }

  /// Get authentication statistics for debugging
  static Map<String, dynamic> getDebugInfo() {
    return {
      'isLoggedIn': _isLoggedIn,
      'hasAccessToken': _accessToken != null,
      'hasRefreshToken': _refreshToken != null,
      'tokenExpiry': _tokenExpiry?.toIso8601String(),
      'currentUser': _currentUser?['username'],
      'userRole': getUserRole(),
      'permissions': getUserPermissions(),
    };
  }
}