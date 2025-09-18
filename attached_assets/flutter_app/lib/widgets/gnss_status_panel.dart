import 'package:flutter/material.dart';

// Simplified GNSS status panel for now
class GNSSStatusPanel extends StatelessWidget {
  final String statusLabel; // e.g., RTK Fixed
  final String accuracyLabel; // e.g., 0.02m
  final String hdop;
  final String vdop;

  const GNSSStatusPanel({
    super.key,
    required this.statusLabel,
    required this.accuracyLabel,
    required this.hdop,
    required this.vdop,
  });

  @override
  Widget build(BuildContext context) {
    final isFixed = statusLabel.toLowerCase().contains('fixed') || statusLabel.contains('ثابت');
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isFixed ? Colors.green : Colors.orange,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(isFixed ? Icons.gps_fixed : Icons.gps_not_fixed, color: Colors.white, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('حالة GNSS: $statusLabel', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Wrap(spacing: 12, runSpacing: 4, children: [
                  Text('الدقة: $accuracyLabel', style: const TextStyle(color: Colors.white)),
                  Text('HDOP: $hdop', style: const TextStyle(color: Colors.white)),
                  Text('VDOP: $vdop', style: const TextStyle(color: Colors.white)),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }
}