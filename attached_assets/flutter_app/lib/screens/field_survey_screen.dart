import 'dart:math';
import 'package:flutter/material.dart';
import 'package:dreamflow_app/models/survey_models.dart';
import 'package:dreamflow_app/services/database_service.dart';
import 'package:dreamflow_app/services/sync_service.dart';
import 'package:dreamflow_app/widgets/gnss_status_panel.dart';

class FieldSurveyScreen extends StatefulWidget {
  final SurveyTask task;

  const FieldSurveyScreen({super.key, required this.task});

  @override
  State<FieldSurveyScreen> createState() => _FieldSurveyScreenState();
}

class _FieldSurveyScreenState extends State<FieldSurveyScreen> {
  // GNSS simulated state
  String _gnssStatusLabel = 'Disconnected';
  String _accuracyLabel = '-';
  String _hdop = '-';
  String _vdop = '-';

  // Feature coding and tool
  String _activeTool = 'Polygon'; // Polygon, Line, Point
  String? _selectedFeatureCode; // مبنى، سياج، شجرة ...

  // Geometry capture state (for Polygon/Line)
  final List<PolygonPoint> _currentPoints = [];
  bool _polygonClosed = false;
  String? _savedPolygonId;

  // Attachment and notes
  final TextEditingController _noteController = TextEditingController();
  String? _attachedPhotoUrl;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('رفع المهمة ${widget.task.id}'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: 'مزامنة',
            onPressed: () => SyncService.syncTask(widget.task.id),
            icon: const Icon(Icons.cloud_upload),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.developer_mode),
            onSelected: _handleDevAction,
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'rtk', child: Text('Sim: RTK Fixed (0.02m, HDOP 0.8, VDOP 1.1)')),
              PopupMenuItem(value: 'disconnect', child: Text('Sim: Disconnect GNSS')),
              PopupMenuItem(value: 'clear', child: Text('Clear current geometry')),
              PopupMenuItem(value: 'simulate_happy', child: Text('Simulate Happy Path + Sync')),
            ],
          ),
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: GNSSStatusPanel(statusLabel: _gnssStatusLabel, accuracyLabel: _accuracyLabel, hdop: _hdop, vdop: _vdop),
        ),
        _TaskHeader(task: widget.task),
        const SizedBox(height: 8),
        _FeatureCodingBar(
          activeTool: _activeTool,
          selectedCode: _selectedFeatureCode,
          onToolTap: (tool) => setState(() {
            _activeTool = tool;
            _selectedFeatureCode = null;
            _currentPoints.clear();
            _polygonClosed = false;
          }),
          onCodeTap: (code) => setState(() => _selectedFeatureCode = code),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: _CanvasCard(
              points: _currentPoints,
              closed: _activeTool == 'Polygon' ? _polygonClosed : false,
              onTapCanvas: (localPos) async {
                if (_selectedFeatureCode == null) {
                  _showSnack('اختر كود المَعْلَم أولاً');
                  return;
                }
                if (_activeTool == 'Point') {
                  final mapped = _mapCanvasToLatLng(localPos, context);
                  final acc = _gnssStatusLabel.contains('RTK') ? 0.02 : 1.2;
                  final pt = SurveyPoint(
                    id: 'pt_${DateTime.now().millisecondsSinceEpoch}',
                    taskId: widget.task.id,
                    latitude: mapped.dy,
                    longitude: mapped.dx,
                    accuracy: acc,
                    timestamp: DateTime.now(),
                    featureCode: _selectedFeatureCode,
                  );
                  DatabaseService.savePoint(pt);
                  _showSnack('تم حفظ النقطة (${_selectedFeatureCode!})');
                  return;
                }

                if (_currentPoints.isEmpty) {
                  final startFromDialog = await _askStartPoint();
                  if (startFromDialog == null) return;
                  if (startFromDialog == 'gnss') {
                    final size = _canvasSize(context);
                    final center = Offset(size.width / 2, size.height / 2);
                    setState(() => _currentPoints.add(PolygonPoint(x: center.dx, y: center.dy)));
                  } else {
                    setState(() => _currentPoints.add(PolygonPoint(x: localPos.dx, y: localPos.dy)));
                  }
                } else {
                  setState(() => _currentPoints.add(PolygonPoint(x: localPos.dx, y: localPos.dy)));
                }
              },
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _activeTool == 'Point' ? null : (_currentPoints.isNotEmpty ? (_activeTool == 'Polygon' ? _finishPolygon : _finishLine) : null),
                icon: const Icon(Icons.done),
                label: const Text('إنهاء'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _currentPoints.isNotEmpty ? _undoLastPoint : null,
                icon: const Icon(Icons.undo),
                label: const Text('تراجع'),
              ),
            ),
          ]),
        ),
        if (_savedPolygonId != null && _activeTool == 'Polygon')
          _AttachmentSection(noteController: _noteController, attachedUrl: _attachedPhotoUrl, onAttachPhoto: _attachSamplePhoto, onSaveNote: _saveNote),
      ]),
    );
  }

  Size _canvasSize(BuildContext context) {
    final mq = MediaQuery.of(context);
    return Size(mq.size.width - 24, max(180, mq.size.height * 0.35));
  }

  // Map canvas pixel to a plausible lat/lng around Sana'a for simulation
  Offset _mapCanvasToLatLng(Offset local, BuildContext context) {
    final size = _canvasSize(context);
    final double minLng = 44.18, maxLng = 44.25; // x -> lng
    final double minLat = 15.30, maxLat = 15.35; // y -> lat (invert Y)
    final double lng = minLng + (local.dx.clamp(0, size.width) / size.width) * (maxLng - minLng);
    final double lat = maxLat - (local.dy.clamp(0, size.height) / size.height) * (maxLat - minLat);
    return Offset(lng, lat);
  }

  void _handleDevAction(String value) {
    if (value == 'rtk') {
      setState(() {
        _gnssStatusLabel = 'RTK Fixed';
        _accuracyLabel = '0.02m';
        _hdop = '0.8';
        _vdop = '1.1';
      });
      _showSnack('تم ضبط GNSS على RTK Fixed');
    } else if (value == 'disconnect') {
      setState(() {
        _gnssStatusLabel = 'Disconnected';
        _accuracyLabel = '-';
        _hdop = '-';
        _vdop = '-';
      });
      _showSnack('GNSS غير متصل');
    } else if (value == 'clear') {
      setState(() {
        _currentPoints.clear();
        _polygonClosed = false;
        _savedPolygonId = null;
        _attachedPhotoUrl = null;
        _noteController.clear();
      });
    } else if (value == 'simulate_happy') {
      _simulateHappyPath();
    }
  }

  Future<String?> _askStartPoint() async {
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('اختيار نقطة البداية'),
        content: const Text('كيف ترغب بتحديد نقطة البداية؟'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop('gnss'), child: const Text('موقع GNSS الحالي')),
          TextButton(onPressed: () => Navigator.of(context).pop('tap'), child: const Text('اختيار من الخريطة')),
        ],
      ),
    );
  }

  Future<void> _finishPolygon() async {
    final choice = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('خيارات إنهاء المضلع'),
        content: const Text('اختر كيفية إنهاء المضلع:'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop('end'),
            child: const Text('نقطة نهاية وإبقاء المضلع مفتوحًا'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop('close'),
            child: const Text('نقطة إغلاق وربطها بالبداية'),
          ),
        ],
      ),
    );
    if (choice == null) return;
    setState(() => _polygonClosed = choice == 'close');

    final polygon = SurveyPolygon(
      id: 'poly_${DateTime.now().millisecondsSinceEpoch}',
      taskId: widget.task.id,
      featureCode: _selectedFeatureCode ?? 'غير محدد',
      points: List<PolygonPoint>.from(_currentPoints),
      closed: _polygonClosed,
      createdAt: DateTime.now(),
      isSynced: false,
    );
    DatabaseService.savePolygon(polygon);
    setState(() => _savedPolygonId = polygon.id);

    _showSnack('تم حفظ المضلع (${_selectedFeatureCode ?? ''}) محلياً');
    _currentPoints.clear();
    _polygonClosed = false;
  }

  Future<void> _finishLine() async {
    if (_currentPoints.length < 2) {
      _showSnack('أضف نقطتين على الأقل للخط');
      return;
    }
    final line = SurveyLine(
      id: 'line_${DateTime.now().millisecondsSinceEpoch}',
      taskId: widget.task.id,
      featureCode: _selectedFeatureCode ?? 'غير محدد',
      points: List<PolygonPoint>.from(_currentPoints),
      createdAt: DateTime.now(),
      isSynced: false,
    );
    DatabaseService.saveLine(line);
    _showSnack('تم حفظ الخط (${_selectedFeatureCode ?? ''}) محلياً');
    _currentPoints.clear();
  }

  void _undoLastPoint() {
    if (_currentPoints.isEmpty) return;
    setState(() {
      _currentPoints.removeLast();
      _polygonClosed = false;
    });
  }

  Future<void> _attachSamplePhoto() async {
    if (_savedPolygonId == null) {
      _showSnack('احفظ المضلع أولاً');
      return;
    }
    const sampleUrl = 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=600&q=60';
    final att = SurveyAttachment(
      id: 'att_${DateTime.now().millisecondsSinceEpoch}',
      taskId: widget.task.id,
      polygonId: _savedPolygonId,
      type: 'photo',
      url: sampleUrl,
      note: _noteController.text.isNotEmpty ? _noteController.text : null,
      createdAt: DateTime.now(),
      isSynced: false,
    );
    DatabaseService.saveAttachment(att);
    setState(() => _attachedPhotoUrl = sampleUrl);
    _showSnack('تم إرفاق صورة للمضلع');
  }

  Future<void> _saveNote() async {
    if (_savedPolygonId == null) {
      _showSnack('احفظ المضلع أولاً');
      return;
    }
    final noteText = _noteController.text.trim();
    if (noteText.isEmpty) {
      _showSnack('أدخل الملاحظة');
      return;
    }
    final att = SurveyAttachment(
      id: 'note_${DateTime.now().millisecondsSinceEpoch}',
      taskId: widget.task.id,
      polygonId: _savedPolygonId,
      type: 'note',
      url: '',
      note: noteText,
      createdAt: DateTime.now(),
      isSynced: false,
    );
    DatabaseService.saveAttachment(att);
    _showSnack('تم حفظ الملاحظة');
  }

  Future<void> _simulateHappyPath() async {
    // Fixed geometry for deterministic payload
    final poly = SurveyPolygon(
      id: 'poly_${DateTime.now().millisecondsSinceEpoch}',
      taskId: widget.task.id,
      featureCode: 'مبنى',
      points: [
        PolygonPoint(x: 160, y: 140),
        PolygonPoint(x: 240, y: 140),
        PolygonPoint(x: 240, y: 200),
        PolygonPoint(x: 160, y: 200),
      ],
      closed: true,
      createdAt: DateTime.now(),
      isSynced: false,
    );
    DatabaseService.savePolygon(poly);

    // Simulate a Fence line (2 points)
    final line = SurveyLine(
      id: 'line_${DateTime.now().millisecondsSinceEpoch}',
      taskId: widget.task.id,
      featureCode: 'سياج',
      points: [
        PolygonPoint(x: 120, y: 240),
        PolygonPoint(x: 300, y: 260),
      ],
      createdAt: DateTime.now(),
      isSynced: false,
    );
    DatabaseService.saveLine(line);

    // Simulate a Tree point with fixed lat/lng around Sana'a
    final point = SurveyPoint(
      id: 'pt_${DateTime.now().millisecondsSinceEpoch}',
      taskId: widget.task.id,
      latitude: 15.34123,
      longitude: 44.21987,
      accuracy: 0.02,
      timestamp: DateTime.now(),
      featureCode: 'شجرة',
    );
    DatabaseService.savePoint(point);

    // Trigger sync (prints payload to logs)
    await SyncService.syncTask(widget.task.id);
    if (!mounted) return;
    _showSnack('تمت محاكاة المسار السعيد وتم طباعة الحمولة (JSON) في السجلات');
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }
}

class _TaskHeader extends StatelessWidget {
  final SurveyTask task;
  const _TaskHeader({required this.task});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      color: theme.colorScheme.primaryContainer,
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(task.citizenName, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
        Text(task.location, style: theme.textTheme.bodyMedium, overflow: TextOverflow.ellipsis),
      ]),
    );
  }
}

class _FeatureCodingBar extends StatelessWidget {
  final String activeTool;
  final String? selectedCode;
  final ValueChanged<String> onToolTap;
  final ValueChanged<String> onCodeTap;
  const _FeatureCodingBar({required this.activeTool, required this.selectedCode, required this.onToolTap, required this.onCodeTap});

  @override
  Widget build(BuildContext context) {
    final polygonCodes = [
      _Code('مبنى', Icons.house_siding),
      _Code('أرض فضاء', Icons.terrain),
      _Code('عريم', Icons.crop_square),
    ];
    final lineCodes = [
      _Code('سياج', Icons.commit),
      _Code('رصيف', Icons.horizontal_rule),
      _Code('طريق', Icons.alt_route),
    ];
    final pointCodes = [
      _Code('شجرة', Icons.nature),
      _Code('منهل', Icons.water_drop),
      _Code('عمود', Icons.electric_bolt),
    ];
    final codes = activeTool == 'Polygon' ? polygonCodes : activeTool == 'Line' ? lineCodes : pointCodes;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(children: [
        _ChipButton(label: 'Polygon', icon: Icons.timeline, selected: activeTool == 'Polygon', onTap: () => onToolTap('Polygon')),
        const SizedBox(width: 6),
        _ChipButton(label: 'Line', icon: Icons.polyline, selected: activeTool == 'Line', onTap: () => onToolTap('Line')),
        const SizedBox(width: 6),
        _ChipButton(label: 'Point', icon: Icons.place, selected: activeTool == 'Point', onTap: () => onToolTap('Point')),
        const SizedBox(width: 8),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              for (final c in codes) _ChipButton(label: c.label, selected: selectedCode == c.label, onTap: () => onCodeTap(c.label), icon: c.icon),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _Code {
  final String label;
  final IconData icon;
  _Code(this.label, this.icon);
}

class _ChipButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;
  const _ChipButton({required this.label, required this.selected, required this.onTap, this.icon});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(start: 6),
      child: ChoiceChip(
        label: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 6)],
          Text(label),
        ]),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}

class _CanvasCard extends StatelessWidget {
  final List<PolygonPoint> points;
  final bool closed;
  final ValueChanged<Offset> onTapCanvas;
  const _CanvasCard({required this.points, required this.closed, required this.onTapCanvas});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
      child: LayoutBuilder(builder: (context, constraints) {
        final size = Size(constraints.maxWidth, max(180, constraints.maxHeight));
        return GestureDetector(
          onTapDown: (details) {
            final box = context.findRenderObject() as RenderBox?;
            if (box != null) {
              final local = box.globalToLocal(details.globalPosition);
              onTapCanvas(local);
            }
          },
          child: SizedBox(
            width: size.width,
            height: max(220, size.height),
            child: CustomPaint(
              painter: _PolygonPainter(points: points, closed: closed),
              child: Center(
                child: Text(
                  points.isEmpty
                      ? (closed ? 'انقر لإضافة نقاط' : 'انقر لإضافة نقاط')
                      : 'النقاط: ${points.length}${closed ? ' (مغلق)' : ''}',
                  style: const TextStyle(color: Colors.grey),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

class _PolygonPainter extends CustomPainter {
  final List<PolygonPoint> points;
  final bool closed;
  _PolygonPainter({required this.points, required this.closed});

  @override
  void paint(Canvas canvas, Size size) {
    final paintLine = Paint()
      ..color = Colors.blue
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final paintClosed = Paint()
      ..color = Colors.blue.withValues(alpha: 0.15)
      ..style = PaintingStyle.fill;

    if (points.isEmpty) return;

    final path = Path();
    path.moveTo(points.first.x, points.first.y);
    for (var i = 1; i < points.length; i++) {
      path.lineTo(points[i].x, points[i].y);
    }
    if (closed && points.length >= 3) path.close();

    if (closed && points.length >= 3) {
      canvas.drawPath(path, paintClosed);
    }
    canvas.drawPath(path, paintLine);

    // draw points
    final ptPaint = Paint()..color = Colors.red;
    for (final p in points) {
      canvas.drawCircle(Offset(p.x, p.y), 3, ptPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _PolygonPainter oldDelegate) => oldDelegate.points != points || oldDelegate.closed != closed;
}

class _AttachmentSection extends StatelessWidget {
  final TextEditingController noteController;
  final String? attachedUrl;
  final VoidCallback onAttachPhoto;
  final VoidCallback onSaveNote;
  const _AttachmentSection({required this.noteController, required this.attachedUrl, required this.onAttachPhoto, required this.onSaveNote});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.grey.withValues(alpha: 0.06),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('المرفقات والملاحظات', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (attachedUrl != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(attachedUrl!, height: 140, width: double.infinity, fit: BoxFit.cover),
          ),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: TextField(
              controller: noteController,
              decoration: const InputDecoration(labelText: 'ملاحظة', border: OutlineInputBorder()),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(onPressed: onSaveNote, icon: const Icon(Icons.note_add), label: const Text('حفظ ملاحظة')),
        ]),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(onPressed: onAttachPhoto, icon: const Icon(Icons.photo_camera), label: const Text('إرفاق صورة')),
        )
      ]),
    );
  }
}
