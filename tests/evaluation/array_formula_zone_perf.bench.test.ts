/**
 * Performance benchmarks for zone-based array formula evaluation (PR 8561).
 *
 * Run on both branches and compare the console output:
 *   npx jest tests/evaluation/array_formula_zone_perf.bench.ts --verbose --no-coverage
 *
 * Each scenario targets a specific part of the PR:
 *   - Scenarios 1-4: zone-based lazy evaluation of computeArray functions
 *   - Scenario 5:    cold-start cost of dependency graph construction
 *   - Scenario 6:    incremental recalculation cost after a single cell change
 */

import { Model } from "../../src";
import { numberToLetters, toXC } from "../../src/helpers/coordinates";
import { setCellContent } from "../test_helpers/commands_helpers";

// ---------------------------------------------------------------------------
// Benchmark harness
// ---------------------------------------------------------------------------

interface BenchResult {
  name: string;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  iterations: number;
}

const results: BenchResult[] = [];

function bench(name: string, fn: () => void, iterations = 30): number {
  // Warm-up runs to settle JIT and caches before measuring.
  fn();
  fn();

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  const p25 = times[Math.floor(times.length * 0.25)];
  const p75 = times[Math.floor(times.length * 0.75)];
  const result: BenchResult = {
    name,
    median,
    p25,
    p75,
    min: times[0],
    max: times[times.length - 1],
    iterations,
  };
  results.push(result);
  return median;
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

/** Build a cells map for N rows × 3 cols (A=index, B=value, C=category). */
function makeDataGrid(nRows: number): Record<string, string> {
  const cells: Record<string, string> = {};
  for (let r = 1; r <= nRows; r++) {
    cells[`A${r}`] = String(r);
    cells[`B${r}`] = String(Math.round(Math.sin(r) * 10000));
    cells[`C${r}`] = r % 5 === 0 ? "active" : "inactive";
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Scenario 1: SEQUENCE — pure zone-based generation
//
// SEQUENCE(R, C) without zone: generates R×C values regardless of sheet size.
// SEQUENCE(R, C) with zone:    generates only the cells that fit the spill area.
//
// Sheet is 100 rows × 26 cols. Formula starts at A1, so spill fits 99×25 = 2,475 cells.
// Without zone: 10,000 × 100 = 1,000,000 cells generated.
// With zone:    ~2,475 cells generated.
// Expected speedup: ~400×.
// ---------------------------------------------------------------------------

describe("Scenario 1: SEQUENCE — truncated by sheet dimensions", () => {
  const SHEET_ROWS = 100;
  const SHEET_COLS = 26;

  test("initial evaluation", () => {
    const ms = bench("SEQUENCE(10000,100) in 100×26 sheet — initial", () => {
      new Model({
        sheets: [
          {
            cells: { A1: "=SEQUENCE(10000,100)" },
            colNumber: SHEET_COLS,
            rowNumber: SHEET_ROWS,
          },
        ],
      });
    });
    console.log(`  SEQUENCE initial: ${ms.toFixed(1)} ms`);
    // No threshold — just compare the number across branches.
    expect(ms).toBeGreaterThan(0);
  });

  test("re-evaluation after changing the formula argument", () => {
    const model = new Model({
      sheets: [
        {
          cells: { A1: "=SEQUENCE(10000,100)" },
          colNumber: SHEET_COLS,
          rowNumber: SHEET_ROWS,
        },
      ],
    });

    const ms = bench("SEQUENCE(10000,100) — re-eval after change", () => {
      // Alternating to force re-evaluation each iteration.
      const current = model.getters
        .getEvaluatedCell({
          sheetId: model.getters.getActiveSheetId(),
          col: 0,
          row: 0,
        })
        .value?.toString();
      setCellContent(
        model,
        "A1",
        current === "=SEQUENCE(10000,100)" ? "=SEQUENCE(10001,100)" : "=SEQUENCE(10000,100)"
      );
    });
    console.log(`  SEQUENCE re-eval: ${ms.toFixed(1)} ms`);
    expect(ms).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: FILTER — large dataset, small matching set, small sheet
//
// FILTER cannot skip scanning all input rows (it must check every condition),
// but it can skip building the result matrix beyond what the sheet needs.
//
// Data: 5,000 rows. Only rows where A % 100 === 0 match (50 rows).
// Sheet: 60 rows tall — so only 59 spill rows available.
// Without zone: builds full 50-row result matrix.
// With zone:    builds only the 50 rows (all fit here — tests pure scan cost).
//
// Variant 2b: 5,000 matching rows, sheet has 100 rows. With zone: builds 99.
// Without zone: builds all 5,000. Expected speedup: ~50×.
// ---------------------------------------------------------------------------

describe("Scenario 2: FILTER — large dataset", () => {
  const DATA_ROWS = 10000;
  const dataCells = makeDataGrid(DATA_ROWS);

  test("2a — few matches, all fit in sheet (scan cost dominates)", () => {
    // FILTER(A1:B5000, MOD(A1:A5000, 100)=0) → 50 matching rows.
    // Sheet has 200 rows so all 50 fit. Win = output construction only.
    const cells = {
      ...dataCells,
      E1: `=FILTER(A1:B${DATA_ROWS},MOD(A1:A${DATA_ROWS},100)=0)`,
    };
    const ms = bench("FILTER — 100 matches out of 10000, all fit", () => {
      new Model({ sheets: [{ cells, colNumber: 10, rowNumber: 200 }] });
    });
    console.log(`  FILTER 2a: ${ms.toFixed(1)} ms`);
    expect(ms).toBeGreaterThan(0);
  });

  test("2b — many matches, sheet truncates output (output cost dominates)", () => {
    // FILTER(A1:B5000, A1:A5000>0) → all 5,000 rows match.
    // Sheet has only 100 rows. With zone: outputs 99 rows. Without: outputs 5,000.
    const cells = {
      ...dataCells,
      E1: `=FILTER(A1:B${DATA_ROWS},A1:A${DATA_ROWS}>0)`,
    };
    const ms = bench("FILTER — 10000 matches, sheet truncates to 99", () => {
      new Model({ sheets: [{ cells, colNumber: 10, rowNumber: 100 }] });
    });
    console.log(`  FILTER 2b: ${ms.toFixed(1)} ms`);
    expect(ms).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: SORT — large dataset, sheet truncates output
//
// SORT must process all N rows to determine ordering, but it only needs to
// build the top K rows of the result matrix (where K = sheet spill capacity).
//
// Data: 5,000 rows. Sheet: 100 rows → K = 99.
// Without zone: builds full 5,000-row sorted matrix.
// With zone:    builds only first 99 rows after sorting.
// Expected speedup for output construction: ~50×.
// ---------------------------------------------------------------------------

describe("Scenario 3: SORT — truncated output", () => {
  const DATA_ROWS = 10000;
  const dataCells = makeDataGrid(DATA_ROWS);

  test("SORT 5000 rows, sheet shows only first 100", () => {
    const cells = {
      ...dataCells,
      E1: `=SORT(A1:B${DATA_ROWS},1,1)`,
    };
    const ms = bench("SORT 10000 rows, 100-row sheet", () => {
      new Model({ sheets: [{ cells, colNumber: 10, rowNumber: 100 }] });
    });
    console.log(`  SORT: ${ms.toFixed(1)} ms`);
    expect(ms).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Nested SORT(FILTER(...)) — real-world pattern
//
// Common in dashboards: filter a large table then sort the results.
// Both functions can benefit from zone optimization on their output.
//
// Data: 5,000 rows. FILTER keeps rows where B > 0 (~half = 2,500 rows).
// SORT sorts those. Sheet: 100 rows → only 99 rows displayed.
// Without zone: FILTER builds 2,500-row matrix; SORT builds 2,500-row matrix.
// With zone:    both build only 99-row output.
// ---------------------------------------------------------------------------

describe("Scenario 4: Nested SORT(FILTER(...))", () => {
  const DATA_ROWS = 10000;
  const dataCells = makeDataGrid(DATA_ROWS);

  test("SORT(FILTER(5000 rows)), sheet shows 100", () => {
    const cells = {
      ...dataCells,
      E1: `=SORT(FILTER(A1:B${DATA_ROWS},B1:B${DATA_ROWS}>0),2,-1)`,
    };
    const ms = bench("SORT(FILTER(10000)), 100-row sheet", () => {
      new Model({ sheets: [{ cells, colNumber: 10, rowNumber: 100 }] });
    });
    console.log(`  SORT(FILTER): ${ms.toFixed(1)} ms`);
    expect(ms).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Cold-start dependency graph — no array formulas
//
// The PR changes how the dependency graph is built: static rangeDependencies
// are no longer pre-seeded; all dependencies are discovered dynamically
// during evaluation. This scenario has NO array formulas so it isolates
// the dependency tracking cost change.
//
// 1,000 cells each referencing a neighbour via SUM.
// ---------------------------------------------------------------------------

describe("Scenario 5: Cold-start — many simple formula cells", () => {
  test("1000 SUM cells chained (no array formulas)", () => {
    const cells: Record<string, string> = { A1: "1" };
    // Each row sums the previous row → 1000-cell dependency chain.
    for (let r = 2; r <= 1000; r++) {
      cells[`A${r}`] = `=SUM(A${r - 1},1)`;
    }

    const ms = bench("1000 chained SUM cells — initial build", () => {
      new Model({ sheets: [{ cells, colNumber: 1, rowNumber: 1000 }] });
    });
    console.log(`  Cold-start chain: ${ms.toFixed(1)} ms`);
    expect(ms).toBeGreaterThan(0);
  });

  test("1000 independent SUM cells (wide fan-in)", () => {
    const cells: Record<string, string> = {};
    // Row 1: raw values. Row 2: each cell sums the corresponding value.
    for (let c = 0; c < 100; c++) {
      for (let r = 1; r <= 10; r++) {
        cells[toXC(c, r - 1)] = String(r);
      }
    }
    for (let c = 0; c < 100; c++) {
      cells[toXC(c, 10)] = `=SUM(${numberToLetters(c)}1:${numberToLetters(c)}10)`;
    }

    const ms = bench("100 SUM(10 rows) cells — initial build", () => {
      new Model({ sheets: [{ cells, colNumber: 100, rowNumber: 11 }] });
    });
    console.log(`  Cold-start fan-in: ${ms.toFixed(1)} ms`);
    expect(ms).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Incremental recalculation
//
// After the sheet is built, change a single source cell and measure how long
// it takes to propagate the change. Tests whether the PR's dependency tracking
// changes affect incremental update performance.
//
// Two sub-cases:
// 6a: the changed cell feeds into a large array formula (SORT/FILTER)
// 6b: the changed cell feeds into a long chain of simple formulas
// ---------------------------------------------------------------------------

describe("Scenario 6: Incremental recalculation", () => {
  test("6a — change a value cell that feeds a SORT array formula", () => {
    const DATA_ROWS = 5000;
    const dataCells = makeDataGrid(DATA_ROWS);
    dataCells[`E1`] = `=SORT(A1:B${DATA_ROWS},2,1)`;
    const model = new Model({
      sheets: [{ cells: dataCells, colNumber: 10, rowNumber: 300 }],
    });
    const sheetId = model.getters.getActiveSheetId();

    let toggle = true;
    const ms = bench("incremental: single value change → SORT re-eval", () => {
      // Change A1 between two values to force a re-sort each time.
      setCellContent(model, "A1", toggle ? "9999" : "1");
      toggle = !toggle;
    });
    console.log(`  Incremental SORT: ${ms.toFixed(1)} ms`);
    expect(ms).toBeGreaterThan(0);
  });

  test("6b — change source cell in a 1000-cell dependency chain", () => {
    const cells: Record<string, string> = { A1: "0" };
    for (let r = 2; r <= 1000; r++) {
      cells[`A${r}`] = `=A${r - 1}+1`;
    }
    const model = new Model({ sheets: [{ cells, colNumber: 1, rowNumber: 1000 }] });

    let v = 0;
    const ms = bench("incremental: source change → 1000-cell chain re-eval", () => {
      setCellContent(model, "A1", String(v++));
    });
    console.log(`  Incremental chain: ${ms.toFixed(1)} ms`);
    expect(ms).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Summary table — printed once after all tests.
// ---------------------------------------------------------------------------

afterAll(() => {
  if (results.length === 0) {
    return;
  }
  console.log("\n=== Benchmark results (compare across branches) ===");
  console.table(
    results.map((r) => ({
      scenario: r.name,
      "median (ms)": r.median.toFixed(2),
      "p25 (ms)": r.p25.toFixed(2),
      "p75 (ms)": r.p75.toFixed(2),
      "min (ms)": r.min.toFixed(2),
      "max (ms)": r.max.toFixed(2),
      iterations: r.iterations,
    }))
  );
});
