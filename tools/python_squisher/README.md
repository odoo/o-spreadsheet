# o_spreadsheet_squisher

Python port of the export squisher (`src/plugins/core/squisher.ts`). It compresses the `cells` of a
non-squished workbook JSON the same way `model.exportData()` does. No dependencies, Python >= 3.10.

```python
from o_spreadsheet_squisher import FunctionRegistry, squish_workbook_data

functions = FunctionRegistry.builtin()
# functions registered at runtime outside o-spreadsheet: (optional, repeating) for each argument
functions.add("ODOO.PIVOT", [(False, False), (False, True)])

squished = squish_workbook_data(data, functions=functions, non_squishable_functions=["ODOO.PIVOT"])
```

The port includes the formula tokenizer, the parser and the compiler checks, because squishing
depends on the normalized formula, its literals and its references, and on whether o-spreadsheet
considers the formula a bad expression. Formulas that use an unregistered function count as bad
expressions and are written in full. That is safe, just less compact.

Like `Model.exportData`, `squish_workbook_data` unsquishes the result again (with a port of
`unsquisher.ts`). If that doesn't give back the original cells, it returns the cells unsquished and
sets `isNotSquishable`.

## Differences with the TS version

Each of these only makes Python write a full formula or number where TS writes an offset. TS
reads both forms.

- Number literals whose offset would not be read back to the same float (`0.1` steps…) start a
  new base. In TS, such offsets fail the export verification, and the whole workbook is then
  exported unsquished.
- A string literal changed to `"="` starts a new base (TS writes `"="`, which means "unchanged").
- A non-squishable formula also breaks the chain of integer literals.
- Only canonical integers (`"12"`, not `"007"` or `"1e+21"` in a text-formatted cell) are squished
  as numbers.

## Tests

```bash
# 1. generate builtin_functions.json and tests/fixtures.json from the TS code (repo root)
npx jest --roots tools/python_squisher/js --testRegex 'tools/python_squisher/js/.*\.test\.ts$'
# 2. python tests: unit tests + exact comparison with the TS squisher output
cd tools/python_squisher && WRITE_PYTHON_OUTPUT=1 python3 -m unittest
# 3. check that o-spreadsheet loads the python output back to the original cells (repo root)
npx jest --roots tools/python_squisher/js --testRegex 'tools/python_squisher/js/.*\.test\.ts$'
```

Re-run step 1 when built-in functions change.
