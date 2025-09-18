import 'package:flutter/material.dart';
import 'package:dreamflow_app/screens/bluetooth_devices_screen.dart';
import 'package:dreamflow_app/screens/ntrip_settings_screen.dart';

class DeviceScreen extends StatelessWidget {
  const DeviceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('جهاز')),
      body: ListView(
        children: [
          const _SectionHeader(title: 'الاتصال'),
          ListTile(
            leading: const Icon(Icons.bluetooth),
            title: const Text('تواصل'),
            subtitle: const Text('إدارة اتصال البلوتوث مع جهاز GNSS'),
            trailing: const Icon(Icons.chevron_left),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BluetoothDevicesScreen())),
          ),
          const Divider(height: 1),
          const _SectionHeader(title: 'تكوين المستقبل'),
          ListTile(
            leading: const Icon(Icons.gps_fixed),
            title: const Text('متجول'),
            subtitle: const Text('إعداد أوضاع المتجول (Rover) - عناصر نائبة'),
            trailing: const Icon(Icons.chevron_left),
            onTap: () => _showPlaceholder(context, 'إعداد المتجول'),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.sensors),
            title: const Text('قاعدة'),
            subtitle: const Text('إعداد أوضاع القاعدة (Base) - عناصر نائبة'),
            trailing: const Icon(Icons.chevron_left),
            onTap: () => _showPlaceholder(context, 'إعداد القاعدة'),
          ),
          const Divider(height: 1),
          const _SectionHeader(title: 'تصحيحات الشبكة'),
          ListTile(
            leading: const Icon(Icons.cloud),
            title: const Text('إعدادات NTRIP'),
            subtitle: const Text('تهيئة الوصول إلى Caster وإدارة نقاط البث'),
            trailing: const Icon(Icons.chevron_left),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NtripSettingsScreen())),
          ),
        ],
      ),
    );
  }

  void _showPlaceholder(BuildContext context, String title) => showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: const Text('هذه شاشة إطار عمل فقط، سيتم ربطها بالمنطق لاحقاً.'),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('حسناً'))],
        ),
      );
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 24, 16, 8),
        child: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.grey)),
      );
}