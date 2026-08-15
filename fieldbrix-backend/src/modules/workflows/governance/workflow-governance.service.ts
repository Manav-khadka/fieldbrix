import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkflowGovernanceRepository } from './workflow-governance.repository';

@Injectable()
export class WorkflowGovernanceService {
  constructor(private readonly repo: WorkflowGovernanceRepository) {}

  async publish(workflowId: string, notes: string, revision: number) {
    try {
      return await this.repo.publish(workflowId, revision, notes);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'WORKFLOW_INVALID')
        throw new BadRequestException('WORKFLOW_INVALID');
      if (msg === 'STALE_WORKFLOW_REVISION')
        throw new BadRequestException('STALE_WORKFLOW_REVISION');
      throw err;
    }
  }

  versions(workflowId: string) {
    return this.repo.versions(workflowId);
  }

  getVersion(versionId: string) {
    return this.repo.getVersion(versionId);
  }

  async archive(workflowId: string, revision: number) {
    try {
      return await this.repo.archive(workflowId, revision);
    } catch (err) {
      if ((err as Error).message === 'STALE_WORKFLOW_REVISION')
        throw new BadRequestException('STALE_WORKFLOW_REVISION');
      throw err;
    }
  }

  templates() {
    return this.repo.templates();
  }

  instantiateTemplate(templateId: string, tenantId: string) {
    return this.repo.instantiateTemplate(templateId, tenantId);
  }
}
