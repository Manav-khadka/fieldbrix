import { Injectable } from '@nestjs/common';
import { TaskRunRepository } from './task-run.repository';
import {
  RecordEvidenceDto,
  RecordPartUsedDto,
  RegisterTargetDto,
  StartTaskRunDto,
  SubmitAnswersDto,
} from './task-run.dto';

@Injectable()
export class TaskRunService {
  constructor(private readonly repository: TaskRunRepository) {}

  listRunsForTask(taskId: string) {
    return this.repository.findByTaskId(taskId);
  }

  getRun(id: string) {
    return this.repository.findOrFail(id);
  }

  startRun(taskId: string, workerId: string, dto: StartTaskRunDto) {
    return this.repository.create({
      taskId,
      workerId,
      checkInGps: dto.checkInGps,
      targetMatchStatus: dto.targetMatchStatus,
    });
  }

  saveAnswer(runId: string, dto: SubmitAnswersDto) {
    return this.repository.saveAnswer({
      runId,
      sectionId: dto.sectionId,
      fieldKey: dto.fieldKey,
      value: dto.value,
      validationOutcome: dto.validationOutcome,
    });
  }

  recordPart(runId: string, dto: RecordPartUsedDto) {
    return this.repository.recordPart({
      runId,
      partId: dto.partId,
      quantity: dto.quantity,
      unit: dto.unit,
      oldPartReturned: dto.oldPartReturned,
      notes: dto.notes,
    });
  }

  recordEvidence(runId: string, dto: RecordEvidenceDto) {
    return this.repository.recordEvidence({
      runId,
      uploadId: dto.uploadId,
      category: dto.category,
      checksum: dto.checksum,
      geoLocation: dto.geoLocation,
      note: dto.note,
    });
  }

  registerTarget(workerId: string, dto: RegisterTargetDto) {
    return this.repository.registerTargetRequest({
      siteId: dto.siteId,
      qrIdentity: dto.qrIdentity,
      equipmentName: dto.equipmentName,
      equipmentType: dto.equipmentType,
      requestedBy: workerId,
    });
  }
}
