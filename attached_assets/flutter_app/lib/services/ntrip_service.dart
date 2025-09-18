import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class NtripConfig {
  final String host;
  final int port;
  final String username;
  final String password;
  final String? mountpoint;

  const NtripConfig({
    required this.host,
    required this.port,
    required this.username,
    required this.password,
    this.mountpoint,
  });

  NtripConfig copyWith({
    String? host,
    int? port,
    String? username,
    String? password,
    String? mountpoint,
  }) => NtripConfig(
        host: host ?? this.host,
        port: port ?? this.port,
        username: username ?? this.username,
        password: password ?? this.password,
        mountpoint: mountpoint ?? this.mountpoint,
      );

  Map<String, Object?> toMap() => {
        'host': host,
        'port': port,
        'username': username,
        'password': password,
        'mountpoint': mountpoint,
      };

  static NtripConfig fromMap(Map<String, Object?> map) => NtripConfig(
        host: (map['host'] as String?) ?? '',
        port: (map['port'] is int) ? map['port'] as int : int.tryParse('${map['port']}') ?? 2101,
        username: (map['username'] as String?) ?? '',
        password: (map['password'] as String?) ?? '',
        mountpoint: map['mountpoint'] as String?,
      );
}

class NtripService {
  static const _prefsKey = 'ntrip_config_v1';

  // Placeholder: Pretend to call a caster and return available mountpoints.
  static Future<List<String>> fetchNtripMountpoints(NtripConfig cfg) async {
    // In real implementation: open TCP to cfg.host:cfg.port and send SOURCETABLE request with Basic Auth
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (kDebugMode) {
      // ignore: avoid_print
      print('Mock fetching mountpoints from ${cfg.host}:${cfg.port} as ${cfg.username}');
    }
    return const ['RTCM3_IMAX', 'RTCM3_VRS', 'RTCM3_NEAR'];
  }

  static Future<void> saveConfig(NtripConfig cfg) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_prefsKey, [
      cfg.host,
      cfg.port.toString(),
      cfg.username,
      cfg.password,
      cfg.mountpoint ?? '',
    ]);
  }

  static Future<NtripConfig?> loadConfig() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_prefsKey);
    if (list == null || list.length < 5) return null;
    return NtripConfig(
      host: list[0],
      port: int.tryParse(list[1]) ?? 2101,
      username: list[2],
      password: list[3],
      mountpoint: list[4].isEmpty ? null : list[4],
    );
  }
}