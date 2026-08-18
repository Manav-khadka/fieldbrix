import 'package:flutter/material.dart';
import '../models/task_model.dart';
import '../models/duty_state.dart';

class HomeTasksScreen extends StatefulWidget {
  const HomeTasksScreen({super.key});

  @override
  State<HomeTasksScreen> createState() => _HomeTasksScreenState();
}

class _HomeTasksScreenState extends State<HomeTasksScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  DutyState _dutyState = DutyState.initial();
  String _searchQuery = '';

  final List<MobileTask> _tasks = [
    const MobileTask(
      id: 'task-1',
      taskNumber: 'TSK-1001',
      description: 'Chiller Quarterly Maintenance',
      status: 'ASSIGNED',
      priority: 'HIGH',
      customerName: 'Oman Towers Real Estate',
      siteName: 'Al Khuwair Complex - Roof',
      targetName: 'Chiller Unit #3',
      qrIdentity: 'QR-CHILL-03',
      instructions: 'Check refrigerant pressure and compressor amperage',
      isOfflineSaved: true,
    ),
    const MobileTask(
      id: 'task-2',
      taskNumber: 'TSK-1002',
      description: 'Fire Suppression Inspection',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      customerName: 'Barka Logistics Hub',
      siteName: 'Warehouse B',
      targetName: 'Panel B2',
      instructions: 'Validate battery backup and smoke sensors',
      isOfflineSaved: true,
    ),
    const MobileTask(
      id: 'task-3',
      taskNumber: 'TSK-1003',
      description: 'Monthly Filter Replacement',
      status: 'COMPLETED',
      priority: 'NORMAL',
      customerName: 'Muscat City Mall',
      siteName: 'Food Court Plant Room',
      isOfflineSaved: false,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _toggleDuty() {
    setState(() {
      if (_dutyState.status == DutyStatus.offDuty) {
        _dutyState = DutyState(
          status: DutyStatus.onDuty,
          startedAt: DateTime.now(),
          latitude: 23.5880,
          longitude: 58.3829,
        );
      } else {
        _dutyState = DutyState.initial();
      }
    });
  }

  List<MobileTask> _filterTasks(String statusFilter) {
    return _tasks.where((t) {
      final matchesSearch = _searchQuery.isEmpty ||
          t.taskNumber.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          t.description.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (t.customerName ?? '').toLowerCase().contains(_searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      switch (statusFilter) {
        case 'TODAY':
          return t.status == 'ASSIGNED' || t.status == 'IN_PROGRESS';
        case 'UPCOMING':
          return t.status == 'SCHEDULED' || t.status == 'ASSIGNED';
        case 'URGENT':
          return t.priority == 'CRITICAL' || t.priority == 'HIGH';
        case 'OVERDUE':
          return false;
        case 'COMPLETED':
          return t.status == 'COMPLETED';
        case 'SYNC_PENDING':
          return t.isOfflineSaved;
        default:
          return true;
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isOnDuty = _dutyState.status == DutyStatus.onDuty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('FieldBrix Mobile', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.teal.shade800,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.cloud_done),
            tooltip: 'Offline Ready',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('All tasks and workflows saved offline.')),
              );
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: TextField(
                          decoration: const InputDecoration(
                            hintText: 'Search tasks, customers, QR…',
                            prefixIcon: Icon(Icons.search, size: 18),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(vertical: 8),
                          ),
                          onChanged: (val) => setState(() => _searchQuery = val),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isOnDuty ? Colors.green.shade600 : Colors.amber.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      ),
                      onPressed: _toggleDuty,
                      icon: Icon(isOnDuty ? Icons.check_circle : Icons.timer, size: 16),
                      label: Text(isOnDuty ? 'On Duty' : 'Start Duty', style: const TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
              TabBar(
                controller: _tabController,
                isScrollable: true,
                indicatorColor: Colors.white,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.teal.shade200,
                tabs: const [
                  Tab(text: 'Today'),
                  Tab(text: 'Upcoming'),
                  Tab(text: 'Urgent'),
                  Tab(text: 'Overdue'),
                  Tab(text: 'Completed'),
                  Tab(text: 'Sync (2)'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTaskList('TODAY'),
          _buildTaskList('UPCOMING'),
          _buildTaskList('URGENT'),
          _buildTaskList('OVERDUE'),
          _buildTaskList('COMPLETED'),
          _buildTaskList('SYNC_PENDING'),
        ],
      ),
    );
  }

  Widget _buildTaskList(String filter) {
    final list = _filterTasks(filter);
    if (list.isEmpty) {
      return Center(
        child: Text('No $filter tasks found.', style: TextStyle(color: Colors.grey.shade600)),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: list.length,
      separatorBuilder: (context, index) => const SizedBox(height: 8),
      itemBuilder: (ctx, idx) {
        final task = list[idx];
        return Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      task.taskNumber,
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: task.priority == 'CRITICAL' ? Colors.red.shade100 : Colors.teal.shade50,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        task.priority,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: task.priority == 'CRITICAL' ? Colors.red.shade800 : Colors.teal.shade800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(task.description, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                if (task.customerName != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.business, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${task.customerName} • ${task.siteName ?? ""}',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (task.qrIdentity != null)
                      Row(
                        children: [
                          const Icon(Icons.qr_code, size: 14, color: Colors.teal),
                          const SizedBox(width: 4),
                          Text(task.qrIdentity!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                        ],
                      )
                    else
                      const SizedBox.shrink(),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Opening dynamic workflow for ${task.taskNumber}')),
                        );
                      },
                      child: const Text('Execute Task', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
