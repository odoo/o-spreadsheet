# o-spreadsheet Review Checklist

## Correctness

- [ ] No logic errors — off-by-one errors, incorrect conditionals, etc.
- [ ] Commands handled in `handle()` produce correct state transitions
- [ ] Undo/redo works — state changes go through `this.history.update()` in CorePlugins
- [ ] Import/export roundtrips — `import()` and `export()` are updated for new/changed fields
- [ ] An upgrade step is added for any breaking change to the persisted state shape

## Bugs

- [ ] Array index bounds checked
- [ ] No accidental mutation of shared objects

## Translations

- [ ] User-facing strings are wrapped in `_t()` for translation in js files
- [ ] User-facing strings in XML templates used as props use `.translate` directive (e.g. `<Section title.translate="Save"/>`)
- [ ] User facing strings in text content do not need to be translated (`<div>Loading...</div>`)
- [ ] Only static strings in `_t()`, no dynamic variables (e.g. `_t(dynamicVar)` is not allowed)
- [ ] Strings with multiple interpolations use named placeholders (e.g. `_t("Hello %(name)s", {name: userName})`)
- [ ] Strings should have enough context to be translatable — avoid concatenating multiple strings together that would be separate in other languages.

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
- [ ] No test-only code in production files
- [ ] Tests are deterministic (no Date.now(), no Math.random() without seed)
- [ ] Rules of the /o-spreadsheet-testing skill are followed

## Maintainability

- [ ] Code is clear and easy to understand
- [ ] Favor simplicity over cleverness
- [ ] Simple code is good code, even if it means bending the rules a bit.
- [ ] Types are precise — no `any` without justification
- [ ] Functions and variables have clear, descriptive names
- [ ] No magic numbers — use named constants
- [ ] No dead code or commented-out blocks
- [ ] Complex logic has explanatory comments
- [ ] Consistent with existing codebase patterns and naming conventions
- [ ] No code that will be hard to change safely in the future
- [ ] Double check persisted state (commands, exported data). It should be easy and future-proof.
