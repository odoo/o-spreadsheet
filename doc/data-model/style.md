# CellPlugin: Style Data Structure

The `styles` property in o-spreadsheet defines reusable cell styles and maps them to cells or ranges. Styles are used to control the appearance of cell content, such as font, color, and text decoration.

---

## Structure

There are two main usages of `styles`:

1. **Style Definitions (top-level `styles` object):**

   - Each key is a style ID (number or string).
   - Each value is a style object describing formatting options.

2. **Style Mapping (per-sheet `styles` object):**
   - Each key is a cell or range address (e.g., `"A1"`, `"B2:C4"`).
   - Each value is a style ID referencing a style definition.

---

## Style Object Properties

A style object can include the following properties:

- `bold`: boolean — Bold text
- `italic`: boolean — Italic text
- `underline`: boolean — Underlined text
- `strikethrough`: boolean — Strikethrough text
- `fontSize`: number — Font size in points
- `fontName`: string — Font family name
- `textColor`: string — Text color (hex code, e.g., `"#000000"`)
- `fillColor`: string — Cell background color (hex code)

Example style definition:

```json
{
  "1": {
    "bold": true,
    "textColor": "#674EA7",
    "fontSize": 18
  },
  "2": {
    "fillColor": "#FFF2CC"
  },
  "3": {
    "italic": true
  }
}
```

---

## Example Usage

Top-level style definitions:

```json
"styles": {
  "1": { "bold": true, "textColor": "#674EA7", "fontSize": 18 },
  "2": { "fillColor": "#FFF2CC" },
  "3": { "italic": true }
}
```

Per-sheet style mapping:

```json
{
  "sheets": [
    {
      "styles": {
        "A1": 1, // Cell A1 uses style 1
        "B2:C4": 2, // Range B2:C4 uses style 2
        "D5": 3 // Cell D5 uses style 3
      }
    }
  ]
}
```

---

## Notes

- Style IDs must match between the per-sheet mapping and the top-level definitions.
- You can define as many styles as needed and reuse them across multiple cells or ranges.
- Only specified properties are applied; others use default formatting.
