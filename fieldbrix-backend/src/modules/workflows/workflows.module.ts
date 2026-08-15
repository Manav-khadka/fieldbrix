import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';

import { WorkflowDraftController } from './draft/workflow-draft.controller';
import { WorkflowDraftService } from './draft/workflow-draft.service';
import { WorkflowDraftRepository } from './draft/workflow-draft.repository';

import { WorkflowRuleController } from './rules/workflow-rule.controller';
import { WorkflowRuleService } from './rules/workflow-rule.service';
import { WorkflowRuleRepository } from './rules/workflow-rule.repository';

import { WorkflowGovernanceController } from './governance/workflow-governance.controller';
import { WorkflowGovernanceService } from './governance/workflow-governance.service';
import { WorkflowGovernanceRepository } from './governance/workflow-governance.repository';

@Module({
  imports: [DatabaseModule, AuthorizationModule, IdempotencyModule],
  controllers: [
    WorkflowDraftController,
    WorkflowRuleController,
    WorkflowGovernanceController,
  ],
  providers: [
    WorkflowDraftService,
    WorkflowDraftRepository,
    WorkflowRuleService,
    WorkflowRuleRepository,
    WorkflowGovernanceService,
    WorkflowGovernanceRepository,
  ],
  exports: [WorkflowDraftService, WorkflowGovernanceService],
})
export class WorkflowsModule {}
