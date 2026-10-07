import { Model } from "../../src";
import { DEFAULT_BORDER_DESC } from "../../src/constants";
import { toXC } from "../../src/helpers/coordinates";
import { ClipboardStore } from "../../src/stores/clipboard_store";
import { isXLSXExportXMLFile } from "../../src/xlsx/helpers/xlsx_helper";
import {
  addColumns,
  addRows,
  clearFormatting,
  copy,
  createSheet,
  deleteColumns,
  deleteRows,
  duplicateSheet,
  paste,
  redo,
  setBordersOnTarget,
  setZoneBorders,
  undo,
} from "../test_helpers/commands_helpers";
import { getBorder } from "../test_helpers/getters_helpers";
import { target } from "../test_helpers/helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

/**
 * Reproductions for the findings of the review of PR #8064 (default borders).
 *
 * Each test asserts the behaviour of the merge base (b289465e09), so a failure
 * here is the bug described in the test name. They are grouped by severity.
 *
 * Findings with no test here, and why:
 *  - borders.ts:851 and borders_clipboard.ts:103 are performance regressions
 *    (header insert cost tracks border position; paste dispatches once per
 *    repeated zone). Both need a benchmark, not an assertion.
 *  - borders.ts:314 (the level-selection block duplicated four times across
 *    borders.ts and default.ts) is a structural finding.
 *  - types/misc.ts:183 (`BorderTopLeft` exported but unreferenced) and
 *    borders_clipboard.ts:35 (a second copy of `toDescr` that cannot currently
 *    diverge) have no observable behaviour to assert.
 *  - worksheet.ts:98 (`rowDefault` has no sheet-default fallback, unlike the
 *    column path) is an asymmetry for which no loss could be reproduced.
 */

const DESC = DEFAULT_BORDER_DESC;
const ALL_BORDER = { top: DESC, bottom: DESC, left: DESC, right: DESC };
const TOP_BORDER = { top: DESC };
const LEFT_BORDER = { left: DESC };

function fullSheetXc(model: Model): string {
  const sheetId = model.getters.getActiveSheetId();
  const lastCol = model.getters.getNumberCols(sheetId) - 1;
  const lastRow = model.getters.getNumberRows(sheetId) - 1;
  return `A1:${toXC(lastCol, lastRow)}`;
}

function wholeColXc(model: Model, col: string): string {
  const sheetId = model.getters.getActiveSheetId();
  return `${col}1:${col}${model.getters.getNumberRows(sheetId)}`;
}

function wholeRowXc(model: Model, row: number): string {
  const sheetId = model.getters.getActiveSheetId();
  return `A${row}:${toXC(model.getters.getNumberCols(sheetId) - 1, row - 1)}`;
}

/** A model carrying an all-around border over the entire sheet. */
function modelWithSheetBorder(): Model {
  const model = new Model();
  setZoneBorders(model, { position: "all" }, [fullSheetXc(model)]);
  return model;
}

function exportImport(model: Model): Model {
  return new Model(model.exportData());
}

/** `exportData()` without the fields that change on every dispatch. */
function stableData(model: Model) {
  const { revisionId, ...data } = model.exportData();
  return data;
}

async function exportToXlsxThenImport(model: Model): Promise<Model> {
  const exported = await model.exportXLSX();
  const dataToImport = {};
  for (const file of exported.files) {
    if (isXLSXExportXMLFile(file)) {
      dataToImport[file.path] = file.content;
      continue;
    }
    dataToImport[file.path] = { imageSrc: file.imageSrc };
  }
  return new Model(dataToImport);
}

describe("blockers", () => {
  test("borders.ts:283 — removing several column groups keeps the untouched borders", () => {
    const model = new Model();
    setZoneBorders(model, { position: "all" }, ["D1"]);

    deleteColumns(model, ["A", "C"]);

    // D1 shifts left twice, to B1.
    expect(getBorder(model, "B1")).toEqual(ALL_BORDER);
  });

  test("borders.ts:283 — removing several row groups keeps the untouched borders", () => {
    const model = new Model();
    setZoneBorders(model, { position: "all" }, ["A4"]);

    deleteRows(model, [0, 2]);

    expect(getBorder(model, "A2")).toEqual(ALL_BORDER);
  });

  test("borders.ts:287 — deleting a column next to a whole-column border keeps its right edge", () => {
    const model = new Model();
    setZoneBorders(model, { position: "all" }, [wholeColXc(model, "B")]);

    deleteColumns(model, ["C"]);

    expect(getBorder(model, "B2")).toEqual(ALL_BORDER);
  });

  test("borders.ts:287 — deleting a row next to a whole-row border keeps its bottom edge", () => {
    const model = new Model();
    setZoneBorders(model, { position: "all" }, [wholeRowXc(model, 2)]);

    deleteRows(model, [2]);

    expect(getBorder(model, "B2")).toEqual(ALL_BORDER);
  });

  test("borders.ts:567 — clearing a whole column clears its vertical borders", () => {
    const model = modelWithSheetBorder();

    clearFormatting(model, wholeColXc(model, "C"));

    expect(getBorder(model, "C3")).toBeNull();
  });

  test("borders.ts:609 — clearing a whole row clears its horizontal borders", () => {
    const model = modelWithSheetBorder();

    clearFormatting(model, wholeRowXc(model, 3));

    expect(getBorder(model, "C3")).toBeNull();
  });

  test("borders.ts:1428 — a sheet-wide border survives an export/import roundtrip", () => {
    const model = modelWithSheetBorder();

    expect(getBorder(exportImport(model), "C3")).toEqual(ALL_BORDER);
  });

  test("data_normalization.ts:109 — a cleared column survives an export/import roundtrip", () => {
    const model = modelWithSheetBorder();
    clearFormatting(model, wholeColXc(model, "C"));

    expect(getBorder(exportImport(model), "C5")).toBeNull();
  });

  test("borders.ts:1411 — exporting to xlsx with an empty override does not throw", async () => {
    const model = modelWithSheetBorder();
    setBordersOnTarget(model, ["C3"], undefined);

    await expect(model.exportXLSX()).resolves.toBeTruthy();
  });

  test("worksheet.ts:160 — a whole-row border survives an xlsx roundtrip", async () => {
    const model = new Model();
    setBordersOnTarget(model, [wholeRowXc(model, 2)], { top: DESC, bottom: DESC });

    const imported = await exportToXlsxThenImport(model);

    expect(getBorder(imported, "C2")).toMatchObject({ top: DESC, bottom: DESC });
  });

  test("borders.ts:843 — inserting a row on a heavily bordered sheet does not overflow the stack", () => {
    // The sheet must be large enough that a 400x400 bordered block stays under
    // half the sheet in both dimensions, so the borders are stored per cell
    // rather than collapsed into a default.
    const model = new Model({ sheets: [{ id: "sh1", colNumber: 1000, rowNumber: 1000 }] });
    setZoneBorders(model, { position: "all" }, [`A1:${toXC(399, 399)}`]);

    expect(() => addRows(model, "before", 500, 1)).not.toThrow();
  }, 120_000);
});

describe("warnings", () => {
  test("borders.ts:1337 — a top-only column default does not gain a bottom border", () => {
    const model = new Model();
    setBordersOnTarget(model, [wholeColXc(model, "C")], TOP_BORDER);

    expect(getBorder(exportImport(model), "C5")).toEqual(TOP_BORDER);
  });

  test("borders.ts:1347 — a left-only row default does not gain a right border", () => {
    const model = new Model();
    setBordersOnTarget(model, [wholeRowXc(model, 3)], LEFT_BORDER);

    expect(getBorder(exportImport(model), "C3")).toEqual(LEFT_BORDER);
  });

  test("borders_clipboard.ts:110 — pasting a zone inheriting a sheet border keeps all four sides", () => {
    const model = modelWithSheetBorder();
    makeStoreWithModel(model, ClipboardStore);
    createSheet(model, { sheetId: "sh2" });
    copy(model, "B2:C3");

    paste(model, "E5");

    expect(getBorder(model, "E5")).toEqual(ALL_BORDER);
  });

  test("commands_helpers — an explicit null border overrides an inherited default", () => {
    const model = modelWithSheetBorder();
    const sheetId = model.getters.getActiveSheetId();

    // The helpers are typed `border?: Border`, so a null side cannot be
    // expressed through them — hence the raw dispatch.
    model.dispatch("SET_BORDERS_ON_TARGET", {
      sheetId,
      target: target("C3"),
      border: { top: null, bottom: null, left: null, right: null },
    });

    expect(getBorder(model, "C3")).toBeNull();
    expect(getBorder(exportImport(model), "C3")).toBeNull();
  });

  test("commands_helpers — an explicit null border survives an xlsx roundtrip", async () => {
    const model = modelWithSheetBorder();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("SET_BORDERS_ON_TARGET", {
      sheetId,
      target: target("C3"),
      border: { top: null, bottom: null, left: null, right: null },
    });

    const imported = await exportToXlsxThenImport(model);

    expect(getBorder(imported, "C3")).toBeNull();
  });

  test("border_default.test.ts — undo/redo restores a column default border", () => {
    const model = new Model();
    const before = stableData(model);
    setBordersOnTarget(model, [wholeColXc(model, "C")], ALL_BORDER);
    const after = stableData(model);

    undo(model);
    expect(stableData(model)).toEqual(before);

    redo(model);
    expect(stableData(model)).toEqual(after);
  });

  test("border_default.test.ts — undo restores a column default after deleting its column", () => {
    const model = new Model();
    setBordersOnTarget(model, [wholeColXc(model, "C")], ALL_BORDER);
    const before = stableData(model);

    deleteColumns(model, ["C"]);
    undo(model);

    expect(stableData(model)).toEqual(before);
  });
});

describe("nits", () => {
  test("border_plugin.test.ts:670 — a duplicated sheet does not share its default borders", () => {
    const model = new Model();
    setBordersOnTarget(model, [wholeColXc(model, "C")], ALL_BORDER);
    const sheetId = model.getters.getActiveSheetId();
    duplicateSheet(model, sheetId, "copy");

    expect(getBorder(model, "C5", "copy")).toEqual(ALL_BORDER);

    // Shifting the original must leave the copy untouched.
    addColumns(model, "before", "A", 1, sheetId);

    expect(getBorder(model, "C5", "copy")).toEqual(ALL_BORDER);
    expect(getBorder(model, "D5", sheetId)).toEqual(ALL_BORDER);
  });

  test("border_plugin.test.ts:993 — getBordersColors reports colors of a column default", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setBordersOnTarget(model, [wholeColXc(model, "C")], {
      top: { style: "thin", color: "#FF0000" },
    });

    expect(model.getters.getBordersColors(sheetId)).toContain("#FF0000");
  });
});
