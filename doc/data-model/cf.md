## Conditional Formats

Conditional formats allow for dynamic styling of cells based on their content or other criteria, improving readability and highlighting important data.

The `conditionalFormats` property in each sheet defines rules for applying formatting based on cell values or formulas. It is an array of objects, each representing a conditional formatting rule.

Each rule has the following structure:

```json
{
  "id": string,                // Unique identifier for the rule
  "ranges": [string, ...],     // Array of cell/range addresses (e.g., ["C1:C100"])
  "rule": {
    "type": "CellIsRule"|"ColorScaleRule"|"IconSetRule"|"DataBarRule",

    // The following fields depend on the rule type:
    // For CellIsRule:
    "values": [string, ...],   // Values to compare or cell reference (relative or absolute with $A$1)
    "operator": "beginsWithText"
                | "isBetween"
                | "containsText"
                | "isEmpty"
                | "isNotEmpty"
                | "endsWithText"
                | "isEqual"
                | "isGreaterThan"
                | "isGreaterOrEqualTo"
                | "isLessThan"
                | "isLessOrEqualTo"
                | "isNotBetween"
                | "notContainsText"
                | "isNotEqual",
    "style": {    // Style to apply (e.g., { "fillColor": "#FF9900" }) every property optional
        "bold": boolean,
        "italic": boolean,
        "strikethrough": boolean,
        "underline": boolean,
        "align": "left" | "right" | "center",
        "wrapping": "overflow" | "wrap" | "clip",
        "verticalAlign": "top" | "middle" | "bottom",
        "fillColor": "#ABC"|"#AAAFFF"|"rgb(30, 80, 16)",
        "textColor": "#ABC"|"#AAAFFF"|"rgb(30, 80, 16)",
        "fontSize": number // in pt, not in px!
    }

    // For ColorScaleRule:
    "minimum": { "type":  "value" | "number" | "percentage" | "percentile" | "formula", "color": number },
    "midpoint": { "type": "value" | "number" | "percentage" | "percentile" | "formula", "color": number },
    "maximum": { "type": "value" | "number" | "percentage" | "percentile" | "formula", "color": number }

    // For DataBarRule:
    "color": string,           // Bar color
    "rangeValues": string      // (optional) Range to base the bar on, it should have the same shape #cols and #rows as the range of the CF

    // For IconSetRule:
    "lowerInflectionPoint": { "type": "number" | "percentage" | "percentile" | "formula", "value": string, "operator": "gt" | "ge" },
    "upperInflectionPoint": { "type": "number" | "percentage" | "percentile" | "formula", "value": string, "operator": "gt" | "ge" },
    "icons": {
        "upper": "ARROW_UP" | "ARROW_DOWN" | "ARROW_RIGHT" | "SMILE" | "MEH" | "FROWN" | "GREEN_DOT" | "YELLOW_DOT" | "RED_DOT",
        "middle": "ARROW_UP" | "ARROW_DOWN" | "ARROW_RIGHT" | "SMILE" | "MEH" | "FROWN" | "GREEN_DOT" | "YELLOW_DOT" | "RED_DOT",
        "lower": "ARROW_UP" | "ARROW_DOWN" | "ARROW_RIGHT" | "SMILE" | "MEH" | "FROWN" | "GREEN_DOT" | "YELLOW_DOT" | "RED_DOT"
    }
  }
}
```

Example:

```json
"conditionalFormats": [
  {
    "id": "1",
    "ranges": ["C1:C100"],
    "rule": {
      "type": "CellIsRule",
      "values": ["42"],
      "operator": "Equal",
      "style": {
        "fillColor": "#FF9900"
      }
    }
  },
  {
    "id": "2",
    "ranges": ["G1:G100"],
    "rule": {
      "type": "ColorScaleRule",
      "minimum": { "type": "value", "color": 16777215 },
      "maximum": { "type": "value", "color": 16711680 }
    }
  },
  {
    "id": "3",
    "ranges": ["H23:H33"],
    "rule": {
      "type": "IconSetRule",
      "upperInflectionPoint": { "type": "percentage", "value": "66", "operator": "gt" },
      "lowerInflectionPoint": { "type": "percentage", "value": "33", "operator": "gt" },
      "icons": {
        "upper": "arrowGood",
        "middle": "dotNeutral",
        "lower": "arrowBad"
      }
    }
  },
  {
    "id": "4",
    "ranges": ["B3:B13"],
    "rule": {
      "type": "DataBarRule",
      "color": "#FCE5CD",
      "rangeValues": "A3:A13"
    }
  }
]
```

---

Usage Example:

```json
{
    "sheets": [
        {
            ...,
            "conditionalFormats": [{
                    "id": "1",
                    "ranges": ["C1:C100"],
                    "rule": {
                        ...
                    },
                }
            ],
            ...
        }
    ]
}
```
