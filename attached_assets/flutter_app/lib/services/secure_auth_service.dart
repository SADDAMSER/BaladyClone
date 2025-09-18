/// Secure Authentication Service for Yemen Construction Platform
/// Uses flutter_secure_storage for JWT tokens and sensitive data

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
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

/// Enhanced secure authentication service
class SecureAuthService {
  // Secure storage for sensitive data
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
  
  // Secure storage keys for sensitive data
  static const String _accessTokenKey = 'secure_access_token';
  static const String _refreshTokenKey = 'secure_refresh_token';
  static const String _userDataKey = 'secure_user_data';
  static const String _tokenExpiryKey = 'secure_token_expiry';
  
  // Device ID stored in SharedPreferences (not sensitive)
  static const String _deviceIdKey = 'device_id';
  
  // Current authentication state (in-memory)
  static bool _isLoggedIn = false;
  static Map<String, dynamic>? _currentUser;
  static String? _accessToken;
  static String? _refreshToken;
  static DateTime? _tokenExpiry;

  /// Initialize secure authentication service
  static Future<void> init() async {
    try {
      await _loadStoredTokens();
      await _validateTokens();
      print('🔐 SecureAuthService initialized - Logged in: $_isLoggedIn');
    } catch (e) {
      print('❌ SecureAuthService init error: $e');
      await _clearStoredTokens();
    }
  }

  /// Load stored tokens from secure storage
  static Future<void> _loadStoredTokens() async {
    try {
      // Load tokens from secure storage
      _accessToken = await _secureStorage.read(key: _accessTokenKey);
      _refreshToken = await _secureStorage.read(key: _refreshTokenKey);
      
      final userDataJson = await _secureStorage.read(key: _userDataKey);
      if (userDataJson != null) {
        _currentUser = jsonDecode(userDataJson);
      }
      
      final expiryString = await _secureStorage.read(key: _tokenExpiryKey);
      if (expiryString != null) {
        _tokenExpiry = DateTime.parse(expiryString);
      }
      
      _isLoggedIn = _accessToken != null && _currentUser != null;
      
      print('🔐 Loaded stored tokens from secure storage - Logged in: $_isLoggedIn');
    } catch (e) {
      print('❌ Error loading tokens from secure storage: $e');
      _isLoggedIn = false;
    }
  }

  /// Store authentication data securely
  static Future<void> _storeAuthData({
    required String accessToken,
    String? refreshToken,
    required Map<String, dynamic> userData,
    DateTime? expiresAt,
  }) async {
    try {
      // Store sensitive data in secure storage
      await _secureStorage.write(key: _accessTokenKey, value: accessToken);
      
      if (refreshToken != null) {
        await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
      }
      
      await _secureStorage.write(key: _userDataKey, value: jsonEncode(userData));
      
      if (expiresAt != null) {
        await _secureStorage.write(key: _tokenExpiryKey, value: expiresAt.toIso8601String());
      }
      
      print('🔐 Auth data stored securely');
    } catch (e) {
      print('❌ Error storing auth data: $e');
      throw Exception('Failed to store authentication data');
    }
  }

  /// Clear stored tokens and user data
  static Future<void> _clearStoredTokens() async {
    try {
      // Clear secure storage
      await _secureStorage.delete(key: _accessTokenKey);
      await _secureStorage.delete(key: _refreshTokenKey);
      await _secureStorage.delete(key: _userDataKey);
      await _secureStorage.delete(key: _tokenExpiryKey);
      
      // Clear in-memory state
      _isLoggedIn = false;
      _currentUser = null;
      _accessToken = null;
      _refreshToken = null;
      _tokenExpiry = null;
      
      print('🗑️ Auth data cleared from secure storage');
    } catch (e) {
      print('❌ Error clearing auth data: $e');
    }
  }

  /// Validate stored tokens
  static Future<void> _validateTokens() async {
    if (_accessToken == null || _currentUser == null) {
      _isLoggedIn = false;
      return;
    }

    // Check if token is expired
    if (_tokenExpiry != null && DateTime.now().isAfter(_tokenExpiry!)) {
      print('🔒 Access token expired, attempting refresh...');
      
      if (_refreshToken != null) {
        try {
          await refreshToken();
        } catch (e) {
          print('❌ Token refresh failed: $e');
          await _clearStoredTokens();
        }
      } else {
        await _clearStoredTokens();
      }
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

      print('🔐 Attempting secure login for user: $username');
      
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
        // Login successful - store tokens securely
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

        print('✅ Secure login successful for user: ${authResponse.user?['username']}');
        
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
        error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول',
        errorCode: 'UNEXPECTED_ERROR',
      );
    }
  }

  /// Refresh access token using refresh token
  static Future<AuthResponse> refreshToken() async {
    if (_refreshToken == null) {
      throw Exception('No refresh token available');
    }

    try {
      final deviceInfo = await _getDeviceInfo();
      
      final response = await http.post(
        Uri.parse('${AppConfig.backendUrl}/api/mobile/v1/auth/refresh'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $_refreshToken',
          'X-Device-ID': deviceInfo['deviceId'],
        },
        body: jsonEncode({
          'refreshToken': _refreshToken,
          'deviceName': deviceInfo['deviceName'],
        }),
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
        throw Exception(authResponse.error ?? 'Token refresh failed');
      }
    } catch (e) {
      print('❌ Token refresh error: $e');
      await _clearStoredTokens();
      rethrow;
    }
  }

  /// Logout and clear all stored data
  static Future<void> logout() async {
    await _clearStoredTokens();
    print('👋 User logged out securely');
  }

  /// Get current user data
  static Map<String, dynamic>? get currentUser => _currentUser;

  /// Check if user is logged in
  static bool get isLoggedIn => _isLoggedIn;

  /// Get current access token
  static String? get accessToken => _accessToken;

  /// Get authentication headers for API requests
  static Future<Map<String, String>> getAuthHeaders() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (_accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }

    // Add device ID from SharedPreferences
    final prefs = await SharedPreferences.getInstance();
    final deviceId = prefs.getString(_deviceIdKey);
    if (deviceId != null) {
      headers['X-Device-ID'] = deviceId;
    }

    return headers;
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
      'deviceName': platform == 'android' ? 'Android Device' : 'iOS Device',
      'deviceModel': platform == 'android' ? 'Android' : 'iPhone',
      'osVersion': version,
    };
  }

  /// Generate unique device ID
  static String _generateDeviceId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp % 10000).toString().padLeft(4, '0');
    return 'mobile_${Platform.operatingSystem}_${timestamp}_$random';
  }
}