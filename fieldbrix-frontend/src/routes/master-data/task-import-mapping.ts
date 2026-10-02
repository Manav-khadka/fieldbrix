export type TaskFieldDataType = "text" | "number" | "boolean" | "date";

export interface TaskColumnAnalysis {
  columns: string[];
  sampleRows: Array<Record<string, unknown>>;
  totalRows: number;
}

export interface TaskFieldSettings {
  label: string;
  dataType: TaskFieldDataType;
  searchable: boolean;
  filterable: boolean;
  visible: boolean;
}

export interface TaskFieldProfile {
  id: string;
  customerId: string;
  workflowId: string;
  entityLabel: string;
  columnMapping: Record<string, string>;
  fieldDefinitions: Array<{
    key: string;
    sourceColumn: string;
    label: string;
    dataType: TaskFieldDataType;
    searchable: boolean;
    filterable: boolean;
  }>;
  visibleColumns: string[];
  revision: number;
}

export const CORE_TASK_FIELDS = [
  {
    key: "externalReferenceId",
    label: "Unique reference ID",
    required: true,
    help: "The company-owned ticket, work-order, account, or site reference.",
    aliases: [
      "externalreferenceid",
      "referenceid",
      "reference",
      "taskid",
      "jobid",
      "ticketid",
    ],
  },
  {
    key: "contactPhone",
    label: "Phone number",
    required: true,
    help: "The contact number the field worker needs.",
    aliases: ["contactphone", "phone", "phonenumber", "mobile", "mobilenumber"],
  },
  {
    key: "latitude",
    label: "Latitude",
    required: true,
    help: "The work location latitude, from −90 to 90.",
    aliases: ["latitude", "lat", "gpslat"],
  },
  {
    key: "longitude",
    label: "Longitude",
    required: true,
    help: "The work location longitude, from −180 to 180.",
    aliases: ["longitude", "lng", "lon", "long", "gpslng"],
  },
  {
    key: "description",
    label: "Description",
    required: false,
    help: "A short description shown to dispatch and the field worker.",
    aliases: [
      "description",
      "task",
      "job",
      "summary",
      "complaintsummary",
      "title",
      "subject",
    ],
  },
  {
    key: "instructions",
    label: "Instructions",
    required: false,
    help: "Notes or instructions carried with the work item.",
    aliases: ["instructions", "notes", "jobnotes", "remarks"],
  },
  {
    key: "scheduledAt",
    label: "Scheduled date/time",
    required: false,
    help: "When the work is planned to start.",
    aliases: ["scheduledat", "scheduled", "appointmentat", "appointmentdate"],
  },
  {
    key: "dueAt",
    label: "Due date/time",
    required: false,
    help: "The deadline or promised completion time.",
    aliases: ["dueat", "due", "deadline", "duedate"],
  },
  {
    key: "estimatedMinutes",
    label: "Estimated minutes",
    required: false,
    help: "Expected duration used by capacity and assignment rules.",
    aliases: ["estimatedminutes", "durationminutes", "duration"],
  },
  {
    key: "priority",
    label: "Priority",
    required: false,
    help: "For example LOW, NORMAL, HIGH, or URGENT.",
    aliases: ["priority", "severity", "urgency"],
  },
] as const;

const normalizeHeading = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

function readableHeading(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function inferDataType(values: unknown[]): TaskFieldDataType {
  const present = values.filter(
    (value) => value !== null && value !== undefined && value !== "",
  );
  if (!present.length) return "text";
  if (
    present.every(
      (value) =>
        typeof value === "number" ||
        (typeof value === "string" && Number.isFinite(Number(value))),
    )
  )
    return "number";
  if (
    present.every((value) =>
      ["true", "false", "yes", "no", "1", "0"].includes(
        String(value).toLowerCase(),
      ),
    )
  )
    return "boolean";
  return "text";
}

export function buildInitialMapping(
  columns: string[],
  saved: Record<string, string> = {},
): Record<string, string> {
  const byNormalized = new Map(
    columns.map((column) => [normalizeHeading(column), column]),
  );
  return Object.fromEntries(
    CORE_TASK_FIELDS.map((field) => {
      const savedColumn = saved[field.key];
      if (savedColumn && byNormalized.has(normalizeHeading(savedColumn)))
        return [
          field.key,
          byNormalized.get(normalizeHeading(savedColumn)) ?? "",
        ];
      const guessed = field.aliases
        .map((alias) => byNormalized.get(alias))
        .find(Boolean);
      return [field.key, guessed ?? ""];
    }),
  ) as Record<string, string>;
}

export function buildInitialFieldSettings(
  analysis: TaskColumnAnalysis,
  profile?: TaskFieldProfile,
): Record<string, TaskFieldSettings> {
  const configured = new Map(
    (profile?.fieldDefinitions ?? []).map((field) => [
      normalizeHeading(field.sourceColumn),
      field,
    ]),
  );
  return Object.fromEntries(
    analysis.columns.map((column, index) => {
      const saved = configured.get(normalizeHeading(column));
      return [
        column,
        {
          label: saved?.label ?? readableHeading(column),
          dataType:
            saved?.dataType ??
            inferDataType(analysis.sampleRows.map((row) => row[column])),
          searchable: saved?.searchable ?? true,
          filterable: saved?.filterable ?? false,
          visible:
            profile?.visibleColumns.includes(saved?.key ?? column) ?? index < 4,
        },
      ];
    }),
  );
}

export function customSourceColumns(
  analysis: TaskColumnAnalysis,
  mapping: Record<string, string>,
) {
  const mapped = new Set(
    Object.values(mapping).filter(Boolean).map(normalizeHeading),
  );
  return analysis.columns.filter(
    (column) => !mapped.has(normalizeHeading(column)),
  );
}
