# Review: `squisher.ts` / `unsquisher.ts`

Scope: `src/plugins/core/squisher.ts` and `src/plugins/core/unsquisher.ts`, whole files at `a91d76d57`.
There is no branch diff (`master` and `stable/master` point to the same commit).

Both export (`Model.exportData`) and collab (`session.ts:451`) unsquish the squished output and fall
back to unsquished data when it does not match, so most squishing bugs only cost compression. The
clipboard has no such check, and the first blocker below gets past the collab check, so those two
cause real wrong content.

## Findings

### Blockers

#### `src/plugins/core/unsquisher.ts:261` — unsquishing mutates its input

FIRST_OFFSET keeps a reference to the caller's offset object (`this.previousOffset = currentOffset`),
and COMBINE_OFFSET (281–283) then overwrites its `N`/`S`/`R`.

- **Collab:** the check at `session.ts:451` unsquishes the same commands that are then sent. When alice
  pastes `=B1,=B2,=B3,=B5,=B7`, bob receives `=B1,=B3,=B5,=B7,=B9`.
- **Import:** `new Model(data)` mutates `data`, so loading the same data a second time gives wrong
  formulas.
- **Clipboard:** `lastSquishedMap` is unsquished on every paste, so a second paste of the same copy is
  wrong.

Fix: `this.previousOffset = { ...currentOffset }`.

Tests:

- `tests/collaborative/collaborative_session_squish.test.ts` › "unsquisher.ts:261 — two merged offset groups with different offsets reach other clients intact"
- `tests/model/squish.test.ts` › "unsquisher.ts:261 — importing squished data does not mutate it"
- `tests/clipboard/clipboard_plugin.test.ts` › "unsquisher.ts:261 — pasting the same copy twice gives the same formulas"

#### `src/plugins/core/squisher.ts:400` — a literal `"="` string collides with `NO_CHANGE`

A string literal that changes to exactly `"="` is written as `"="`, which the unsquisher reads as
"unchanged" and replaces with the previous string. Paste gives `=CONCAT(B13,"x")` instead of
`=CONCAT(B13,"=")`. On export, the whole workbook falls back to `isNotSquishable`.

Fix: escape the value, or do not squish that formula when `str === NO_CHANGE` (call `resetBaseTo` and
return the full formula string).

Tests:

- `tests/model/squish.test.ts` › 'squisher.ts:400 — a string literal changing to "=" is not confused with the no-change marker'
- `tests/clipboard/clipboard_plugin.test.ts` › 'squisher.ts:400 — pasting a formula whose string literal changes to "=" keeps that literal'

### Warnings

#### `src/plugins/core/squisher.ts:137` — non-squishable formula does not reset the number chain

The non-squishable branch calls only `resetBaseFormula()`, so `baseNumber` stays set. `1, =NOSQUISH(), 2, 3`
exports `"A3:A4": {N:"+1"}`, which unsquishes as two `=NOSQUISH()`. Export and collab catch it and
stop squishing. The clipboard may be affected too, but only once something registers a non-squishable
function (the core registry is empty). _Plausible for the clipboard._

Fix: also call `this.resetBaseNumber()` in that branch.

Test: `tests/model/squish.test.ts` › "squisher.ts:137 — a non-squishable formula breaks the chain of consecutive numbers"

#### `src/plugins/core/unsquisher.ts:313` — received revisions use the receiver's locale

`parseSquishableLiteral` and OFFSET_NUMBER's `formatValue` use `getters.getLocale()` of the receiving
client. If bob switches to fr_FR while alice pastes dates in the same concurrent round, bob ends up with
different values (46055 instead of 46025).

Fix: put the sender's locale in the squished message, or unsquish after the pending local revisions are
undone.

Test: `tests/collaborative/collaborative_session_squish.test.ts` › "unsquisher.ts:313 — squished literals are unsquished with the sender's locale on concurrent locale change"

#### `src/plugins/core/squisher.ts:133` — registry scan per formula cell

`NonSquishableFunctionRegistry.getAll()` builds a new array, and `usesSymbol` runs a collator compare
for every registered name, on every formula cell. Fix: build an upper-cased `Set` once per `Squisher`.

#### `src/plugins/core/unsquisher.ts:86` — repeated serialisation for NEW_FORMULA

`toFormulaString` runs again for every target position of a range key, although the result is
identical for all of them. A 100k-row `targetRange` means 100k serialisations. Fix: compute it once per
command, or reuse `current`.

#### `src/plugins/core/unsquisher.ts:330` — every literal is parsed twice at import

`parseSquishableLiteral` runs `createLiteralCell`, including format detection, on every non-formula
string, and `importCell` then parses the same content again. Fix: return early when the content has no
digit, and run format detection only once the value is known to be an integer.

### Nits

- `squisher.ts:156` — A run of identical formulas re-serialises each cell. Cache the base formula's string in `resetBaseTo`.
- `squisher.ts:227` — `toCartesian` runs about twice per key in `squishSheet`. Parse the positions once.
- `squisher.ts:126` — The doc says numbers can come out as `-N` or the full number, but the code only emits `"+" + diff` (e.g. `+-5`). Line 24 also leaves out `-Ck`/`-Rk`. Document the real format.
- `squisher.ts:65` — `buildResult` returns `Partial<SquishedFormula>` although every field is already optional, and `referencePattern` is typed `| null | undefined` though it never holds either. Return `SquishedFormula` and assign `res.R` directly.
- `squisher.ts:200` — The comment opens with "Otherwise," but there is no earlier sentence. Reword it.
- `squisher.ts:214` — The `squishSheet` doc doesn't explain the fallback at 250–259, where a lone number cell is written back as its raw content. Add a sentence.
- `unsquisher.ts:26` — `alreadyAppliedNumberOffset` holds absolute values, unlike the squisher field of the same name, which holds offsets. Rename it, e.g. `currentNumbers`.
- `unsquisher.ts:238` — The generic `<T>` on `applyStrategy` is never used. Remove it.
- `unsquisher.ts:259` — FIRST_OFFSET and COMBINE_OFFSET repeat the same loop and recompile fallback. Move it into one helper.
- `unsquisher.ts:307` — The error message renders as "No undefined provided". Name what is missing.
- `unsquisher.ts:348` — `typeof squishedFormula === "object"` is always true, and `&& this.previousFormula` (368) repeats the same guard. Use one early throw.
- `unsquisher.ts:384` — The R and C branches are copies of each other, one using spread and the other `Object.assign`. Merge them.

## Not covered by a test

- `squisher.ts:133`, `:156`, `:227`, `unsquisher.ts:86`, `:330`: performance, so they need a benchmark rather than an assertion.
- All the nits: docs, typing, naming and duplication, with nothing observable to assert.

## Test status

7 new tests fail on purpose until the fixes land. The other 377 tests in the three touched files pass,
and `tsc -p tests/tsconfig.json` is clean.
