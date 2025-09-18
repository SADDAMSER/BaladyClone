class AppConfig {
  // Development URL - same domain for Replit environment
  static const String backendUrl = '';
  static const String appName = 'بنّاء المساحي - Bina\'a Al-Yaman Surveyor';
  static const String version = '1.0.0';
  static const int requestTimeoutSeconds = 30;
  
  // GNSS Configuration
  static const double minimumAccuracy = 5.0; // meters
  static const Duration gnssTimeout = Duration(seconds: 10);
  
  // Sync Configuration 
  static const Duration syncInterval = Duration(minutes: 5);
  static const int maxRetryAttempts = 3;
}