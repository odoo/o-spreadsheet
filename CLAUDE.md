# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project

`@odoo/o-spreadsheet` — a standalone web spreadsheet component built on [Owl](https://github.com/odoo/owl). Node `>=22`, TypeScript.

## Common commands

```bash
npm install
npm test # full type-check (tests/tsconfig.json) then jest
npm test -- tests/path/to/file.test.ts # single file
npm test -- -t "test name pattern" # single test by name
npm run build # transpile + bundle esm/iife + xml templates + css → build/
```

Tests use `jest` + `@swc/jest` + `jsdom`. `tests/setup/` contains global setup/teardown and per-test setup.

## Architecture

Two layers: **Model** (headless data + logic) and **UI** (Owl components + canvas grid). See `doc/extending/architecture.md`, `doc/data-model.md`, `doc/add_function.md`.

### Model: CQS via commands, getters, plugins

- `Model` (`src/model.ts`) is the entry point. Mutate via `model.dispatch("CMD_NAME", payload)`; read via `model.getters.someGetter(...)`. All command types are in `src/types/commands.ts`. Commands run through a chain (`allowDispatch` → `beforeHandle` → `handle` → `finalize`) on every registered plugin.
- **Plugins** (`src/plugins/`) own slices of state and expose getters. Three base classes, four categories:
  - `CorePlugin` → `core/` — persistent business data (cells, sheets, ranges, charts, pivots, conditional formats, tables, figures, named ranges…). One plugin per data structure. Participate in import/export.
  - `EvaluationPlugin` → `evaluation/` — derived state computed from core (cell evaluation, computed style, chart runtime, dynamic tables, filter/subtotal evaluation, custom colors…).
  - `UIPlugin` → `ui_stateful/` — UI-only state (selection, clipboard, header positions, figures…).
  - `UIPlugin` → `ui_feature/` — high-level features expressible as lower-level command sequences (sort, format, insert pivot, local history…).
    Registries in `src/plugins/plugin_registries.ts` declare which plugins are loaded. They are `PluginRegistry` instances that check at `add()`/`replace()` time that the plugin extends the expected base class, so a plugin cannot be registered in the wrong category.
- **Getter scopes** (`src/types/getters.ts`): `CoreGetters` ⊂ `EvaluationGetters` ⊂ `RenderingGetters` ⊂ `Getters`. Each plugin only receives the scope of its category — a core plugin cannot read evaluation getters, and an evaluation plugin cannot read UI getters.
- **Command scopes**: a `CorePlugin` only handles `CoreCommand`; an `EvaluationPlugin` only handles `EvaluationCommand` (core commands, `UNDO`/`REDO`, the evaluation commands, `START`, and the short list of local commands impacting derived state — see `evaluationCommandTypes` in `src/types/commands.ts`). `Model.canHandle` filters both `allowDispatch` and `handle`, so UI commands never reach them.
- **Evaluation commands** (`EVALUATE_CELLS`, `EVALUATE_CHARTS`, see `dispatcheableEvaluationCommandTypes`/`isDispatcheableEvaluationCommand` in `src/types/commands.ts`) are a distinct dispatch path: they skip `allowDispatch`, an `EvaluationPlugin` may dispatch them (and nothing else), and no non-evaluation command may be dispatched while a top-level evaluation command is being handled. Both violations throw.
- **Range / cell coordinates** flow through `range.ts` plugin; never store `A1` strings directly in plugin state.
- **History**: `src/history/` provides undo/redo by recording inverse commands; plugins use `this.history.update(...)` to make mutations trackable.
- **Collaborative**: `src/collaborative/` synchronizes commands across clients; `state_observer.ts` and command transforms keep concurrent edits consistent.
- **Migrations**: `src/migrations/` upgrades persisted JSON data between schema versions.
- **Import/Export**: `src/xlsx/` reads and writes XLSX. Core plugins implement `import`/`export` hooks.

### Formula engine

- `src/formulas/` — tokenizer, parser (produces an AST), and `compiler.ts` which lowers the AST to a JS function. Range and reference accessors are injected into the compiled function at evaluation time.
- `src/functions/` — built-in spreadsheet functions split by module (`module_math.ts`, `module_statistical.ts`, `module_lookup.ts`, …).
- `src/plugins/evaluation/cell_evaluation/` — evaluator + `compilation_parameters.ts`. The evaluator walks the dependency graph, calls compiled formulas, and caches results.

### UI

- `src/components/` — Owl components (sidepanels, top bar, bottom bar, composer, popovers, figures, charts wrappers, etc.).
- `src/components/grid/` draws the grid on `<canvas>`. Draw layers come from `UIPlugin.drawLayer` (`ui_stateful/selection`, `ui_stateful/clipboard`, `ui_feature/collaborative`) and from stores extending `SpreadsheetStore`; `EvaluationPlugin` cannot draw. The DOM only hosts overlays, composer, figures, popovers.
- `src/stores/` + `src/store_engine/` — Owl-store-style reactive stores for UI state that doesn't belong in the Model (notifications, sidepanels, hovered link, etc.). Components access them via the store engine, not directly.
- `src/registries/` — extension points (menus, side panels, autofill rules, clipboard handlers, topbar components, cell popovers…). Adding a feature usually means registering in one of these plus a plugin.
- `src/selection_stream/` — keyboard/mouse selection state machine, observed by composer, find-and-replace, etc.

## Conventions

- Commit messages follow the Odoo convention seen in `git log` (`[FIX] area: …`, `[IMP] area: …`, `[REL] x.y.z`).
- Never store coordinates as raw strings; always go through the `range` plugin / `Range` objects so they update on row/col insert/delete.
