# Cells

`sheet.cells` maps cell positions to their content. Plain content can be written as is:

```js
"cells": {
  "A1": "Price",            // text
  "A2": "42",               // number
  "A3": "=SUM(A1:A2)",      // formula
}
```

`model.exportData()` writes a compressed ("squished") form of this map. Import accepts both forms. If the
squished export would not import back exactly as the sheet is, the export falls back to the plain form
and sets `isNotSquishable: true` on the workbook data.

## Reading squished cells

### 1. Range keys

Consecutive cells of the same column with the same value (text, number, formula or delta object) are merged
under one vertical range key (`"A2:A5"`). Every cell of the range gets the value. A string value is copied
**as is**: references are **not** shifted.

```js
"A2:A4": "=SUM($B$1:$B$9)"   // A2, A3 and A4 all contain exactly =SUM($B$1:$B$9)
"C1:C3": "N/A"               // C1, C2 and C3 all contain "N/A"
"D1:D2": "42"                // D1 and D2 both contain 42
```

### 2. Delta objects

A value can be an object instead of a string. It describes a formula as a change from the **previous formula
cell**. The previous formula is the last one written before it, in column-major order (A1, A2, …, A9, B1, B2, …).

- A text or number cell (any non-formula string) ends the chain. The next formula is always written in full.
- Empty cells and column changes do not end the chain.
- A delta is only used when both formulas have the same shape (same functions and operators, with only the
  numbers, strings and references changed). Otherwise the full formula is written.

The object has up to three keys. Each key lists one entry per literal, in the order the literals appear in
the formula text:

| Key | Holds                        | Entry values                                                                                                                                   |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `N` | numbers, joined with `\|`    | `=` unchanged, `+d` add `d` (`+1`, `+-5`, `+0.5`)                                                                                              |
| `S` | strings, as an array         | `=` unchanged, or the new string                                                                                                               |
| `R` | references, joined with `\|` | `=` unchanged, `+Rk`/`-Rk` move k rows, `+Ck`/`-Ck` move k columns, or the new reference in full (`K42`, `$B$1`, `B2:B9`, `Sheet2!A1`, `#REF`) |

`R` is an array instead of a joined string when a sheet name contains `|`.

`=` and the offsets are applied to the value that literal had in the **previous cell**, which can itself be the
result of a delta. A missing key means that kind of literal is unchanged.

`$` signs do not matter for offsets: `+R1` on `$B$1` gives `$B$2`. Only single cells are moved with offsets.
Multi-cell ranges, full columns and rows (`B:B`, `B1:B`), sheet changes, and `$` changes are always written in full.

A delta on a range key applies once per cell, top to bottom. Each cell builds on the cell above it.

### 3. Rebuilding the cells

Sort the keys in column-major order: by column index (`A` < `Z` < `AA`), then by row, using the first cell of
range keys. Exports are already written in this order, and the importer sorts the keys itself, so a hand-written
JSON can list them in any order. Then walk the sorted keys:

1. A string starting with `=`: it is the formula of the cell(s). It becomes the current formula.
2. Another string: it is the content of the cell(s). Forget the current formula.
3. An object: for each cell of the key, apply the delta to the current formula. The result is the content of
   that cell and becomes the current formula.

### 4. Exclude formulas from squisher

Formulas using a function registered in `NonSquishableFunctionRegistry` are always written in full and end the chain.

## Examples

References moving down a column:

```js
// squished
"A1": "Total",
"A2": "=B2*$C$1",
"A3:A5": { "R": "+R1|=" }
// plain
"A1": "Total",
"A2": "=B2*$C$1",
"A3": "=B3*$C$1",
"A4": "=B4*$C$1",
"A5": "=B5*$C$1"
```

Numbers and strings:

```js
// squished
"D2": "=COUNT(10,1,\"company_id\")",
"D3:D4": { "N": "=|+1", "S": ["="] },
"D5": { "N": "=|+-2", "S": ["id"] }
// plain
"D2": "=COUNT(10,1,\"company_id\")",
"D3": "=COUNT(10,2,\"company_id\")",
"D4": "=COUNT(10,3,\"company_id\")",
"D5": "=COUNT(10,1,\"id\")"
```

The chain continues into the next column (B1 is empty), and a full reference replaces the previous one:

```js
// squished
"A2": "=SUM($B1,$D$1,$B1)",
"A3:A4": { "R": "+R1|=|+R1" },
"B2": { "R": "$C1|=|-R2" },
"B3:B4": { "R": "+R1|=|+R1" }
// plain
"A2": "=SUM($B1,$D$1,$B1)",
"A3": "=SUM($B2,$D$1,$B2)",
"A4": "=SUM($B3,$D$1,$B3)",
"B2": "=SUM($C1,$D$1,$B1)",     // $B3 moved up 2 rows -> $B1
"B3": "=SUM($C2,$D$1,$B2)",
"B4": "=SUM($C3,$D$1,$B3)"
```

A formula that differs from the pattern, then the pattern again:

```js
// squished
"F42": "=E42*K$3-D42",
"F43:F44": { "R": "+R1|=|+R1" },
"F45": { "R": "+R1|K42|N45" },
"F46": { "R": "+R1|K$3|D46" }
// plain
"F42": "=E42*K$3-D42",
"F43": "=E43*K$3-D43",
"F44": "=E44*K$3-D44",
"F45": "=E45*K42-N45",
"F46": "=E46*K$3-D46"
```
