enum DutyStatus { offDuty, onDuty, onBreak }

class DutyState {
  final DutyStatus status;
  final DateTime? startedAt;
  final double? latitude;
  final double? longitude;

  const DutyState({
    required this.status,
    this.startedAt,
    this.latitude,
    this.longitude,
  });

  factory DutyState.initial() => const DutyState(status: DutyStatus.offDuty);

  DutyState copyWith({
    DutyStatus? status,
    DateTime? startedAt,
    double? latitude,
    double? longitude,
  }) {
    return DutyState(
      status: status ?? this.status,
      startedAt: startedAt ?? this.startedAt,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
    );
  }
}
