## Borders

The `borders` object defines reusable border styles. Each key is a border style ID (string or number), and the value is an object describing the border for each side (top, bottom, left, right). Each side can specify a `style` (e.g., "thin", "medium", "thick", "dashed", "dotted") and a `color` (hex code).

Example:

```js
"borders": {
  "1": { "bottom": { "style": "thin", "color": "#000" } },
  "2": { "top": { "style": "thin", "color": "#000" } },
  "3": {
      "right": { "style": "dotted", "color": "#000" },
      "bottom": { "style": "thick", "color": "#00FF00" },
    }
  // ...
}
```

To apply a border style to a cell or range, reference the border style ID in the `borders` property of a sheet, mapping cell/range addresses to border style IDs.

Usage Expample

```js
{
    "sheets": [
        {
            ...,
            "borders": {
                "A1": 1    // assign the border 1 to A1
                "A2:C4": 3 // assign the border 3 to all cells of A2:C4
            }
            ...
        }
    ]
}
```
