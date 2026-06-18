# Font Awesome → Material Symbols icon migration — report

## Goal

Migrate o-spreadsheet's legacy Font Awesome icons (`class="fa fa-xxx"`) to the new
Odoo UI Icon (`oi`) system backed by **Material Symbols**, using the `data-icon`
attribute — e.g. `class="fa fa-check"` → `class="oi" data-icon="check"`.

## Source of truth

The exact `fa-* → material-symbol` mapping was **not** invented. It was taken from the
authoritative Odoo webclient stylesheet:

```
/workspace/odoo/community/addons/web/static/src/webclient/icons.scss
```

This is the temporary `fa-*` compatibility mapping referenced in the migration tip
(the file that lets `fa-*` classes keep working during the transition). Each value
below is the `icon-content(...)` that Odoo maps the corresponding `fa-*` class to.

## Key architectural decision: fonts / fill

Odoo renders `oi`/`fa` icons with its **own** in-house fonts
(`material_symbols_outlined` + `odoo_ui_icons`), where _filled_ variants are encoded
as a separate `_f` ligature (e.g. `settings_f`) and brand glyphs live in a custom font.

o-spreadsheet is a **standalone** component and this branch instead vendored the public
[`material-symbols`](https://www.npmjs.com/package/material-symbols) npm package
(already added to `package.json` + linked in `demo/index.html`). That package ships the
**variable** font exposing a `FILL` axis. So the one necessary adaptation vs. Odoo:

- **Filled icons** use `font-variation-settings: "FILL" 1` (driven by an `--oi-mi-fill`
  CSS variable + the `oi-filled` class) instead of Odoo's `_f` ligature suffix.
- All non-filled `data-icon` **values are identical** to Odoo's mapping, so the markup
  stays consistent whether rendered standalone or embedded in Odoo.

One value had to deviate because of the npm package version (`0.44.12`):

- `fa-thumb-tack` → Odoo maps to `push_pin`, which is **absent** from
  `material-symbols@0.44.12`. Used `keep` instead — the current Material Symbols name
  for the same pushpin glyph (verified present in the package's `index.d.ts`).

Every other chosen `data-icon` value was verified to exist in
`node_modules/material-symbols/index.d.ts`.

## CSS infrastructure — `src/components/icons/icons.css`

Added an `.oi` base class modeled on Odoo's `material-icon-base`
(`web/static/src/webclient/icons.scss`), adapted for the variable font:

- `.oi` — `font-family: "Material Symbols Outlined"`, `::before { content: attr(data-icon) }`,
  `font-variation-settings: "FILL" var(--oi-mi-fill, 0)`, plus the `::before`
  `transform: scale(1.214285)` spacing compensation Odoo uses so glyphs fill the box
  like FA did.
- `.oi-outlined` / `.oi-filled` — toggle `--oi-mi-fill` between `0` and `1`.
- `.oi-rotate-90/180/270` — rotation helpers (replace FontAwesome's `fa-rotate-*`).
- `.oi-stack` / `.oi-stack-1x` / `.oi-stack-2x` — icon stacking (mirrors Odoo's kept-for-
  compat stack classes), used by the composer assistant overlay.
- Renamed the o-spreadsheet-local `.fa-small` helper to `.oi-small`.

`fa-inverse` does not exist in Odoo's icons.scss; the composer's "inverse" background disc
is now handled locally in `composer.css` (see below).

## Full mapping applied

| Font Awesome class            | data-icon                   | fill |
| ----------------------------- | --------------------------- | ---- |
| fa-clipboard                  | assignment                  |      |
| fa-clone                      | content_copy                |      |
| fa-eye                        | visibility                  |      |
| fa-eye-slash                  | visibility_off              |      |
| fa-bar-chart                  | bar_chart                   |      |
| fa-file-image-o               | image                       |      |
| fa-link                       | link                        |      |
| fa-check-square-o             | check_box                   |      |
| fa-align-center (+rotate-270) | format_align_center         |      |
| fa-pencil-square-o            | edit_square                 |      |
| fa-external-link              | open_in_new                 |      |
| fa-chain-broken               | link_off                    |      |
| fa-caret-up                   | arrow_drop_up               |      |
| fa-caret-down                 | arrow_drop_down             |      |
| fa-caret-right                | arrow_right                 |      |
| fa-caret-left                 | arrow_left                  |      |
| fa-trash-o                    | delete                      |      |
| fa-trash                      | delete                      | ✓    |
| fa-refresh                    | refresh                     |      |
| fa-exchange                   | swap_horiz                  |      |
| fa-sort-alpha-asc             | sort_by_alpha               |      |
| fa-sort-alpha-desc            | sort_by_alpha               |      |
| fa-magic                      | wand_stars                  |      |
| fa-filter                     | filter_alt                  | ✓    |
| fa-search                     | search                      |      |
| fa-search-plus                | zoom_in                     |      |
| fa-exclamation-triangle       | warning                     |      |
| fa-exclamation-circle         | error                       |      |
| fa-download                   | download                    |      |
| fa-moon-o                     | dark_mode                   |      |
| fa-thumb-tack                 | keep (Odoo: push_pin)       |      |
| fa-lock                       | lock                        |      |
| fa-unlock                     | lock_open                   |      |
| fa-print                      | print                       |      |
| fa-cog                        | settings                    | ✓    |
| fa-angle-left                 | keyboard_arrow_left         |      |
| fa-angle-down                 | keyboard_arrow_down         |      |
| fa-angle-double-right         | keyboard_double_arrow_right |      |
| fa-angle-double-left          | keyboard_double_arrow_left  |      |
| fa-circle                     | circle                      | ✓    |
| fa-question-circle            | help                        |      |
| fa-times-circle               | cancel                      | ✓    |
| fa-times                      | close                       |      |
| fa-ellipsis-v                 | more_vert                   |      |
| fa-compress                   | close_fullscreen            |      |
| fa-expand                     | expand_content              |      |
| fa-sliders                    | tune                        |      |
| fa-paint-brush                | design_services             |      |
| fa-undo                       | undo                        |      |

## Files changed

### Source (`src/`)

- `components/icons/icons.css` — new `.oi` infrastructure (see above).
- `components/icons/icons.xml` — 33 icon templates migrated (incl. `IRREGULARITY_MAP`
  using `oi-rotate-270`, filled `TRASH_FILLED`, `oi-small` wrappers).
- `components/composer/composer/composer.xml` + `composer.css` — assistant help/close
  overlays migrated to `oi-stack` + `data-icon` (`help` / `cancel` / background `circle`);
  CSS selectors switched from `.fa-question-circle`/`.fa-times-circle`/`.fa-stack` to
  `[data-icon=...]`/`.oi-stack`; added `.o-composer-assistant-icon-bg` to colour the
  background disc (replacing `fa-inverse`).
- `components/figures/figure_carousel/figure_carousel.xml` — angle-down, full-screen
  toggle (`t-att-data-icon`), ellipsis menu button.
- `components/figures/chart/chart_dashboard_menu/chart_dashboard_menu.{ts,xml}` —
  full-screen menu item now carries an `icon` field bound via `t-att-data-icon`;
  ellipsis button migrated.
- `components/side_panel/...` — pivot measure (dynamic show/hide eye via
  `t-att-data-icon`), pivot dimension/custom-groups delete, layout configurator warning,
  pivot & chart side-panel config/design icons, defer-update undo, cog-wheel menu.
- `components/top_bar/top_bar.xml`, `link/link_editor/link_editor.xml`,
  `small_bottom_bar/*`, `side_panel/perf_profile/perf_profile_panel.xml`,
  `side_panel/side_panel/side_panel.xml`.

### Demo / packaging

- `demo/index.html`, `demo/minimalist.html` — dropped the `font-awesome` stylesheet,
  kept/added the `material-symbols` stylesheet.
- `package.json` — removed the `font-awesome` dependency (Material Symbols now the only
  icon font). NOTE: run `npm install` to prune `font-awesome` from `package-lock.json`.

### Tests

- ~15 test files: `.fa-X` selectors → `[data-icon='Y']`.
- `tests/figures/carousel/carousel_full_screen.test.ts` — `toHaveClass("fa-expand")`
  → `toHaveAttribute("data-icon", "expand_content")` (and compress → close_fullscreen).
- `tests/figures/chart/chart_menu_dashboard_component.test.ts` — the
  `extendMockGetBoundingClientRect` helper matches by **class name** (`classList.contains`),
  and the ellipsis button no longer has a `fa-ellipsis-v` class; re-keyed the mock to the
  still-present `o-chart-dashboard-item` class and updated the click selector to
  `[data-icon='more_vert']`.
- Snapshots regenerated with `jest -u` (14 snapshots across the affected suites).

## Verification

- `rtk grep` confirms **no** `fa fa-*` / `fa-stack` / `fa-small` / `fa-inverse` class
  usages remain in `src/`, `tests/` (source or snapshots), or `demo/`.
- TypeScript type-check (`tests/tsconfig.json`): **passes** (validates the new
  `MenuItem.icon` field).
- Full jest suite: **286 suites / 15189 tests passing**, 185 snapshots
  (24 regenerated by this migration, all others unchanged).

## Environment note (not part of the change)

`node_modules` was populated for macOS; on this linux/arm64 box the native bindings were
the wrong arch. Had to install `@swc/core-linux-arm64-gnu` /
`@unrs/resolver-binding-linux-arm64-gnu` and reinstall `canvas` for tests to run. This is
a local environment fix only — no repo files affected.

## Appendix: the two strategies (original vs Odoo) and what shipped

The final implementation is a **hybrid**, not a wholesale copy of Odoo's approach.

### The "other" strategy (original, pre-Odoo)

Before consulting the Odoo files, the plan was to derive everything from general
Material Symbols knowledge + the npm package:

1. **Mapping** — invent the `fa-* → data-icon` values from memory, validating only that
   the names _exist_ in `node_modules/material-symbols/index.d.ts`. There was no source
   of truth for _which_ symbol Odoo actually chose, so several were wrong guesses:
   - `fa-clipboard` → guessed `content_paste` · Odoo: **`assignment`**
   - `fa-paint-brush` → guessed `brush`/`format_paint` · Odoo: **`design_services`**
   - filled-ness was guesswork — no way to know `fa-cog`/`fa-filter`/`fa-circle`/
     `fa-times-circle`/`fa-trash` are meant to be **filled** variants.
2. **`.oi` base CSS** — hand-written from scratch.
3. **Fill** — render filled icons via the variable font's `FILL` axis
   (`font-variation-settings: "FILL" 1`, driven by `--oi-mi-fill` + `oi-filled`).

### Odoo's strategy (`web/static/src/webclient/icons.scss`)

1. **Mapping** — the authoritative `fa-* → material-symbol` table (the temporary
   compatibility mapping referenced by the migration tip).
2. **`.oi` base** — the `material-icon-base` mixin (`content: attr(data-icon)`,
   `::before { transform: scale(1.214285) }` spacing compensation, `vertical-align: -11.5%`).
3. **Fill** — **not** the FILL axis: Odoo appends a `_f` **ligature suffix**
   (`content: attr(data-icon) "_f"`), because it ships its own in-house fonts
   (`material_symbols_outlined` + `odoo_ui_icons`) where filled glyphs and brand icons
   are baked in as separate ligatures.

### What actually shipped (hybrid)

- ✅ Adopted Odoo's **mapping values** (the corrected part).
- ✅ Modeled the **`.oi` base CSS** on Odoo's `material-icon-base`.
- ❌ Did **not** adopt Odoo's `_f` fill mechanism — kept the **original FILL-axis**
  approach.

The fill strategy is the deliberate divergence: o-spreadsheet (standalone) vendors the
public npm `material-symbols` **variable font**, which exposes a `FILL` axis but has no
`_f` ligatures or brand glyphs. Odoo's `_f` scheme would not render against that font.
For the same reason, one mapping value also differs by necessity: `fa-thumb-tack` →
Odoo's `push_pin` is absent from `material-symbols@0.44.12`, so `keep` (the same pushpin
glyph under its current name) is used instead.
