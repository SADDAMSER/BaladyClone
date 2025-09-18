import 'package:flutter/material.dart';
import 'package:dreamflow_app/services/database_service.dart';
import 'package:dreamflow_app/models/survey_models.dart';
import 'package:dreamflow_app/models/updated_survey_models.dart';
import 'package:dreamflow_app/screens/task_details_screen.dart';
import 'package:dreamflow_app/services/sync_service.dart';
import 'package:dreamflow_app/services/real_sync_service.dart';
import 'package:dreamflow_app/services/secure_auth_service.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  List<SurveyTask> _tasks = [];
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _checkAuthAndLoadTasks();
  }

  Future<void> _checkAuthAndLoadTasks() async {
    setState(() {
      _isAuthenticated = SecureAuthService.isLoggedIn;
    });
    
    if (_isAuthenticated) {
      await _loadTasks();
    }
  }

  Future<void> _loadTasks() async {
    if (!SecureAuthService.isLoggedIn) {
      setState(() {
        _tasks = [];
        _errorMessage = 'يجب تسجيل الدخول أولاً';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await RealSyncService.fetchTasks();
      
      if (result['success']) {
        setState(() {
          _tasks = List<SurveyTask>.from(result['tasks']);
          _isLoading = false;
          _errorMessage = null;
        });
        
        print('✅ Loaded ${_tasks.length} tasks from server');
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = result['error'] ?? 'فشل في تحميل المهام';
        });
        
        if (result['needsReauth'] == true) {
          // Navigate to login screen
          _showReauthDialog();
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'خطأ في تحميل المهام: $e';
      });
      
      print('❌ Error loading tasks: $e');
    }
  }

  Future<void> _manualSync() async {
    if (!SecureAuthService.isLoggedIn) {
      _showMessage('يجب تسجيل الدخول أولاً');
      return;
    }

    setState(() => _isLoading = true);
    
    final result = await RealSyncService.forceFetchTasks();
    
    setState(() => _isLoading = false);
    
    if (!mounted) return;
    
    if (result['success']) {
      _showMessage('تمت المزامنة بنجاح - تم تحديث ${result['totalTasks']} مهمة');
      await _loadTasks();
    } else {
      _showMessage('فشلت المزامنة: ${result['error']}');
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  void _showReauthDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('انتهت جلسة العمل'),
        content: const Text('انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pushReplacementNamed('/login');
            },
            child: const Text('تسجيل الدخول'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('المهام المخصصة'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: _isAuthenticated ? 'مزامنة' : 'غير مصادق عليه',
            onPressed: _isAuthenticated ? _manualSync : null,
            icon: Icon(_isAuthenticated ? Icons.sync : Icons.sync_disabled),
          ),
          IconButton(
            onPressed: _isAuthenticated ? _loadTasks : null,
            icon: const Icon(Icons.refresh),
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'stats') {
                _showSyncStatistics();
              } else if (value == 'test') {
                _testConnectivity();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'stats',
                child: ListTile(
                  leading: Icon(Icons.analytics),
                  title: Text('إحصائيات المزامنة'),
                ),
              ),
              const PopupMenuItem(
                value: 'test',
                child: ListTile(
                  leading: Icon(Icons.network_check),
                  title: Text('اختبار الاتصال'),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          if (!_isAuthenticated)
            Container(
              width: double.infinity,
              color: Colors.red.withOpacity(0.2),
              padding: const EdgeInsets.all(8),
              child: const Center(child: Text('غير مسجل الدخول - يرجى تسجيل الدخول لرؤية المهام')),
            ),
          if (_errorMessage != null)
            Container(
              width: double.infinity,
              color: Colors.orange.withOpacity(0.2),
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  const Icon(Icons.warning, color: Colors.orange),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_errorMessage!)),
                  TextButton(
                    onPressed: _loadTasks,
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _tasks.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.assignment, size: 64, color: Colors.grey),
                            const SizedBox(height: 16),
                            Text(_isAuthenticated 
                              ? 'لا توجد مهام مخصصة' 
                              : 'يرجى تسجيل الدخول لرؤية المهام',
                              style: const TextStyle(fontSize: 18, color: Colors.grey),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: _tasks.length,
                        itemBuilder: (context, index) {
                          final task = _tasks[index];
                          final pending = !task.isSynced;
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getStatusColor(task.status),
                                child: Text(
                                  task.id,
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                              title: Row(
                                children: [
                                  Expanded(child: Text(task.citizenName, style: const TextStyle(fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis)),
                                  if (pending)
                                    Container(
                                      margin: const EdgeInsetsDirectional.only(start: 8),
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.amber.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(8)),
                                      child: const Text('بانتظار المزامنة', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.orange)),
                                    ),
                                ],
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(task.location, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 4),
                                  Row(children: [
                                    const Icon(Icons.access_time, size: 16, color: Colors.grey),
                                    const SizedBox(width: 4),
                                    Text(_formatDate(task.createdAt), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                  ]),
                                ],
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(color: _getStatusColor(task.status).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12)),
                                child: Text(task.status, style: TextStyle(color: _getStatusColor(task.status), fontWeight: FontWeight.bold, fontSize: 12)),
                              ),
                              onTap: () async {
                                final result = await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => TaskDetailsScreen(task: task)),
                                );
                                if (result == true) _loadTasks();
                              },
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'مخصصة':
        return Colors.orange;
      case 'قيد التنفيذ':
        return Colors.blue;
      case 'مكتمل':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) => '${date.day}/${date.month}/${date.year}';

  void _showSyncStatistics() {
    final stats = RealSyncService.getSyncStatistics();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('إحصائيات المزامنة'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildStatRow('حالة المصادقة:', stats['isAuthenticated'] ? 'مسجل الدخول' : 'غير مسجل'),
              _buildStatRow('آخر مزامنة:', stats['lastSyncTime'] ?? 'لا توجد'),
              _buildStatRow('إجمالي المحاولات:', stats['totalAttempts'].toString()),
              _buildStatRow('المزامنة الناجحة:', stats['successfulSyncs'].toString()),
              _buildStatRow('المزامنة الفاشلة:', stats['failedSyncs'].toString()),
              _buildStatRow('نسبة النجاح:', '${stats['successRate']}%'),
              _buildStatRow('المهام المخزنة:', stats['cachedTasksCount'].toString()),
              const Divider(),
              const Text('الإعدادات:', style: TextStyle(fontWeight: FontWeight.bold)),
              _buildStatRow('فترة المزامنة:', stats['configuration']['syncInterval']),
              _buildStatRow('تأخير إعادة المحاولة:', stats['configuration']['retryDelay']),
              _buildStatRow('أقصى محاولات:', stats['configuration']['maxRetries'].toString()),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('إغلاق'),
          ),
          TextButton(
            onPressed: () {
              RealSyncService.clearStatistics();
              Navigator.of(context).pop();
              _showMessage('تم مسح الإحصائيات');
            },
            child: const Text('مسح الإحصائيات'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(flex: 2, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500))),
          Expanded(flex: 3, child: Text(value)),
        ],
      ),
    );
  }

  Future<void> _testConnectivity() async {
    _showMessage('اختبار الاتصال...');
    
    final result = await RealSyncService.testConnectivity();
    
    if (result['success']) {
      _showMessage('الاتصال ناجح - وقت الاستجابة: ${result['responseTime']}');
    } else {
      _showMessage('فشل الاتصال: ${result['error'] ?? result['message']}');
    }
  }
}