import 'package:flutter/material.dart';

class BluetoothDevicesScreen extends StatefulWidget {
  const BluetoothDevicesScreen({super.key});

  @override
  State<BluetoothDevicesScreen> createState() => _BluetoothDevicesScreenState();
}

class _BluetoothDevicesScreenState extends State<BluetoothDevicesScreen> {
  bool _scanning = false;
  List<String> _devices = const [];

  Future<void> _scan() async {
    setState(() {
      _scanning = true;
      _devices = const [];
    });
    await Future<void>.delayed(const Duration(milliseconds: 800));
    setState(() {
      _scanning = false;
      _devices = const ['Emlid Reach RS2+','South Galaxy G1','Trimble R12i','Topcon Hiper VR'];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('أجهزة البلوتوث')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _scanning ? null : _scan,
                  icon: const Icon(Icons.search),
                  label: Text(_scanning ? 'جارِ البحث...' : 'بحث عن الأجهزة'),
                ),
              ),
            ]),
          ),
          Expanded(
            child: _devices.isEmpty
                ? const Center(child: Text('لا توجد أجهزة — اضغط بحث'))
                : ListView.separated(
                    itemCount: _devices.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, i) => ListTile(
                      leading: const Icon(Icons.device_hub),
                      title: Text(_devices[i]),
                      subtitle: const Text('عنصر نائب — سيتم إقرانه لاحقاً'),
                      trailing: ElevatedButton(onPressed: () {}, child: const Text('اتصال')),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}