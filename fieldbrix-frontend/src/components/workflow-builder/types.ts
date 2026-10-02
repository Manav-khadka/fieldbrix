export interface WorkflowSection {
  id: string;
  title: string;
  description?: string;
  position: number;
}

export interface ConditionalRule {
  dependsOnFieldId?: string;
  operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "IS_SET" | "IS_NOT_SET";
  value?: string;
}

export interface WorkflowFieldConfig {
  placeholder?: string;
  options?: Array<string | { value: string; label?: string }>;
  min?: number;
  max?: number;
  unit?: string;
  regexPattern?: string;
  regexErrorMessage?: string;
  minLength?: number;
  maxLength?: number;
  photoCountMin?: number;
  photoCountMax?: number;
  maxFileSizeMb?: number;
  aspectRatio?: "ANY" | "1:1" | "4:3" | "16:9";
  imageQuality?: "HIGH" | "MEDIUM" | "LOW";
  allowedFileExtensions?: string[];
  geofenceRadiusKm?: number;
  centerLatitude?: number;
  centerLongitude?: number;
  centerAddress?: string;
  conditionalRule?: ConditionalRule;
  supervisorOnly?: boolean;
  workerEditable?: boolean;
}

export interface WorkflowField {
  id: string;
  key: string;
  label: string;
  type: string;
  sectionId?: string;
  help?: string;
  required?: boolean;
  position?: number;
  config?: WorkflowFieldConfig;
}

export interface WorkflowSchema {
  sections: WorkflowSection[];
  fields: WorkflowField[];
  rules: unknown[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  revision: number;
  industry?: string;
  category?: string;
  schema?: WorkflowSchema;
}
