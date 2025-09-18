import 'package:flutter/material.dart';
import 'package:dreamflow_app/services/ntrip_service.dart';

class NtripSettingsScreen extends StatefulWidget {
  const NtripSettingsScreen({super.key});

  @override
  State<NtripSettingsScreen> createState() => _NtripSettingsScreenState();
}

class _NtripSettingsScreenState extends State<NtripSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _hostCtrl = TextEditingController();
  final _portCtrl = TextEditingController(text: '2101');
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();

  bool _loading = false;
  List<String> _mountpoints = const [];
  String? _selectedMp;

  @override
  void initState() {
    super.initState();
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final saved = await NtripService.loadConfig();
    if (saved != null) {
      _hostCtrl.text = saved.host;
      _portCtrl.text = saved.port.toString();
      _userCtrl.text = saved.username;
      _passCtrl.text = saved.password;
      setState(() {
        _selectedMp = saved.mountpoint;
      });
    }
  }

  NtripConfig _currentConfig() => NtripConfig(
        host: _hostCtrl.text.trim(),
        port: int.tryParse(_portCtrl.text.trim()) ?? 2101,
        username: _userCtrl.text.trim(),
        password: _passCtrl.text,
        mountpoint: _selectedMp,
      );

  Future<void> _fetchMountpoints() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final list = await NtripService.fetchNtripMountpoints(_currentConfig());
      setState(() {
        _mountpoints = list;
        if (!_mountpoints.contains(_selectedMp)) _selectedMp = null;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم جلب نقاط البث')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل الجلب: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    await NtripService.saveConfig(_currentConfig());
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم حفظ الإعدادات')));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('إعدادات NTRIP')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('NTRIP Configuration', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _hostCtrl,
              decoration: const InputDecoration(labelText: 'عنوان الخادم (Caster IP / Hostname)', prefixIcon: Icon(Icons.dns)),
              textDirection: TextDirection.ltr,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'أدخل العنوان' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _portCtrl,
              decoration: const InputDecoration(labelText: 'المنفذ (Port)', prefixIcon: Icon(Icons.numbers)),
              keyboardType: TextInputType.number,
              textDirection: TextDirection.ltr,
              validator: (v) {
                final n = int.tryParse((v ?? '').trim());
                if (n == null || n <= 0 || n > 65535) return 'منفذ غير صالح';
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _userCtrl,
              decoration: const InputDecoration(labelText: 'اسم المستخدم (Username)', prefixIcon: Icon(Icons.person)),
              textDirection: TextDirection.ltr,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'أدخل اسم المستخدم' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _passCtrl,
              decoration: const InputDecoration(labelText: 'كلمة المرور (Password)', prefixIcon: Icon(Icons.lock)),
              obscureText: true,
              textDirection: TextDirection.ltr,
              validator: (v) => (v == null || v.isEmpty) ? 'أدخل كلمة المرور' : null,
            ),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _loading ? null : _fetchMountpoints,
                  icon: const Icon(Icons.download),
                  label: _loading ? const Text('...') : const Text('جلب نقاط البث'),
                ),
              ),
            ]),
            const SizedBox(height: 12),
            if (_mountpoints.isNotEmpty)
              DropdownButtonFormField<String>(
                value: _selectedMp,
                items: _mountpoints.map((e) => DropdownMenuItem(value: e, child: Text(e, textDirection: TextDirection.ltr))).toList(),
                onChanged: (v) => setState(() => _selectedMp = v),
                decoration: const InputDecoration(labelText: 'نقطة البث (Mountpoint)', prefixIcon: Icon(Icons.tune)),
                validator: (v) => v == null ? 'اختر نقطة بث' : null,
              ),
            const SizedBox(height: 24),
            FilledButton.icon(onPressed: _save, icon: const Icon(Icons.save), label: const Text('حفظ الإعدادات')),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _hostCtrl.dispose();
    _portCtrl.dispose();
    _userCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }
}