import 'package:flutter/material.dart';

// Simplified toolbar for now
class SurveyToolbar extends StatelessWidget {
  const SurveyToolbar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 60,
      color: Colors.grey[200],
      child: const Center(
        child: Text('أدوات الرفع الميداني'),
      ),
    );
  }
}