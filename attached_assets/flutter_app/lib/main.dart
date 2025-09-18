import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dreamflow_app/theme.dart';
import 'package:dreamflow_app/screens/login_screen.dart';
import 'package:dreamflow_app/screens/main_navigation.dart';
import 'package:dreamflow_app/services/database_service.dart';
import 'package:dreamflow_app/services/sync_service.dart';

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
      initialRoute: '/',
      routes: {
        '/': (context) => const LoginScreen(),
        '/home': (context) => const MainNavigation(),
      },
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
