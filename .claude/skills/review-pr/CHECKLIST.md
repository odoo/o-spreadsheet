# o-spreadsheet Review Checklist

## Correctness

- [ ] Commands handled in `handle()` produce correct state transitions
- [ ] Undo/redo works — state changes go through `this.history.update()` in CorePlugins
- [ ] Import/export roundtrips — `import()` and `export()` are updated for new/changed fields
- [ ] An upgrade step is added for any breaking change to the persisted state shape
- [ ] No logic errors — off-by-one errors, incorrect conditionals, etc.

## Bugs

- [ ] No null/undefined access on optional data (cells that don't exist, deleted sheets)
- [ ] Array index bounds checked (col/row within sheet dimensions)
- [ ] No accidental mutation of shared objects

## Performance

- [ ] No O(n^2) or worse in hot paths (rendering, evaluation, large range operations)
- [ ] No redundant object creation in loops (allocate outside, reuse)
- [ ] Avoid useless memory allocations in hot code paths

## Security

- [ ] No XSS vulnerabilities from unsanitized input
- [ ] No new Function() with user-controlled input

## Architecture

- [ ] Plugin responsibilities are separated — core data in CorePlugin, UI state in UIPlugin
- [ ] No cross-layer violations (UI plugins don't import from components; engine doesn't import from UI)
- [ ] Avoid business logic in components — delegate to plugins/stores

## Tests

- [ ] New behavior has tests; changed behavior has updated tests
- [ ] Undo/redo tested for state-changing commands
- [ ] Edge cases tested: empty input, boundary values, error states
- [ ] Test helpers used (`setCellContent`, `getCellContent`, `getEvaluatedCell`) — not raw dispatch
- [ ] No test-only code in production files
- [ ] Tests are deterministic (no Date.now(), no Math.random() without seed)
- [ ] Tests are not brittle or coupled to implementation details
- [ ] Import/export roundtrip tested for new data fields

## Maintainability

- [ ] Types are precise — no `any` without justification
- [ ] Functions and variables have clear, descriptive names
- [ ] No magic numbers — use named constants
- [ ] No dead code or commented-out blocks
- [ ] Complex logic has explanatory comments
- [ ] Consistent with existing codebase patterns and naming conventions
- [ ] No code that will be hard to change safely in the future
- [ ] Double check persisted state (commands, exported data). It should be easy and future-proof.
