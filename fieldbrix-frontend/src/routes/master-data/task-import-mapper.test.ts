import { describe, expect, it } from "vitest";
import {
  buildInitialFieldSettings,
  buildInitialMapping,
  customSourceColumns,
  type TaskColumnAnalysis,
  type TaskFieldProfile,
} from "./task-import-mapping";

describe("task import column mapping", () => {
  it("suggests obvious headings while keeping the mapping visible and editable", () => {
    const mapping = buildInitialMapping([
      "Ticket ID",
      "Mobile Number",
      "Lat",
      "Lng",
      "Complaint Summary",
    ]);
    expect(mapping).toEqual(
      expect.objectContaining({
        externalReferenceId: "Ticket ID",
        contactPhone: "Mobile Number",
        latitude: "Lat",
        longitude: "Lng",
        description: "Complaint Summary",
      }),
    );
  });

  it("prefers a previously saved company/workflow mapping", () => {
    const mapping = buildInitialMapping(
      ["Case Number", "Reference", "Phone", "Latitude", "Longitude"],
      { externalReferenceId: "Case Number" },
    );
    expect(mapping.externalReferenceId).toBe("Case Number");
  });

  it("treats every unmapped heading as a custom JSON field", () => {
    const analysis: TaskColumnAnalysis = {
      columns: ["Reference", "Phone", "Lat", "Lng", "Account", "Tier"],
      sampleRows: [],
      totalRows: 1,
    };
    expect(
      customSourceColumns(analysis, {
        externalReferenceId: "Reference",
        contactPhone: "Phone",
        latitude: "Lat",
        longitude: "Lng",
      }),
    ).toEqual(["Account", "Tier"]);
  });

  it("handles 100-column schemas and restores saved display behavior", () => {
    const columns = Array.from(
      { length: 100 },
      (_, index) => `Column ${index + 1}`,
    );
    const analysis: TaskColumnAnalysis = {
      columns,
      sampleRows: [{ "Column 1": "12", "Column 100": "yes" }],
      totalRows: 5000,
    };
    const profile = {
      fieldDefinitions: [
        {
          key: "Column 100",
          sourceColumn: "Column 100",
          label: "VIP",
          dataType: "boolean",
          searchable: false,
          filterable: true,
        },
      ],
      visibleColumns: ["number", "Column 100"],
    } as TaskFieldProfile;

    const settings = buildInitialFieldSettings(analysis, profile);
    expect(Object.keys(settings)).toHaveLength(100);
    expect(settings["Column 1"].dataType).toBe("number");
    expect(settings["Column 100"]).toEqual(
      expect.objectContaining({
        label: "VIP",
        dataType: "boolean",
        filterable: true,
        visible: true,
      }),
    );
  });
});
