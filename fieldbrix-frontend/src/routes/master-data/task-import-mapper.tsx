import {
  CORE_TASK_FIELDS,
  customSourceColumns,
  type TaskColumnAnalysis,
  type TaskFieldDataType,
  type TaskFieldSettings,
} from "./task-import-mapping";
import { Pagination } from "../../components/ui/Pagination";
import { useClientPagination } from "../../components/ui/pagination-state";

function sampleText(value: unknown) {
  if (value === null || value === undefined || value === "") return "Empty";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function TaskImportMapper({
  analysis,
  mapping,
  setMapping,
  fieldSettings,
  setFieldSettings,
  entityLabel,
  setEntityLabel,
}: {
  analysis: TaskColumnAnalysis;
  mapping: Record<string, string>;
  setMapping: (next: Record<string, string>) => void;
  fieldSettings: Record<string, TaskFieldSettings>;
  setFieldSettings: (
    update: (
      current: Record<string, TaskFieldSettings>,
    ) => Record<string, TaskFieldSettings>,
  ) => void;
  entityLabel: string;
  setEntityLabel: (value: string) => void;
}) {
  const customColumns = customSourceColumns(analysis, mapping);
  const fieldPagination = useClientPagination(customColumns, 20);

  const patchField = (column: string, patch: Partial<TaskFieldSettings>) =>
    setFieldSettings((current) => ({
      ...current,
      [column]: { ...current[column], ...patch },
    }));

  return (
    <section className="fb-import-mapper" aria-labelledby="task-mapping-title">
      <div className="fb-import-panel__heading">
        <span>Column mapping</span>
        <h2 id="task-mapping-title">Match their spreadsheet to FieldBrix</h2>
        <p>
          We detected {analysis.columns.length} columns and {analysis.totalRows}{" "}
          rows. Map the small fixed core; every unused column stays attached as
          structured task data.
        </p>
      </div>

      <label className="fb-import-entity-name">
        <span>What does this company call one work record?</span>
        <input
          className="fb-input"
          list="task-entity-labels"
          value={entityLabel}
          maxLength={40}
          onChange={(event) => setEntityLabel(event.target.value)}
        />
        <datalist id="task-entity-labels">
          {["Task", "Work order", "Job", "Visit", "Account", "Site"].map(
            (label) => (
              <option key={label} value={label} />
            ),
          )}
        </datalist>
        <small>
          This is a display label only. The internal task engine remains
          unchanged.
        </small>
      </label>

      <div className="fb-import-core-map">
        {CORE_TASK_FIELDS.map((field) => (
          <label key={field.key}>
            <span>
              {field.label}{" "}
              {field.required ? <b>Required</b> : <em>Optional</em>}
            </span>
            <select
              className="fb-select"
              value={mapping[field.key] ?? ""}
              onChange={(event) =>
                setMapping({ ...mapping, [field.key]: event.target.value })
              }
            >
              <option value="">Do not map</option>
              {analysis.columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
            <small>{field.help}</small>
          </label>
        ))}
      </div>

      <div className="fb-import-custom-fields">
        <div className="fb-import-custom-fields__heading">
          <div>
            <h3>Additional company fields</h3>
            <p>
              All {customColumns.length} columns below will be stored. Choose
              how each one behaves in the dashboard.
            </p>
          </div>
          <span>{customColumns.length} JSON fields</span>
        </div>
        <div
          className="fb-import-field-table"
          role="table"
          aria-label="Additional imported fields"
        >
          <div className="fb-import-field-row is-header" role="row">
            <span>Source column</span>
            <span>Dashboard label</span>
            <span>Type</span>
            <span>Show</span>
            <span>Search</span>
            <span>Filter</span>
          </div>
          {fieldPagination.pageItems.map((column) => {
            const settings = fieldSettings[column];
            if (!settings) return null;
            return (
              <div className="fb-import-field-row" role="row" key={column}>
                <span title={sampleText(analysis.sampleRows[0]?.[column])}>
                  <strong>{column}</strong>
                  <small>{sampleText(analysis.sampleRows[0]?.[column])}</small>
                </span>
                <label>
                  <span className="sr-only">Dashboard label for {column}</span>
                  <input
                    className="fb-input"
                    aria-label={`Dashboard label for ${column}`}
                    value={settings.label}
                    onChange={(event) =>
                      patchField(column, { label: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span className="sr-only">Data type for {column}</span>
                  <select
                    className="fb-select"
                    aria-label={`Data type for ${column}`}
                    value={settings.dataType}
                    onChange={(event) =>
                      patchField(column, {
                        dataType: event.target.value as TaskFieldDataType,
                      })
                    }
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes / no</option>
                    <option value="date">Date</option>
                  </select>
                </label>
                {(["visible", "searchable", "filterable"] as const).map(
                  (setting) => (
                    <label className="fb-import-check" key={setting}>
                      <input
                        type="checkbox"
                        aria-label={`${setting} ${column}`}
                        checked={settings[setting]}
                        onChange={(event) =>
                          patchField(column, {
                            [setting]: event.target.checked,
                          })
                        }
                      />
                      <span>✓</span>
                    </label>
                  ),
                )}
              </div>
            );
          })}
        </div>
        <Pagination
          page={fieldPagination.page}
          pageSize={fieldPagination.pageSize}
          total={fieldPagination.total}
          onPageChange={fieldPagination.setPage}
          onPageSizeChange={fieldPagination.setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          label="Additional imported fields pagination"
        />
      </div>
    </section>
  );
}
