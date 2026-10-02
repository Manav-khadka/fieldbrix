export type AdminView =
  | "overview"
  | "tenants"
  | "company"
  | "people"
  | "roles"
  | "security"
  | "files"
  | "sessions"
  | "operations";

export type AdminTenant = {
  id: string;
  name: string;
  status: string;
  timezone: string;
  users: number;
  branches: number;
};

export type AdminRole = {
  id: string;
  name: string;
  permissions: string[];
  preset: boolean;
  revision: number;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles: string[];
};

export type WorkforcePerson = AdminUser & {
  jobTitle: string;
  workforceType:
    | "COMPANY_ADMIN"
    | "OFFICE"
    | "FIELD_WORKER"
    | "SUPERVISOR"
    | "QUALITY_REVIEWER";
  primaryTeamId?: string;
  canReceiveTasks: boolean;
  canAssignTasks: boolean;
  canVerifyTasks: boolean;
  workflowAccess: Array<{
    workflowId: string;
    accessLevel: "PERFORM" | "SUPERVISE" | "VERIFY";
  }>;
  teamIds: string[];
};

export type WorkforceDepartment = AdminItem & {
  departmentLabel: string;
  verificationMode: "AUTO" | "MANUAL_SUPERVISOR" | "QUALITY_DEPARTMENT";
  requiredApprovals: number;
  supervisorIds: string[];
  qualityReviewerIds: string[];
  workflowIds: string[];
  memberCount: number;
};

export type WorkforceWorkflow = { id: string; name: string; status: string };
export type WorkforceDirectory = {
  people: WorkforcePerson[];
  departments: WorkforceDepartment[];
  workflows: WorkforceWorkflow[];
};

export type PlatformStaff = {
  id: string;
  email: string;
  displayName: string;
  accessLevel: "SUPER_ADMIN" | "SUB_ADMIN";
  capabilities: string[];
  active: boolean;
};

export type AdminItem = {
  id: string;
  name: string;
  timezone?: string;
  active: boolean;
  leadUserId?: string;
};

export type AdminSession = {
  id: string;
  userId: string;
};

export type AdminAuditEvent = {
  id: string;
  action: string;
  targetId: string;
  occurredAt: string;
};

export type GodSession = {
  id: string;
  tenantId: string;
  expiresAt: string;
};

export type RequestFn = (
  path: string,
  options?: RequestInit,
  platform?: boolean,
) => Promise<any>;
