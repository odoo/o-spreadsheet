## Formats

The `formats` object defines reusable number, date, and currency formats. Each key is a format ID (usually a string or number), and the value is a format string compatible with spreadsheet formatting conventions.

Example:

```js
"formats": {
  "1": "0.00%",           // Percentage with two decimals
  "2": "#,##0.00",        // Number with thousands separator and two decimals
  "3": "$#,##0,,\"K\"",   // Currency in thousands (e.g., $1,234K)
  "4": "m/d/yyyy",        // Date format
  "5": "hh:mm:ss a",      // Time format
  "6": "d/m/yyyy",        // Alternative date format
  "7": "[$$]#,##0.00"     // Currency with symbol
}
```

To apply a format to a cell or range, reference the format ID in the `formats` property of a sheet, mapping cell/range addresses to format IDs.

---

Usage Example:

```js
{
  "sheets": [
    ...,
    "formats": {
        "A1": "1",    // Apply format 1 (percentage defined above) to cell A1
        "C3": "1",    // Apply format 1 to cell C3
        "B2:B10": "2" // Apply format 2 to range B2:B10
    },
    ...
  ]
}
```
