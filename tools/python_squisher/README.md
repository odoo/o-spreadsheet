# o_spreadsheet_squisher

Python port of the export squisher (`src/plugins/core/squisher.ts`). It compresses the `cells` of a
non-squished workbook JSON so that o-spreadsheet loads it back to the same cells. No dependencies,
Python >= 3.10.

```python
from o_spreadsheet_squisher import squish_workbook_data

squished = squish_workbook_data(data, non_squishable_functions=["ODOO.PIVOT"])
```

From the command line (`-` reads the standard input), the result is printed on the standard output:

```bash
cd tools/python_squisher
python3 -m o_spreadsheet_squisher data.json --non-squishable ODOO.PIVOT ODOO.LIST > squished.json
python3 -m o_spreadsheet_squisher data.json --indent 2
```

## Assumptions

Nothing is verified: correctness is the responsibility of the input and of the TS implementation.

- **Formulas must be valid for o-spreadsheet** (known functions, right number of arguments, no
  syntax error). o-spreadsheet keeps no literals nor references for an invalid formula, so two
  consecutive invalid formulas of the same shape (`=NOPE(B1)`, `=NOPE(B2)`) would be squished into
  an offset that o-spreadsheet reads back as a copy of the first one.
- The tokenizer is an exact port of o-spreadsheet's (default locale): the unsquisher applies the
  offsets by position on the literals and references it finds itself.

Formulas and references written in full are written as in the input. Only single cells are
squished as offsets (`+R1`, `-C2`): ranges, full columns/rows and `#REF` are compared by their text.

## Differences with the TS version

Each of these only makes Python write a full formula or number where TS writes an offset. TS reads
both forms.

- Number literals whose offset would not be read back to the same float (`0.1` steps…) start a
  new base.
- A string literal changed to `"="` starts a new base (TS writes `"="`, which means "unchanged").
- A non-squishable formula also breaks the chain of integer literals.
- Formulas containing special whitespace (non-breaking space, tab…) are never squished: TS picks
  its space tokenizer with a stateful `/g` regex `test()`, so their tokens are not deterministic.
- Only canonical integers (`"12"`, not `"007"` or `"1e+21"` in a text-formatted cell) are squished
  as numbers.
- References are compared by sheet name as written, and ranges by text: `sheet1!A1` after
  `Sheet1!A1`, or `A1:A1`, are written in full where TS may write an offset.

## Tests

```bash
# 1. generate tests/fixtures.json from the TS code (repo root)
npx jest --roots tools/python_squisher/js --testRegex 'tools/python_squisher/js/.*\.test\.ts$'
# 2. python tests: unit tests + comparison with the TS squisher output
cd tools/python_squisher && WRITE_PYTHON_OUTPUT=1 python3 -m unittest
# 3. check that o-spreadsheet loads the python output back to the original cells (repo root)
npx jest --roots tools/python_squisher/js --testRegex 'tools/python_squisher/js/.*\.test\.ts$'
```
