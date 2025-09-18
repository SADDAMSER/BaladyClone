import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dreamflow_app/theme.dart';
import 'package:dreamflow_app/screens/login_screen.dart';
import 'package:dreamflow_app/screens/main_navigation.dart';
import 'package:dreamflow_app/services/database_service.dart';
import 'package:dreamflow_app/services/sync_service.dart';
import 'package:dreamflow_app/services/auth_service.dart';
import 'package:dreamflow_app/services/secure_auth_service.dart';
import 'package:dreamflow_app/services/real_sync_service.dart';
import 'package:dreamflow_app/services/local_storage_service.dart';

void main() {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.dumpErrorToConsole(details);
      // ignore: avoid_print
      print('FlutterError: \n${details.exceptionAsString()}');
    };
    await DatabaseService.init();
    await SyncService.init();
    await SecureAuthService.init();
    await LocalStorageService().initialize(); // تهيئة التخزين المحلي
    
    // Only initialize RealSyncService if authenticated
    if (SecureAuthService.isLoggedIn) {
      await RealSyncService.init();
    }
    // ignore: avoid_print
    print('App starting...');
    runApp(const BinaaSurveyorApp());
  }, (error, stack) {
    // ignore: avoid_print
    print('Uncaught Zone Error: $error');
  });
}

class BinaaSurveyorApp extends StatelessWidget {
  const BinaaSurveyorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'بنّاء المساحي',
      debugShowCheckedModeBanner: false,
      theme: lightTheme,
      home: const SplashScreen(),
      builder: (context, child) {
        ErrorWidget.builder = (FlutterErrorDetails details) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 48),
                  const SizedBox(height: 12),
                  Text('حدث خطأ غير متوقع', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                  const SizedBox(height: 8),
                  Text(details.exceptionAsString(), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.red), textAlign: TextAlign.center, softWrap: true, overflow: TextOverflow.ellipsis, maxLines: 5),
                ]),
              ),
            ),
          );
        };
        return child ?? const SizedBox.shrink();
      },
    );
  }
}

/// Splash screen that checks authentication state
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    // Wait a moment for splash effect
    await Future.delayed(const Duration(seconds: 1));
    
    if (mounted) {
      // Check if user is already authenticated
      if (SecureAuthService.isLoggedIn) {
        // Navigate to main app
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const MainNavigation()),
        );
      } else {
        // Navigate to login
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const LoginScreen()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      backgroundColor: theme.colorScheme.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // App icon
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Icon(
                Icons.map,
                size: 60,
                color: theme.colorScheme.primary,
              ),
            ),
            
            const SizedBox(height: 24),
            
            Text(
              'بنّاء المساحي',
              style: theme.textTheme.headlineMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 8),
            
            Text(
              'Yemen Construction Platform',
              style: theme.textTheme.titleMedium?.copyWith(
                color: Colors.white.withOpacity(0.9),
              ),
            ),
            
            const SizedBox(height: 40),
            
            // Loading indicator
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
