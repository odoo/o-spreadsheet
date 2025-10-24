# o-spreadsheet Data Modeltyle doc

This document describes the data structure expected for importing spreadsheet data into o-spreadsheet.

---

## Top-Level Structure

```js
{
    // The version of the data model, used for compatibility checks and upgrading.
    // If omitted, it defaults to the latest version.
    "version": string, // this defintion is for version "18.4.2"

    // Used for multi user capabilities. In single user hardcode "START_REVISION".
    "revisionId": "START_REVISION" | string,

    // see the sheet Object, just below
    // the order of the sheets determines the order of the tabs in the UI.
    "sheets": [ ... ],

    // Styles for the cells, details in data-model/style.md
    "styles": { ... },

    // Formats for the cells, details in data-model/format.md
    "formats": { ... },

    // Boders for the cells, details in data-model/border.md
    "borders": { ... },

    // Should be set to true if the figure IDS are unique across all sheets, else false.
    "uniqueFigureIds": boolean,

    // Settings of the model, epecially the locale settings.
    "settings": {
      "locale": {
          "name": "English (US)",
          "code": "en_US",
          "thousandsSeparator": ",",
          "decimalSeparator": ".",
          "dateFormat": "m/d/yyyy",
          "timeFormat": "hh:mm:ss a",
          "formulaArgSeparator": ",",
          "weekStart": 7
        }
    },

    // Pivot tables, details in data-model/pivot.md
    "pivots": { ... },
    // Because there could be more than one type of pivot table (e.g. when integrating with odoo)
    // the pivotNextId is used to generate unique IDs for new pivot tables across all types.
    "pivotNextId": number,

    // details of custom table styles, see data-model/table-style.md
    "customTableStyles": { ... }
}
```

---

## Sheet Object

The SheetPlugin manages the structure and metadata of each worksheet. Each entry in the `sheets` array is a sheet object with the following properties:

```js
{
  // Unique identifier for the sheet
  "id": string,
  // Display name of the sheet
  "name": string,
  // Number of columns
  "colNumber": number,
  // Number of rows
  "rowNumber": number,
  // Optional: row metadata
  "rows": {
    number: {
      // Row index as key
      "size": number
      // Optional: custom row height in pixels
      "hidden": boolean
      // Optional: whether the row is hidden
    }
  },
  // Optional: column metadata (same as rows)
  "cols": {...},
  // Array of merged cell ranges (e.g., ["A1:B2"])
  "merges": [string, ...],
  // Cell values and formulas, keyed by address (e.g., {"A1": "value"})
  "cells": {...},
  // Cell/range to style ID mapping
  "styles": {...},
  // Cell/range to format ID mapping
  "formats": {...},
  // Cell/range to border style ID mapping
  "borders": {...},
  // Array of conditional formatting rules
  "conditionalFormats": [...],
  // Array of data validation rules
  "dataValidationRules": [...],
  // Array of figures (charts, images, etc.)
  "figures": [...],
  // Array of table definitions
  "tables": [...],
  // Show/hide grid lines
  "areGridLinesVisible": boolean,
  // Show/hide the sheet
  "isVisible": boolean,
  // The definition of the groups of columns and rows
  "headerGroups": {
    "ROW": [ // Row header groupings
      {
        "start": number, // Start row index for the group
        "end": number,   // End row index for the group
        "isFolded": boolean, // (optional) Whether the group is folded
      }
    ],
    "COL": [ ... ] // Column header groupings same structure as ROW
  },
  // Split pane configuration
  "panes": {
    "xSplit": number, // Column index to split at (0 for no split)
    "ySplit": number  // Row index to split at (0 for no split)
  },
  // Tab color (hex code)
  "color": string
}
```

---

## Example

See `demo/data.js` for a full example of a valid data structure.

---

## Notes

- All keys are case-sensitive.
- Some plugins may use additional or optional fields.
- Plugins ignore unknown fields, but missing required fields may cause errors or incomplete imports.
