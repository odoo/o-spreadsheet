# `automaticEvaluation` model config flag

A `Model` can now be constructed without evaluating a single formula:

```ts
const model = new Model(data, { automaticEvaluation: false });
```

Optional, defaults to `true`, so nothing changes for existing callers.

Intended use: opening a spreadsheet whose evaluation is too heavy, to investigate and fix it.
The workflow it enables:

1. Open with the flag - no evaluation, no hang.
2. Read the sheet: literal cells are displayed, and `SET_FORMULA_VISIBILITY` (Ctrl+`) shows the
   formulas without evaluating them.
3. Run the perf profile side panel, which dispatches `EVALUATE_CELLS { profiling: true }` and reads
   `getPerfProfile()` for per-function and per-range timings.
4. Fix the offending formulas. Editing a cell only evaluates that cell, so you are not re-triggering
   the heavy pass on every change.

## What it does

`CellEvaluationPlugin` starts with its `automaticEvaluation` field already `false`. The startup
evaluation was never triggered by `START` itself — it happened in the `finalize()` that follows,
because `shouldRebuildDependenciesGraph` starts at `true`. With the flag on, `finalize()` early-returns
via `shouldPerformEvaluation()`, so `buildDependencyGraph()` and `evaluateAllCells()` never run.

The model then behaves exactly like today's "manual calculation" mode: `isAutomaticEvaluationEnabled()`
returns `false`, the top-bar "Manual calculation" banner shows, and F9 works.

## The change

| File                                                                   | Change                                                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/model.ts:37-46`                                             | New optional `automaticEvaluation?: boolean` on `ModelConfig`, with a doc comment covering the consequences                      |
| `src/plugins/evaluation_plugin.ts:19`                                  | Added to `EvaluationPluginConfig`. Optional, so no other plugin or test double needed touching                                   |
| `src/model.ts:453`                                                     | Forwarded in `getEvaluationPluginConfig()`                                                                                       |
| `src/plugins/evaluation/cell_evaluation/cell_evaluation_plugin.ts:174` | `this.automaticEvaluation = config.automaticEvaluation ?? true` — this is the flag itself                                        |
| `src/plugins/evaluation/cell_evaluation/cell_evaluation_plugin.ts`     | `UPDATE_CELL` now tracks the edited position when no full evaluation is coming, plus the `LITERAL FALLBACK` section (both below) |
| `src/plugins/evaluation/cell_evaluation/evaluator.ts:214-232`          | `initializePositionSets()`, called from `evaluateCellsWithoutCascade` (see below)                                                |
| `src/plugins/evaluation/cell_evaluation/position_set.ts:46-49`         | Defensive `?.` in `has` (see below)                                                                                              |
| `doc/integrating/integration.md`                                       | Config bullet in the public model-creation docs                                                                                  |
| `tests/evaluation/evaluation.test.ts`                                  | 13 new cases                                                                                                                     |

The default is applied in the plugin constructor rather than `Model.setupConfig`, matching how the
other optional config fields work (`defaultCurrency`, `colorScheme`) and keeping the default next to
the field it initializes.

### Why this name

`automaticEvaluation` maps 1:1 onto the existing vocabulary (`SET_AUTOMATIC_EVALUATION`,
`isAutomaticEvaluationEnabled()`, the private field). A name like `evaluateOnStart` would have been a
lie about the observable state: the flag is not a one-shot startup switch — the getter keeps returning
`false` afterwards, and `SET_AUTOMATIC_EVALUATION {enabled: false}` is then rejected as a no-op.

## Getter behaviour

- Formula cells read as the frozen `EMPTY_CELL`. `getEvaluatedCells()` /
  `getEvaluatedCellsPositions()` report that nothing was evaluated, because nothing was.
- Literal cells are displayed, via the **LITERAL FALLBACK** (see below). Without it the grid renders
  completely blank, text and numbers included: `createZoneBox` bails at
  `src/stores/grid_renderer_store.ts:790` before setting any content when the evaluated cell is
  empty, and `getCellText` (`src/plugins/ui_feature/ui_sheet.ts:143-165`) formats
  `evaluatedCell.value`. There is no raw-content fallback anywhere in the render path.
- Everything derived degrades silently rather than crashing: conditional formats, filters, charts,
  pivots, the Sum/Average status bar, autofill boundary detection, sort header detection. This is
  already the state of a brand-new empty `Model`, which is why the codebase tolerates it.
- `EVALUATE_CELLS` (F9) and `SET_AUTOMATIC_EVALUATION {enabled: true}` both force a full graph rebuild
  and evaluate the whole workbook correctly.
- `exportXLSX()` self-heals — it dispatches `EVALUATE_CELLS` first (`src/model.ts:756`).
  `exportData()` only reads core plugins, so it is unaffected.

## The literal fallback — how to remove it

Tagged `LITERAL FALLBACK` in `cell_evaluation_plugin.ts` (the section comment, the
`getLiteralFallback` method, the `literalFallback` field and its assignment in the constructor).
Grep for `LITERAL FALLBACK` and delete the section to get the fully blank grid back.

It evaluates literal cells — and only those — on the fly when read: no dependency graph, no formula
execution, no cascade. It is enabled only when the model was created with `automaticEvaluation: false`.
It is a display fallback: the result is not stored, so the cell is re-evaluated on every read and the
"nothing was evaluated" getters stay honest.

## Editing a cell behaves like manual evaluation mode

Modifying a cell evaluates **that cell only**, with no cascade to its dependents — the same semantics
as the top-bar manual-calculation toggle. A modified formula is computed against cells that were
never evaluated (they get evaluated on the fly only as far as the formula needs them), and array
formulas spread normally.

Two obstacles had to be removed to get there, because the flag makes "the dependency graph was never
built" a reachable state that the evaluator never had to handle before:

1. `handle()`'s `UPDATE_CELL` case bailed out whenever `shouldRebuildDependenciesGraph` was `true`,
   which it now stays forever while evaluation is off — so `positionsToUpdate` never filled. The
   guard is now `shouldRebuildDependenciesGraph && shouldPerformEvaluation()`: it still skips
   tracking when a full evaluation is coming anyway, but tracks the edit when nothing else will.
   `updateDependencies` is skipped while the graph is pending, since building it would defeat the
   purpose of the flag — any later real evaluation rebuilds it from scratch regardless.
2. `blockedArrayFormulas` is a `PositionSet({})` with no sheets until `buildDependencyGraph()` sizes
   it, and `checkCollision` (`evaluator.ts:586,592`) **mutates** it. `Evaluator.initializePositionSets()`
   now sizes it on demand from `evaluateCellsWithoutCascade`. Without it, editing a cell into an array
   formula yields `#ERROR` — the `TypeError` is swallowed by `computeCell`'s catch and turned into a
   generic error cell. Verified by removing the call and watching the test fail that way.

## One thing to know: the blank state is not fully sticky

`SubtotalEvaluationPlugin` (`src/plugins/evaluation/subtotal_evaluation.ts:7`) dispatches
`EVALUATE_CELLS` for every command in `invalidSubtotalFormulasCommands` — hide/unhide columns-rows,
group/fold headers, `UPDATE_TABLE`, `UPDATE_FILTER`. In manual mode that forces a **full** rebuild and
evaluation, so hiding a column un-blanks the whole grid. It does not fire at `START`, so startup is
unaffected. This is pre-existing manual-mode behaviour and was left untouched; gating it on
`automaticEvaluation` is a one-line change if you want it.

## The latent bug found along the way

`PositionSet.has` did `this.sheets[position.sheetId].getValue(position)` with no guard
(`position_set.ts:46`), while `blockedArrayFormulas` is built as `new PositionSet({})`
(`evaluator.ts:66`) and only gets its sheets from `buildDependencyGraph()`. So the public getter
`isArrayFormulaSpillBlocked` **throws** `TypeError: Cannot read properties of undefined (reading
'getValue')` on a never-evaluated model.

It was unreachable before only because its single caller bails on the undefined spread zone first
(`src/stores/array_formula_highlight.ts:17-22`). This flag makes "never evaluated" a supported public
state, so the lookup is now tolerant — a sheet absent from the set simply does not contain the
position, which changes no existing semantics. Confirmed load-bearing by reverting the guard and
watching the test fail with that exact `TypeError`.

## Tests

13 new cases in `describe("Automatic evaluation disabled at model creation")`, using the established
`new Model(other.exportData(), config)` pattern since `createModelFromGrid` takes no config:

1. No formula is evaluated at creation (`getEvaluatedCells()` is `[]`)
2. Formula cells render blank, literal ones are displayed, formula content still readable
3. Formulas are displayed with the formula visibility on
4. F9 evaluates the whole workbook
5. Enabling automatic evaluation evaluates everything and restores the cascade
6. Re-disabling at boot is cancelled with `NoChangeInAutomaticEvaluation`
7. A modified cell is evaluated, without cascading to its dependents
8. A modified formula is evaluated against cells that were never evaluated
9. A modified cell is evaluated without evaluating the rest of the sheet
10. A modified cell spreading an array formula is evaluated — regression net for the `checkCollision` mutation
11. After a first evaluation, edits behave like manual mode (no cascade)
12. Array formula getters do not crash before the first evaluation — regression net for the latent bug above
13. The model is evaluated by default (implicit and explicit `true`)

## Status

```
npm test
Test Suites: 296 passed, 296 total
Tests:       1 skipped, 15895 passed, 15896 total
Snapshots:   216 passed, 216 total
```

Type-check clean, prettier clean.

Not done: I did not run the change in the live app. If you want that, `npm run dev` and build a model
with `{ automaticEvaluation: false }` — expect a blank grid, the "Manual calculation" banner, and the
sheet filling in on F9.
