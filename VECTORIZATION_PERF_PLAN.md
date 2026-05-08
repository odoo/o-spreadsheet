# `applyVectorization` performance plan

Improving the per-cell cost of vectorized formula evaluation
(`A:A=B10`-style patterns over thousands of rows).

The hot path today goes:

```
generateMatrix(callback)                    // 1 indirect call/cell
  callback (col,row) =>
    fillArgsBuffer(col,row)                 // (Tier 1: now mutates a reused buffer)
    formula(...argsBuffer)                  // spread
      errorHandlingCompute.bind(this)       // wrapper
        argTargeting(descr, args.length)    // RE-COMPUTED per cell
        for-arg error-check loop
        try {
          computeFunctionToObject.apply(this, args)
            descr.compute.apply(this, args) // user code
        }
    isMatrix(result)                        // almost always false
…then a full second pass:
replaceErrorPlaceholderInResult → matrixForEach → replaceFunctionNamePlaceholder
```

## Status

- [x] **Tier 1 — Step 1** Reuse args buffer across cells (`e8f4e34ff`)
- [x] **Tier 1 — Step 2** Precompute per-arg getters (`ad3dde0f9`)
- [x] **Tier 1 — Step 3** Inline result-matrix construction
- [ ] Tier 2 — Steps 4–6
- [ ] Tier 3 — Steps 7–9

---

## Tier 1 — eliminate per-cell allocations

### Step 3. Inline the result-matrix construction

Drop the `generateMatrix(callback)` indirection in the vectorized branch
of `applyVectorization`. Write the `for col / for row` loop directly so
V8 can fully inline. One less indirect call per cell.

**Files:** `src/functions/helpers.ts`
**Risk:** very low — purely local rewrite.
**Expected:** small but real (a few %).

---

## Tier 2 — trim the wrapper chain

### Step 4. Hoist `argTargeting` and accept-error flags

`createComputeFunction.vectorizedCompute` already calls
`argTargeting(descr, args.length)` once. `errorHandlingCompute`
recomputes it for every cell (line ~70 of `create_compute_function.ts`).
Compute it once and either:

- pass `argsToFocus` through as an extra parameter, or
- close over a precomputed `acceptErrors: boolean[]` and bypass the
  `errorHandlingCompute` indirection on the vectorized path.

Saves a Map lookup + a small loop per cell.

**Files:** `src/functions/create_compute_function.ts`
**Risk:** low — internal refactor of two helpers.
**Expected:** 5–15%.

### Step 5. Fold `replaceErrorPlaceholderInResult` into the build loop

Today we build the matrix, then walk it again with `matrixForEach` to
replace `[[FUNCTION_NAME]]` placeholders. Do the placeholder check
inline as each cell is produced. Removes a full second pass over N
cells. Most cells have no `message`, so the check is cheap.

**Files:** `src/functions/create_compute_function.ts`,
`src/functions/helpers.ts` (or pass a per-cell post-process callback
into `applyVectorization`).
**Risk:** low — behaviour-preserving.
**Expected:** ~5%.

### Step 6. Drop the `isMatrix(singleCellComputeResult)` check on the hot path

`formula(...)` returns a `Matrix` only for genuinely matrix-producing
functions (`MUNIT`, `SEQUENCE`, …). Add a flag on the function
descriptor — e.g. `returnsMatrix?: boolean` (default `false`) — and
when false skip the per-cell `isMatrix(...)` check entirely.

**Files:** `src/types/functions.ts` (descriptor flag),
`src/functions/helpers.ts` (use the flag),
the few function modules where `compute` may return a matrix
(opt them in).
**Risk:** medium — must catalogue which functions can return matrices.
A safe rollout is to default the flag to `true` (current behaviour) and
opt scalar-returning functions in over time.
**Expected:** ~5–10%.

---

## Tier 3 — restructure (only if Tier 1+2 isn't enough)

### Step 7. Skip `errorHandlingCompute` / `computeFunctionToObject` on the vectorized path

At function-registration time (`createComputeFunction`), bake a
specialized "vectorized compute" closure that does:

1. precompute `argsToFocus` and `acceptErrors`;
2. tight inner loop;
3. inline error guard;
4. inline result-shape normalization
   (`{value: x}` if not already an object).

The two wrappers exist mostly to handle the scalar entry — split into
separate scalar and vectorized entry points.

**Files:** `src/functions/create_compute_function.ts`,
`src/functions/helpers.ts`.
**Risk:** medium — cross-cutting refactor; keep behaviour identical via
the test suite (15077 tests + 183 snapshots).
**Expected:** 10–20%.

### Step 8. Move the per-cell `try/catch`

A `try/catch` around the inner block is fine in modern V8 but still
constrains optimization in some cases. Options:

- batch try/catch (one row at a time);
- result-object convention so the inner formula does not throw at all
  (`compute` already returns `EvaluationError` objects in many places —
  finish that conversion).

Only worth doing if profiling after Tier 1+2 shows it matters.

**Files:** every `module_*.ts` that throws `EvaluationError` from
`compute`. Big surface area.
**Risk:** high — large refactor.
**Expected:** unclear; benchmark first.

### Step 9. Specialize for "scalar inputs, scalar output" math

For `BIN_OPERATION` calls (`ADD`, `MULTIPLY`, `EQ`, `GT`, …) when both
inputs are numbers, generate a pure `number → number` kernel. This is
what the manual EQ optimization did — Tier 3 generalizes it across all
binary operators. Possibly with a small JIT-style code path that
detects "matrix of numbers vs scalar number" and runs a typed loop.

**Files:** `src/functions/module_operators.ts`,
possibly a new `src/functions/specialized_kernels.ts`.
**Risk:** high — careful with NaN, error propagation, locale, format
inheritance.
**Expected:** large for numeric workloads (the dominant case in real
spreadsheets).

---

## Measuring

Before each step, record a baseline:

```
=COUNTIF(A1:A10000, 1)        // already index-fast, useful as control
=A1:A10000=B1                  // matrix-vs-scalar EQ — main target
=A1:A10000+B1:B10000           // same-shape elementwise
=SUMPRODUCT((A1:A10000>0)*1)   // composed vectorization
```

Use `this.__timingEntries` (already wired in `create_compute_function`)
or the existing perf benchmarks under `tests/benchmark/` if present.
After each step, re-run the same set and compare.
