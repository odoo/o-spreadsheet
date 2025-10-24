# PivotCorePlugin: Pivot Table Data Structure

The `pivots` property in o-spreadsheet defines pivot tables, which allow users to summarize and analyze data from sheets. The PivotCorePlugin manages the creation, configuration, and storage of these pivot tables.

---

## Structure

- **Top-level `pivots` object:**
  - Each key is a pivot ID (number or string).
  - Each value is a pivot table definition object.
- **`pivotNextId`:**
  - A number used to generate the next unique pivot ID.

---

## Pivot Table Definition

A pivot table object can include the following properties:

- `type`: string — Type of pivot (e.g., "SPREADSHEET").
- `columns`: array — List of column field objects (e.g., `[ { "fieldName": "Stage" } ]`).
- `rows`: array — List of row field objects (e.g., `[ { "fieldName": "Salesperson", "order": "asc" } ]`).
- `measures`: array — List of measure objects, each with:
  - `id`: string — Unique measure ID
  - `fieldName`: string — Field to aggregate
  - `aggregator`: string — Aggregation function (e.g., "sum", "count")
  - `userDefinedName`: string (optional) — Custom name
  - `computedBy`: object (optional) — Formula and sheet reference for computed measures
- `name`: string — Display name of the pivot table
- `dataSet`: object — Source data for the pivot:
  - `sheetId`: string — ID of the source sheet
  - `zone`: object — Data range with `top`, `bottom`, `left`, `right` indices
- `formulaId`: string — Formula reference for the pivot (if any)

---

## Example

```js
"pivots": {
  "1": {
    "type": "SPREADSHEET",
    "columns": [ { "fieldName": "Stage" } ],
    "rows": [ { "fieldName": "Salesperson", "order": "asc" } ],
    "measures": [
      {
        "id": "Expected Revenue:sum",
        "fieldName": "Expected Revenue",
        "aggregator": "sum"
      },
      {
        "id": "Commission",
        "fieldName": "Commission",
        "aggregator": "sum",
        "userDefinedName": "Commission",
        "computedBy": {
          "sheetId": "pivot",
          "formula": "='Expected Revenue:sum'*VLOOKUP(Salesperson,K2:L3,2,0)"
        }
      }
    ],
    "name": "My pivot",
    "dataSet": {
      "sheetId": "pivot",
      "zone": { "top": 0, "bottom": 21, "left": 0, "right": 8 }
    },
    "formulaId": "1"
  }
},
"pivotNextId": 2
```

---

## Notes

- Pivot IDs must be unique within the `pivots` object.
- The `pivotNextId` property is used internally to assign new IDs.
- The `columns`, `rows`, and `measures` arrays define the structure and calculations of the pivot table.
- The `dataSet` property specifies the source data range for the pivot.
- Computed measures can reference formulas and other fields for advanced calculations.
