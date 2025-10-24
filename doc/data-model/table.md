# Tables Plugin Data Model

The tables plugin manages the creation, update, and deletion of tables within a spreadsheet. It maintains the state of all tables per sheet and provides mechanisms for importing, exporting, and manipulating table data.

## Data Structure

```js
"tables":
[
    {
        "range": string, // Range of the table in A1 notation (e.g., "A2:D15")
        "type": "static" | "dynamicTable" | "forceStatic", // Type of the table
        "config": {
            "hasFilters": boolean, // Indicates if the table has automatic filters
            "totalRow": boolean, // Indicates if the table has a total row with specific formatting
            "firstColumn": boolean, // Indicates if the first column is a header
            "lastColumn": boolean, // Indicates if the last column has specific formatting
            "numberOfHeaders": number, // Number of header rows in the table
            "bandedRows": boolean, // Indicates if the table has banded rows
            "bandedColumns": boolean, // Indicates if the table has banded columns
            "automaticAutofill": boolean, // Indicates if the table automatically extends when editing adjacent cells
            "styleId": string // ID of the table style to apply see src/helpers/table_presets.ts:285
        }
    }
],
```

### Table Types

There are two main types of tables:

- **Static**:  
  Represents a fixed range table with optional filters and headers.
- **DynamicTable**:  
  Represents a table that automatically adjusts its range based on content of a single cell. This is useful for formula that spills data into a range.
- **ForceStatic**:  
  Similar to static but with enforced static behavior, preventing automatic resizing even for formula that spills.

## Example

```js
{
  "sheets": [{
    ...
    "tables": [
        {
            "range": "A2:D15",
            "type": "static",
            "config": {
                "hasFilters": false,
                "totalRow": false,
                "firstColumn": false,
                "lastColumn": false,
                "numberOfHeaders": 1,
                "bandedRows": true,
                "bandedColumns": false,
                "automaticAutofill": true,
                "styleId": "TableStyleMedium19"
            }
        }
    ],
  }],
}
```

## Notes

- Table ranges must not overlap.
- Table extension (adding rows/columns) is handled automatically when editing adjacent cells.
- Import/export functions convert between internal and external representations, preserving table configuration and structure.
