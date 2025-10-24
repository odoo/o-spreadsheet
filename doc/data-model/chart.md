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

```js
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
    "humanizeLargeNumbers": boolean, // Whether to humanize large numbers (e.g., 1K, 1M)

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

```js
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

---

## Carousel Data Model

A carousel is a figure that can contain multiple charts (and optionally data views) and allows users to switch between them. Carousel figures are stored in the `figures` array of a sheet object, with a `tag` of `"carousel"` and a `data` object describing the carousel configuration.

### Carousel Figure Object

```js
{
  "id": string,           // Unique figure ID
  "tag": "carousel",      // Identifies this figure as a carousel
  "col": number,          // Column of the anchor of the carousel
  "row": number,          // Row of the anchor of the carousel
  "offset": {             // Position starting from the col and row in pixels
    "x": number,
    "y": number
  },
  "width": number,        // Carousel width in pixels
  "height": number,       // Carousel height in pixels
  "data": {
    "chartDefinitions": { // (optional) Map of chartId to chart definition
      [chartId: string]: { ...chartDefinition }
    },
    "items": [            // Array of carousel items
      {
        "type": "chart",      // Item type: chart
        "chartId": string,    // ID referencing a chart definition in chartDefinitions
        "carouselTitle": {    // (optional) Title design for this chart in the carousel
          "text": string,
          "bold": boolean,
          "italic": boolean,
          "align": "left"|"center"|"right",
          "verticalAlign": "top"|"middle"|"bottom",
          "fontSize": number,
          "color": string,
          "fillColor": string
        }
      },
      {
        "type": "carouselDataView" // Item type: data view (optional)
      }
      // ...
    ]
  }
}
```

#### Notes on `chartDefinitions`

- The `chartDefinitions` object maps chart IDs to their chart configuration.
- Each carousel item of type `"chart"` references its chart definition by `chartId`.
- This allows the carousel to manage multiple charts internally, without requiring separate chart figures.

### Example

```js
"figures": [
  {
    "id": "carousel-1",
    "col": 1,
    "row": 5,
    "offset": { "x": 0, "y": 0 },
    "width": 600,
    "height": 400,
    "tag": "carousel",
    "data": {
      "chartDefinitions": {
        "1": {
          "type": "line",
          "dataSetsHaveTitle": true,
          "background": "#FFFFFF",
          "dataSets": [
            { "dataRange": "Sheet1!B26:B35" },
            { "dataRange": "Sheet1!C26:C35" }
          ],
          "legendPosition": "top",
          "labelRange": "Sheet1!A27:A35",
          "title": {},
          "stacked": false,
          "humanize": true
        },
        "2": {
          "type": "bar",
          "dataSetsHaveTitle": false,
          "background": "#FFFFFF",
          "dataSets": [
            { "dataRange": "Sheet1!B27:B35" },
            { "dataRange": "Sheet1!C27:C35" }
          ],
          "legendPosition": "top",
          "labelRange": "Sheet1!A27:A35",
          "title": {},
          "stacked": false,
          "humanize": true
        }
      },
      "items": [
        {
          "type": "chart",
          "chartId": "1",
          "carouselTitle": { "text": "Line" }
        },
        {
          "type": "chart",
          "chartId": "2",
          "carouselTitle": { "text": "Bar" }
        }
      ]
    }
  }
]
```

### Notes

- Carousel figures are stored in the `figures` array of a sheet, similar to chart figures.
- The `items` array can contain multiple charts and/or data views.
- Each chart item references a chart by its `chartId`, which must exist in `chartDefinitions`.
- The optional `carouselTitle` allows customizing the title for each chart within the carousel.
- Carousel IDs must be unique within the sheet.
- See the full structure in demo/data.js for advanced usage.
