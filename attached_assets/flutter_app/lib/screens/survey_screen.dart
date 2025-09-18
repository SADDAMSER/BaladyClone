import 'package:flutter/material.dart';

class SurveyScreen extends StatefulWidget {
  const SurveyScreen({super.key});

  @override
  State<SurveyScreen> createState() => _SurveyScreenState();
}

class _SurveyScreenState extends State<SurveyScreen> {
  bool _isDrawing = false;
  final List<String> _activeFeatures = ['GNSS RTK', 'Auto Save', 'Point Averaging'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('مسح')),
      body: Row(
        children: [
          // Side panel — Active Features
          Container(
            width: 240,
            color: theme.colorScheme.surfaceContainerHighest,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.2))))
                ,
                  child: Row(children: [
                    const Icon(Icons.extension, color: Colors.blue),
                    const SizedBox(width: 8),
                    Text('الخصائص النشطة', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                  ]),
                ),
                Expanded(
                  child: ListView.separated(
                    itemCount: _activeFeatures.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, i) => ListTile(
                      dense: true,
                      leading: const Icon(Icons.check_circle, color: Colors.green),
                      title: Text(_activeFeatures[i], softWrap: true, overflow: TextOverflow.ellipsis),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Main canvas / idle area
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: _isDrawing ? _DrawingArea(onExit: () => setState(() => _isDrawing = false)) : _IdleArea(onStart: () => setState(() => _isDrawing = true)),
            ),
          ),
        ],
      ),
    );
  }
}

class _IdleArea extends StatelessWidget {
  final VoidCallback onStart;
  const _IdleArea({required this.onStart});
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.map_outlined, size: 96, color: theme.colorScheme.primary),
          const SizedBox(height: 12),
          const Text('وضع الخمول — ابدأ الرسم للانتقال إلى وضع المسح'),
          const SizedBox(height: 16),
          FilledButton.icon(onPressed: onStart, icon: const Icon(Icons.brush), label: const Text('ابدأ الرسم')),
          const SizedBox(height: 24),
          _FunctionList(),
        ],
      ),
    );
  }
}

class _DrawingArea extends StatelessWidget {
  final VoidCallback onExit;
  const _DrawingArea({required this.onExit});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(children: [
            ElevatedButton.icon(onPressed: onExit, icon: const Icon(Icons.close), label: const Text('إنهاء')),
            const SizedBox(width: 8),
            ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.add_location), label: const Text('نقطة')),
            const SizedBox(width: 8),
            ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.timeline), label: const Text('تفصيل (خريطة)')),
            const SizedBox(width: 8),
            ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.place), label: const Text('توقيع نقطة')),
          ]),
        ),
        Expanded(
          child: Container(
            color: Colors.black.withValues(alpha: 0.05),
            alignment: Alignment.center,
            child: const Text('منطقة الرسم (عنصر نائب) — سيتم ربطها بالخريطة/القماش لاحقاً'),
          ),
        ),
      ],
    );
  }
}

class _FunctionList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        ListTile(leading: Icon(Icons.add_location_alt, color: Colors.blue), title: Text('مسح نقطة (Point Survey)')),
        Divider(height: 1),
        ListTile(leading: Icon(Icons.layers, color: Colors.green), title: Text('تفصيل (خريطة) — Detail Survey')),
        Divider(height: 1),
        ListTile(leading: Icon(Icons.push_pin, color: Colors.orange), title: Text('توقيع نقطة — Stakeout Point')),
      ],
    );
  }
}