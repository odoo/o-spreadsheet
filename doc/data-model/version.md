# Data Model Migration History

This document describes the migration steps applied to the o-spreadsheet data model, version by version, as implemented in `src/migrations/migration_steps.ts`.

---

## 0.1

- Add the `activeSheet` field to the data (set to the first sheet's name).

## 0.2

- Add an `id` field to each sheet (defaults to the sheet's name if missing).

## 0.3

- Change `activeSheet` from a sheet name to a sheet id.

## 0.4

- Add a `figures` array to each sheet (if missing).

## 0.5

- Normalize cell content if it is a formula: store the normalized formula in a `formula` property.

## 0.6

- Transform chart data structure: update `dataSets` in chart figures, add `dataSetsHaveTitle`, and convert label cell references.

## 0.7

- Remove single quotes from sheet names and update all references (formulas, charts, conditional formats) accordingly.

## 0.8

- Add design attributes to chart figures: `background`, `verticalAxisPosition`, `legendPosition`, and `stacked`.

## 0.9

- De-normalize formulas to reduce exported JSON size: replace formula references with actual text and remove the `formula` property.

## 0.10

- Normalize cell formats: assign format IDs and collect all formats in a top-level `formats` object.

## 15.4

- Add `isVisible` property to all sheets (default: true).

## 15.4.1

- Fix data filter duplication in sheets.

## 16.3

- Change border description structure: convert border arrays to objects with `style` and `color` properties.

## 16.4

- Add `locale` to spreadsheet settings (default to `DEFAULT_LOCALE` if missing).

## 16.4.1

- Fix data filter duplication (post saas-17.1).

## 17.2

- Rename `filterTable` to `tables` in sheets.

## 17.3

- Add `pivots` and `pivotNextId` to the top-level data structure.

## 17.4

- Transform chart data structure (2): ensure chart titles are objects, and `dataSets` are arrays of objects with `dataRange`.

## 18.0

- Technical migration, does nothing but need to exist

## 18.0.1

- Change `name` to `fieldName` in pivot measures and dimensions; add `id` to measures.

## 18.0.2

- Add `weekStart` to locale settings (based on locale code, default to Monday).

## 18.0.3

- Group style, format, and border into per-zone mappings in sheets; remove these properties from cell objects.

## 18.0.4

- Add `operator` to gauge chart inflection points in chart figures.

## 18.1

- Tables are no longer inserted with filters by default; ensure `config` is present for all tables.

## 18.1.1

- Flatten cell content: convert `{ content: "value" }` to just `"value"` in cells.

## 18.2

- Empty migration step for Odoo pivot custom sorting.

## 18.3

- Remove invalid `sortedColumn` references in pivots if the referenced measure does not exist.

## 18.3.1

- Ensure fixed position, anchor, and offset for existing figures; remove `x` and `y` properties.

## 18.4.1

- Rename conditional format and data validation operators to new naming conventions.

## 18.4.2

- In scorecard charts, convert `baselineDescr` from string to object with a `text` property.

---

For details and code, see `src/migrations/migration_steps.ts`.
