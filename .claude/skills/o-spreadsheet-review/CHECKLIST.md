# o-spreadsheet Review Checklist

Each `##` section maps to one review agent. The early sections are repo-specific traps that a
generic reviewer cannot know; the later ones are ordinary craft. Report both — a nit is cheap to
skip and cheap to fix, so do not suppress one for being small.

## Correctness

- `handle()` produces the correct state transition; invalid input is rejected in `allowDispatch`,
  not swallowed in `handle`.
- Off-by-one and bounds on headers, zones, and ranges — especially at sheet edges and on empty zones.
- No accidental mutation of shared objects. A getter that returns an internal array or object hands
  the caller a live reference; callers mutate it eventually.
- New `allowDispatch` refusals return a `CommandResult` that the UI actually handles.

## Model integrity

- **Undo/redo** — every `CorePlugin` state mutation goes through `this.history.update(...)`.
  Direct assignment to plugin state is invisible to the history and silently breaks undo.
- **Collaborative** — a new `CoreCommand` needs an inverse in
  `src/registries/inverse_command_registry.ts` and transformations in `src/collaborative/ot/`
  wherever it can race another command. Missing transforms diverge clients without any error.
- **Ranges** — core plugins store `Range` objects, never `A1` strings, and implement `adaptRanges`
  (`src/plugins/core_plugin.ts`) so references survive row/column insert and delete. UI layers
  convert to strings only for display.
- **Duplicate sheet** — `DUPLICATE_SHEET` must deep-copy. Any structure shared by reference between
  the original and the copy is a data-corruption bug.
- **Persistence** — `import()`/`export()` updated for every new or changed persisted field, and a
  migration step added in `src/migrations/migration_steps.ts` for any change to the persisted shape.
- **XLSX** — `src/xlsx/` updated when new data should survive an export, and the roundtrip still works.
- **Future-proofing** — the persisted shape and the command payload are the two things that are
  expensive to change later.

## Architecture

- Right base class and folder: `CorePlugin` → `core/`, `EvaluationPlugin` → `evaluation/`,
  `UIPlugin` → `ui_stateful/` (UI state) or `ui_feature/` (features expressible as command sequences).
- Getter scope respected: `CoreGetters` ⊂ `EvaluationGetters` ⊂ `RenderingGetters` ⊂ `Getters`.
  A core plugin reaching for an evaluation getter is a layering break.
- Command scope: a `CorePlugin` handles only `CoreCommand`; an `EvaluationPlugin` only
  `EvaluationCommand`.
- Evaluation commands skip `allowDispatch`; an `EvaluationPlugin` may dispatch those and nothing
  else; no non-evaluation command may be dispatched while a top-level evaluation command is handled.
- `drawLayer` comes from `UIPlugin` or a `SpreadsheetStore` — never from an `EvaluationPlugin`.
- No business logic in components — delegate to plugins or stores.
- UI state that is not document data belongs in `src/stores/`, not in a plugin.
- Extension points go through `src/registries/`, not a hardcoded switch.

## Performance

- No O(n²) or worse in rendering, evaluation, or large-range operations. "Large" here is a
  million-cell sheet, not a test fixture.
- No per-cell allocation inside hot loops — hoist the object out.
- The evaluation dependency graph is not invalidated more broadly than the change requires.
- Uncontrolled CoreCommands explosions: features that generate a lot of core commands per user action (like copy/paste and autofill) should either have limits or be squished

## Translations

- User-facing strings in JS wrapped in `_t()`.
- Strings passed as props in XML use the `.translate` directive
  (`<Section title.translate="Save"/>`). Plain text content does not need it (`<div>Loading...</div>`).
- Only static strings in `_t()` — never `_t(someVariable)`.
- Multiple interpolations use named placeholders: `_t("Hello %(name)s", { name: userName })`.
- Enough context to be translatable — no concatenating fragments that other languages order
  differently.

## Tests

- New behavior tested, changed behavior updated, **in the same commit**.
- Undo/redo tested for every state-changing command.
- A new `CoreCommand` has a concurrent-dispatch test covering its transformation.
- XLSX roundtrip tested when the export changed.
- Edge cases: empty input, boundary values, error states.
- Deterministic — no bare `Date.now()` or unseeded `Math.random()`.
- No test-only code in production files.
- Follows the conventions in `.claude/skills/o-spreadsheet-testing/SKILL.md` (notably: no `beforeEach`).

## Security

- No XSS from unsanitized input — anything reaching `innerHTML`, a URL, or a rendered link.
- No `new Function()` or `eval` with user-controlled input.
- Formula and cell content are user input: treat them as untrusted wherever they leave the model.

## Maintainability

- Code is clear and easy to understand; favour simplicity over cleverness. Simple code is good
  code, even if it means bending a rule.
- Types are precise — no `any` without a justification.
- Functions and variables have clear, descriptive names.
- No magic numbers — use named constants.
- No dead code or commented-out blocks.
- Complex logic carries an explanatory comment.
- Consistent with existing codebase patterns and naming conventions.
- Nothing that will be hard to change safely later.

## Docs

- Commands documented when added, changed, or removed; docs rebuilt (`npm run doc`).
- Breaking changes called out explicitly.
