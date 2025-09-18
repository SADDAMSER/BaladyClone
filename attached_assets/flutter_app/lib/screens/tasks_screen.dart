import 'package:flutter/material.dart';
import 'package:dreamflow_app/services/database_service.dart';
import 'package:dreamflow_app/models/survey_models.dart';
import 'package:dreamflow_app/screens/task_details_screen.dart';
import 'package:dreamflow_app/services/sync_service.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  List<SurveyTask> _tasks = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  void _loadTasks() {
    setState(() {
      _tasks = DatabaseService.getAllTasks();
    });
  }

  Future<void> _manualSync() async {
    setState(() => _isLoading = true);
    await SyncService.syncAll();
    setState(() => _isLoading = false);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(SyncService.isOnline ? 'تمت المزامنة' : 'لا يمكن المزامنة - وضع عدم الاتصال')),    
    );
    _loadTasks();
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
            tooltip: SyncService.isOnline ? 'مزامنة' : 'غير متصل',
            onPressed: _manualSync,
            icon: Icon(SyncService.isOnline ? Icons.sync : Icons.sync_disabled),
          ),
          IconButton(
            onPressed: _loadTasks,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          if (!SyncService.isOnline)
            Container(
              width: double.infinity,
              color: Colors.orange.withValues(alpha: 0.2),
              padding: const EdgeInsets.all(8),
              child: const Center(child: Text('وضع عدم الاتصال - سيتم وضع البيانات في انتظار المزامنة')), 
            ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _tasks.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.assignment, size: 64, color: Colors.grey),
                            SizedBox(height: 16),
                            Text('لا توجد مهام مخصصة', style: TextStyle(fontSize: 18, color: Colors.grey)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: _tasks.length,
                        itemBuilder: (context, index) {
                          final task = _tasks[index];
                          final pending = DatabaseService.hasPendingSync(task.id);
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
}