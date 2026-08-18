class MobileTask {
  final String id;
  final String taskNumber;
  final String description;
  final String status;
  final String priority;
  final String? customerName;
  final String? siteName;
  final String? targetName;
  final String? qrIdentity;
  final String? scheduledAt;
  final String? instructions;
  final bool isOfflineSaved;

  const MobileTask({
    required this.id,
    required this.taskNumber,
    required this.description,
    required this.status,
    required this.priority,
    this.customerName,
    this.siteName,
    this.targetName,
    this.qrIdentity,
    this.scheduledAt,
    this.instructions,
    this.isOfflineSaved = false,
  });

  factory MobileTask.fromJson(Map<String, dynamic> json) {
    return MobileTask(
      id: json['id'] as String,
      taskNumber: json['taskNumber'] as String? ?? 'TSK-0000',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'DRAFT',
      priority: json['priority'] as String? ?? 'NORMAL',
      customerName: json['customerName'] as String?,
      siteName: json['siteName'] as String?,
      targetName: json['targetName'] as String?,
      qrIdentity: json['qrIdentity'] as String?,
      scheduledAt: json['scheduledAt'] as String?,
      instructions: json['instructions'] as String?,
      isOfflineSaved: json['isOfflineSaved'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskNumber': taskNumber,
      'description': description,
      'status': status,
      'priority': priority,
      'customerName': customerName,
      'siteName': siteName,
      'targetName': targetName,
      'qrIdentity': qrIdentity,
      'scheduledAt': scheduledAt,
      'instructions': instructions,
      'isOfflineSaved': isOfflineSaved,
    };
  }
}
