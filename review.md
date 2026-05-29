# Review — `40a6aebf9 [PERf] evaluation: arg definitions at compile time`

### Commit

- Subject tag typo: `[PERf]` → `[PERF]` (Odoo convention is upper-case).

### Findings

#### tests/evaluation/evaluation.test.ts:1440,1457,1483 — blocker

Three `test.only(...)` calls were left in. They suppress every other test in the file. Replace with `test(...)`.

#### src/formulas/compiler.ts:514 — nit (latent footgun)

The generated `; // FOO` is safe today only because every FUNCALL arg is reduced to a bare variable via `assignResultToVariable()` at line 505, and the outer use at line 429 wraps it as `return ${expr};` on its own line. If a future change ever inlines a FUNCALL's `returnExpression` into another expression (e.g. `f(${child.returnExpression} + 1)`), the comment will swallow the rest of the parent line and produce invalid JS. Either move the comment to a separate `code.append(...)` line, or leave a short note next to line 514 calling out the invariant.

#### tests/test_helpers/helpers.ts:91 — nit (naming)

`const functionMap = functionRegistry.content;` is now identical to `functionsContent` declared one line above — `functionMap` is a leftover from the removed `.mapping` field. Delete `functionMap`/`functionMapRestore` (and the matching restore logic), or rename to something that explains why a second alias exists.

#### src/plugins/ui_core_views/cell_evaluation/compilation_parameters.ts:48 — nit

The `as EvalContext` cast replaces what used to be a prototype-chained lookup via `functionMap`. Worth a quick grep for `evalContext[` / `this[` over a function name to confirm no caller still expects that chain.

---

### Naming — alternatives by lens

#### `PreparedComputeFunction<R>` (`src/types/functions.ts:36`)

| Lens                          | Name                                                            | Rationale                                                                         |
| ----------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| What changed vs. old type     | **`ComputeFunction<R>`** (keep the name, replace the signature) | The old `this`-based shape no longer exists — one name, no migration tax.         |
| What the type IS structurally | `CtxComputeFunction<R>`                                         | Says exactly what differs: `ctx` is a real parameter, not `this`.                 |
| What's been done to it        | `SpecializedComputeFunction<R>`                                 | It's specialized for a known arg count.                                           |
| Caller's POV (compiled code)  | `CompiledCallable<R>` / `EvalCallable<R>`                       | From the generated formula's POV, it's just a thing you call with `(ctx, …args)`. |
| Lifetime/origin               | `RegisteredFunctionImpl<R>`                                     | The actual JS implementation stored per function definition.                      |

**Recommendation:** drop the alias and reuse `ComputeFunction<R>`.

#### `funCallIndex` (`src/formulas/compiler.ts:512`)

| Lens                          | Name                                 |
| ----------------------------- | ------------------------------------ |
| What it indexes into          | `preparedFunctionIndex`              |
| Full word, matches neighbours | `functionCallIndex`                  |
| Generated-code POV            | **`functionsSlot`** / `slotIndex`    |
| Minimal                       | `i` (only used twice within 5 lines) |

**Recommendation:** `functionsSlot` — the rest of the line (`functions[functionsSlot](ctx, …)`) then reads as one coherent picture.

#### `preparedFunctions` (array on `CompiledFormula`)

| Lens                | Name                                                         |
| ------------------- | ------------------------------------------------------------ |
| Contents            | `computeFunctions`                                           |
| Role at runtime     | `runtimeFunctions` / `boundFunctions`                        |
| Relationship to AST | **`callSites`** (one entry per FUNCALL node in source order) |
| Compiler-author POV | `functionTable`                                              |

**Recommendation:** `callSites` — `preparedFunctions` invites the wrong mental model. The array has one entry per FUNCALL in the source, not one per distinct function: `SUM(SUM(SUM(...)))` produces 3 entries, not 1.

#### `matrixOnlyIndices` (`src/functions/create_compute_function.ts`)

| Lens             | Name                                  |
| ---------------- | ------------------------------------- |
| What it stores   | `matrixOnlyArgIndices`                |
| What it's for    | `argsRequiringMatrix`                 |
| Loop readability | keep the name, fix the loop variables |

**Recommendation:** keep `matrixOnlyIndices`; replace the `k` / `i = matrixOnlyIndices[k]` pair with `for (const argIndex of matrixOnlyIndices) { if (!isMatrix(args[argIndex])) … }`.

#### `applyVectorization` — optional `argDefinitions` parameter (`src/functions/create_compute_function.ts:57`)

The new optional `argDefinitions` short-circuits the function's own derivation when passed. The hot path (`vectorizedCompute`) always passes it; the slow path never does. Either make it required (and have the slow-path caller in `module_math.ts`/SUBTOTAL build it once) or rename to **`precomputedArgDefinitions`** to signal the intent.
