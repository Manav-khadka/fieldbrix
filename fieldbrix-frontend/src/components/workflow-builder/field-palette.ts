export interface FieldPaletteItem {
  type: string;
  label: string;
  icon: string;
  desc: string;
}

export interface FieldPaletteCategory {
  category: string;
  items: FieldPaletteItem[];
}

export const FIELD_PALETTE: FieldPaletteCategory[] = [
  {
    category: "Basic Inputs",
    items: [
      {
        type: "TEXT",
        label: "Short Text",
        icon: "TXT",
        desc: "Single line text input",
      },
      {
        type: "LONG_TEXT",
        label: "Multiline Notes",
        icon: "AREA",
        desc: "Long description or observations",
      },
      {
        type: "NUMBER",
        label: "Measurement / Number",
        icon: "NUM",
        desc: "Numeric value with units & limits",
      },
      {
        type: "BOOLEAN",
        label: "Yes / No Toggle",
        icon: "Y/N",
        desc: "Binary toggle switch",
      },
      {
        type: "SINGLE_CHOICE",
        label: "Single Choice",
        icon: "SEL",
        desc: "Dropdown selection",
      },
      {
        type: "MULTIPLE_CHOICE",
        label: "Multi-Select",
        icon: "MULTI",
        desc: "Multiple choice checkboxes",
      },
    ],
  },
  {
    category: "Date & Time",
    items: [
      {
        type: "DATE",
        label: "Date Picker",
        icon: "DATE",
        desc: "Calendar date selection",
      },
      {
        type: "TIME",
        label: "Time Picker",
        icon: "TIME",
        desc: "Time of day selector",
      },
      {
        type: "DATETIME",
        label: "Date & Time",
        icon: "D+T",
        desc: "Full timestamp selection",
      },
    ],
  },
  {
    category: "Field Verification & Proof",
    items: [
      {
        type: "IMAGE",
        label: "Photo Evidence",
        icon: "PHOTO",
        desc: "Mandatory photo capture with GPS watermark",
      },
      {
        type: "FILE",
        label: "Document / File",
        icon: "FILE",
        desc: "Upload technical document or PDF",
      },
      {
        type: "SIGNATURE",
        label: "Signature Pad",
        icon: "SIG",
        desc: "Customer or tech sign-off",
      },
      {
        type: "SCANNER",
        label: "Barcode / QR Scanner",
        icon: "SCAN",
        desc: "Scan equipment serial or tag",
      },
      {
        type: "GPS",
        label: "GPS Location Stamp",
        icon: "GPS",
        desc: "Current geocoordinates check",
      },
      {
        type: "SECTION_INSTRUCTION",
        label: "Instruction Card",
        icon: "INFO",
        desc: "Read-only safety guidance",
      },
    ],
  },
];
