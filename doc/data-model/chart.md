# ChartPlugin: Chart Data Structure

The ChartPlugin manages chart figures in o-spreadsheet. Charts are stored as entries in the `figures` array of each sheet object, with a `tag` of `"chart"` and a `data` object describing the chart configuration.

---

## Structure

- **Per-sheet `figures` array:**
  - Each entry is a figure object.
  - Chart figures have `tag: "chart"` and a `data` object.

The complete definition of each chart is complex, the details are defined in [src/types/chart/chart.ts](src/types/chart/chart.ts).
To have a detailed chart, create it in o-spreadsheet and export the data to see the full structure.

---

## Chart Figure Object

```json
{
  "id": string,           // Unique figure ID
  "tag": "chart",         // Identifies this figure as a chart

  // Chart site and positionning
  "col": number,          // Column of the anchor of the chart
  "row": number,          // Row of the anchor of the chart
  "offset" {              // Position starting from the col andd row in pixels
    "x": number,
    "y": number,
  },
  "width": number,        // Chart width in pixels
  "height": number,       // Chart height in pixels

  // Definition of the chart
  "data": {
    "type": string,       // Chart type (e.g., "line", "bar", "pie", "scatter", "combo", etc.)
    "dataSetsHaveTitle": boolean, // Whether datasets have titles
    "background": string, // Background color (hex code)
    "dataSetsHaveTitle": false, // (optional) Whether this dataset has a title
    "dataSets": [         // Array of dataset objects
      {
        "type": string,      // (optional) For combo charts: dataset type (e.g., "bar", "line")
        "dataRange": string, // Cell range for data (e.g., "Sheet1!B26:B35")
        "yAxisId": "y",
        "label": string,     // Label of the data series
        "backgroundColor": string,
        "trend": {
            "type": "polynomial" | "exponential" | "logarithmic" | "trailingMovingAverage",
            "display": true,
            "order": number, // (optional)
            "color": string, // (optional)
            "window": number // (optional)
        }
      },
      // ...
    ],
    // Cell range for labels
    "legendPosition": "top"|"left"|"bottom"|"right"|"none", "labelRange": string,
    "title": {                      // Chart title
        "text": string,
        "bold": boolean,
        "italic": boolean,
        "align": "left" | "center" | "right",        // Text alignment
        "verticalAlign": "top" | "middle" | "bottom",// Vertical alignment
        "fontSize": number,          // Font size in pixels
        "color": string,             // Text color (hex code)
        "fillColor": string,         // Background color for the title
     },
    "stacked": boolean (for bar/line/combo),
    "aggregated": boolean,

    // Additional chart-type-specific options:
    // - "region": string (for geo charts)
    // - "verticalAxisPosition": string (for waterfall)
    // - "showSubTotals": boolean
    // - "showConnectorLines": boolean
    // - etc.
  }
}
```

---

## Example

```json
"figures": [
    {
        "id": "c85dcad9-ca99",
        "col": 2,
        "row": 11,
        "offset": {
            "x": 52.5,
            "y": 3
        },
        "width": 536,
        "height": 335,
        "tag": "chart",
        "data": {
        "type": "bar",
        "dataSetsHaveTitle": true,
        "dataSets": [
            {
                "dataRange": "B2:B16",
                "yAxisId": "y"
            }
        ],
        "legendPosition": "none",
        "labelRange": "A2:A16",
        "title": {},
        "stacked": false,
        "aggregated": false
        }
    }
]
```

---

## Notes

- Chart figures are always stored in the `figures` array of a sheet, not at the top level.
- The `data` object can include additional properties depending on the chart type (see examples in demo/data.js).
- Chart IDs must be unique within the sheet.
- The `x` and `y` properties control the chart's position on the canvas (optional).
- For more advanced chart types (e.g., combo, geo, waterfall), see the full data structure in demo/data.js.
