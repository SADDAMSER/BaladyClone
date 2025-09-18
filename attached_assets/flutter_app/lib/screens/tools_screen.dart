import 'package:flutter/material.dart';

class ToolsScreen extends StatelessWidget {
  const ToolsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('أدوات')),
      body: ListView(
        children: const [
          ListTile(
            leading: Icon(Icons.calculate, color: Colors.blue),
            title: Text('حسابات COGO'),
            subtitle: Text('اتجاه/مسافة، تقاطع، إسقاط — عناصر نائبة'),
          ),
          Divider(height: 1),
          ListTile(
            leading: Icon(Icons.square_foot, color: Colors.green),
            title: Text('المحيط والمساحة'),
            subtitle: Text('حسابات سريعة للمحيط/المساحة — عنصر نائب'),
          ),
        ],
      ),
    );
  }
}