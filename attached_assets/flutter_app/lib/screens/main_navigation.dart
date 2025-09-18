import 'package:flutter/material.dart';
import 'package:dreamflow_app/screens/tasks_screen.dart';
import 'package:dreamflow_app/screens/device_screen.dart';
import 'package:dreamflow_app/screens/survey_screen.dart';
import 'package:dreamflow_app/screens/tools_screen.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;
  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = const [
      TasksScreen(), // Project
      DeviceScreen(),
      SurveyScreen(),
      ToolsScreen(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.2), width: 1),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: theme.colorScheme.surface,
          selectedItemColor: theme.colorScheme.primary,
          unselectedItemColor: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          selectedLabelStyle: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.bold),
          unselectedLabelStyle: theme.textTheme.labelMedium,
          iconSize: 28,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.folder_open), activeIcon: Icon(Icons.folder), label: 'مشروع'),
            BottomNavigationBarItem(icon: Icon(Icons.devices_other), activeIcon: Icon(Icons.devices), label: 'جهاز'),
            BottomNavigationBarItem(icon: Icon(Icons.map_outlined), activeIcon: Icon(Icons.map), label: 'مسح'),
            BottomNavigationBarItem(icon: Icon(Icons.build_circle_outlined), activeIcon: Icon(Icons.build_circle), label: 'أدوات'),
          ],
        ),
      ),
    );
  }
}