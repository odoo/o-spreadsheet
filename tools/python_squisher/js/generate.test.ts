/**
 * Generates the files the Python port relies on / is tested against. Run from the repo root with
 *
 *   npx jest --roots tools/python_squisher/js --testRegex 'tools/python_squisher/js/.*\.test\.ts$'
 *
 * (run it again after the python tests to check their output, see the README)
 *
 * - o_spreadsheet_squisher/builtin_functions.json: arity of the built-in functions
 * - tests/fixtures.json: workbooks, as exported unsquished and squished by the TS model
 * - if tests/python_output.json exists (written by the python tests), checks that the TS model
 *   loads the python squished cells back into the exact original content.
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { functionRegistry } from "../../../src/functions/function_registry";
import "../../../src/functions/function_registry_population";
import { toCartesian } from "../../../src/helpers/coordinates";
import { Model } from "../../../src/model";

const ROOT = process.env.PY_SQUISHER_ROOT || join(__dirname, "..");

function dumpFunctions() {
  const result: Record<string, [number, number][]> = {};
  for (const name of Object.keys(functionRegistry.content).sort()) {
    const descr = functionRegistry.content[name];
    result[name] = descr.args.map((arg) => [
      arg.optional || arg.default ? 1 : 0,
      arg.repeating ? 1 : 0,
    ]);
  }
  writeFileSync(
    join(ROOT, "o_spreadsheet_squisher", "builtin_functions.json"),
    JSON.stringify(result) + "\n"
  );
}

// --------------------------------------------------------------------------
// random workbooks
// --------------------------------------------------------------------------

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHEET_NAMES = ["Sheet1", "Data 2", "a|b", "It's", "Été"];

function makeGenerator(seed: number, strict: boolean) {
  const rand = mulberry32(seed);
  const int = (n: number) => Math.floor(rand() * n);
  const pick = <T>(arr: T[]): T => arr[int(arr.length)];
  const letters = (n: number) => {
    let s = "";
    n++;
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  const quoteSheet = (name: string) =>
    /^\w+$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
  const sheetPrefix = () => {
    const r = rand();
    if (r < 0.75) return "";
    if (r < 0.95) return quoteSheet(pick(SHEET_NAMES)) + "!";
    return pick(["Unknown!", "'no sheet'!", "sheet1!", "SHEET1!"]);
  };
  const dollar = () => (rand() < 0.2 ? "$" : "");
  const cellRef = (c: number, r: number) => `${dollar()}${letters(c)}${dollar()}${r + 1}`;
  type Ref = (offset: number) => string;
  const refTemplate = (): Ref => {
    const c = int(6);
    const r = int(20);
    const dir = rand() < 0.7 ? "row" : rand() < 0.5 ? "col" : "both";
    const step = rand() < 0.8 ? 1 : pick([0, 2, -1, 3]);
    const prefix = sheetPrefix();
    const kind = rand();
    const fixed = dollar();
    const at = (o: number) => {
      const dc = dir === "col" || dir === "both" ? o * step : 0;
      const dr = dir === "row" || dir === "both" ? o * step : 0;
      return [Math.max(0, c + dc), Math.max(0, r + dr)];
    };
    if (kind < 0.6) {
      return (o) => {
        const [cc, rr] = at(o);
        return prefix + `${fixed}${letters(cc)}${fixed}${rr + 1}`;
      };
    }
    if (kind < 0.75) {
      return (o) => {
        const [cc, rr] = at(o);
        return prefix + `${letters(cc)}${rr + 1}:${letters(cc + 1)}${rr + 3}`;
      };
    }
    if (kind < 0.82) {
      return (o) => prefix + pick(["A:A", "B2:B", "$C:$C", "3:3", "A1:A1", "B$2:C"]);
    }
    if (kind < 0.88) {
      return (o) => {
        const [cc, rr] = at(o);
        return prefix + `${letters(cc)}${rr + 1}:${letters(cc)}${rr + 1}`;
      };
    }
    if (kind < 0.92) {
      return () => "#REF";
    }
    return (o) => {
      const [cc, rr] = at(o);
      return prefix + cellRef(cc, rr);
    };
  };
  const num = (): ((o: number) => string) => {
    const base = pick([0, 1, 2, 10, 1.5, 0.1, 1000000, 3e-7, 42, ...(strict ? [] : [1e21])]);
    const step = pick([0, 0, 1, 1, 2, -1, 0.1, 0.5]);
    const fmt = (v: number) => {
      const s = String(Number(v.toPrecision(12)));
      return s.startsWith("-") ? `(${s})` : s;
    };
    return (o) => fmt(base + o * step);
  };
  const str = (): ((o: number) => string) => {
    const base = pick(["a", "", "hello world", 'with \\" quote', "x|y", "="]);
    const changes = rand() < 0.3;
    return (o) => `"${changes ? base + (o % 3) : base}"`;
  };
  const templates: (() => (o: number) => string)[] = [
    () => {
      const a = refTemplate();
      return (o) => `=${a(o)}`;
    },
    () => {
      const a = refTemplate();
      const n = num();
      return (o) => `=${a(o)}+${n(o)}`;
    },
    () => {
      const a = refTemplate();
      const b = refTemplate();
      const fn = pick(["SUM", "sum", "Max", "AVERAGE", "CONCAT"]);
      return (o) => `=${fn}(${a(o)}, ${b(o)})`;
    },
    () => {
      const a = refTemplate();
      const s = str();
      const n = num();
      return (o) => `=IF(${a(o)}>${n(o)},${s(o)},"no")`;
    },
    () => {
      const s = str();
      const a = refTemplate();
      return (o) => `=CONCATENATE(${s(o)}, ${a(o)}, ${s(o + 1)})`;
    },
    () => {
      const a = refTemplate();
      return (o) => `=UNKNOWNFN(${a(o)})`;
    },
    () => {
      const a = refTemplate();
      return (o) => `=ABS(${a(o)}, ${a(o)})`; // too many args
    },
    () => {
      const a = refTemplate();
      return (o) => `=SUM(${a(o)}`; // missing paren
    },
    () => {
      const a = refTemplate();
      return (o) => `=${a(o)} + `;
    },
    () => {
      const n = num();
      return (o) => `={${n(o)},2;3,${n(o + 1)}}`;
    },
    () => {
      const a = refTemplate();
      return (o) => `= ${a(o)}\n *  2%`;
    },
    () => {
      const a = refTemplate();
      return (o) => `=${a(o)} + 1`;
    },
    () => {
      const a = refTemplate();
      return (o) => `=IFS(${a(o)}, 1, ${a(o)})`; // repeating args in pairs
    },
    () => {
      const a = refTemplate();
      return (o) => `=VLOOKUP(${a(o)}, A1:C10, 2, FALSE)`;
    },
    () => {
      const a = refTemplate();
      return (o) => `=-${a(o)}#`;
    },
    () => {
      const n = num();
      return (o) => n(o);
    },
    () => {
      const base = int(100);
      const step = pick([1, 1, 1, 2, 0, -1, 7]);
      return (o) => String(base + o * step);
    },
    () => {
      const base = pick([45000, 9007199254740990, 123456789012, -5]);
      return (o) => String(base + o);
    },
    () => (o) => pick(["hello", "TRUE", "1e3", "007", "2024-01-01", "'5", "$10", "1,000", "#REF"]),
  ];
  return { rand, int, pick, templates };
}

function randomWorkbook(seed: number, strict = false) {
  const { int, pick, templates, rand } = makeGenerator(seed, strict);
  const sheets = SHEET_NAMES.slice(0, 2 + int(4)).map((name, i) => ({
    id: `sheet${i}`,
    name,
    colNumber: 26,
    rowNumber: 200,
    cells: {} as Record<string, string>,
    formats: {} as Record<string, number>,
  }));
  const formats = { 1: "0.00%", 2: "m/d/yyyy", 3: "@" };
  for (const sheet of sheets) {
    for (let col = 0; col < 4; col++) {
      let row = 0;
      while (row < 60) {
        const template = pick(templates)();
        const length = 1 + int(12);
        // strict: no text format, TS squishes "007" as a number under a text format, python does not
        const format = rand() < 0.15 ? 1 + int(strict ? 2 : 3) : undefined;
        for (let o = 0; o < length && row < 60; o++, row++) {
          if (rand() < 0.05) {
            continue; // hole
          }
          const xc = `${String.fromCharCode(65 + col)}${row + 1}`;
          sheet.cells[xc] = template(o);
          if (format && rand() < 0.9) {
            sheet.formats[xc] = format;
          }
        }
        row += int(3);
      }
    }
  }
  return { sheets, formats };
}

const HANDWRITTEN = [
  {
    A1: "=SUM(B1:B10)",
    A2: "=SUM(B1:B10)",
    A3: "=SUM(B1:B11)",
    B1: "1",
    B2: "2",
    B3: "3",
    C1: "=B1",
    C2: "=B2",
    C3: "=B3",
    C4: "=B4+2",
    C5: "=B4+3",
    C6: "=B4+3000",
    C7: "=B4+3001",
    A5: '=IF(AND(F20819<=\'Sheet1\'!$M$1,F20819>=\'Sheet1\'!$L$1),IFERROR(MID(C20819,SEARCH("(",C20819)+1,SEARCH(")",C20819)-SEARCH("(",C20819)-1),""))',
    A6: '=IF(AND(F20820<=\'Sheet1\'!$M$1,F20820>=\'Sheet1\'!$L$1),IFERROR(MID(C20820,SEARCH("(",C20820)+1,SEARCH(")",C20820)-SEARCH("(",C20820)-1),""))',
    A7: '=IF(AND(F20821<=\'Sheet1\'!$M$1,F20821>=\'Sheet1\'!$L$1),IFERROR(MID(C20821,SEARCH("(",C20821)+1,SEARCH(")",C20821)-SEARCH("(",C20821)-1),""))',
    D1: '="Test"+"Test"',
    D2: '="Test"+"Test"',
    D3: '="Test2"',
    D4: '="Test2"',
    D5: '="Test2"',
  },
];

function exportCase(data: any) {
  // reload the unsquished export: it is what the python side receives, and the original model
  // can hold state that its export does not keep (e.g. "A1:A1" is exported as "A1")
  const unsquished = new Model(data)._exportData(false);
  const model = new Model(JSON.parse(JSON.stringify(unsquished)));
  const squished = model._exportData(true);
  const exported = model.exportData();
  return {
    input: {
      sheets: unsquished.sheets.map((s) => ({
        id: s.id,
        name: s.name,
        colNumber: s.colNumber,
        rowNumber: s.rowNumber,
        cells: s.cells,
        formats: s.formats,
      })),
      formats: unsquished.formats,
    },
    expected: squished.sheets.map((s) => s.cells),
    // literal cells squished as numbers by the TS version
    tsIntegers: unsquished.sheets.map((s) =>
      Object.keys(s.cells).filter((xc) => {
        const { col, row } = toCartesian(xc);
        const cell = model.getters.getCell({ sheetId: s.id, col, row });
        return !cell?.isFormula && typeof cell?.parsedValue === "number" && cell.parsedValue % 1 === 0;
      })
    ),
    isNotSquishable: Boolean(exported.isNotSquishable),
  };
}

test("generate python squisher files", () => {
  dumpFunctions();
  const cases: any[] = [];
  for (const cells of HANDWRITTEN) {
    cases.push(exportCase({ sheets: [{ id: "Sheet1", name: "Sheet1", cells }] }));
  }
  for (let seed = 1; seed <= 60; seed++) {
    cases.push(exportCase(randomWorkbook(seed, seed > 30)));
  }
  writeFileSync(join(ROOT, "tests", "fixtures.json"), JSON.stringify(cases) + "\n");
});

test("python output loads back in o-spreadsheet", () => {
  const path = join(ROOT, "tests", "python_output.json");
  if (!existsSync(path)) {
    return;
  }
  const outputs: { input: any; output: any }[] = JSON.parse(readFileSync(path, "utf-8"));
  for (const { input, output } of outputs) {
    const expected = new Model(input)._exportData(false);
    const reloaded = new Model(output)._exportData(false);
    expect(reloaded.sheets.map((s) => s.cells)).toEqual(expected.sheets.map((s) => s.cells));
  }
  expect(outputs.length).toBeGreaterThan(0);
});
