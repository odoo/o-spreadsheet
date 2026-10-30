import { toZone } from "../../src/helpers/zones";
import { ArrayFormulaHighlight } from "../../src/stores/array_formula_highlight";
import { selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { flattenHighlightRange, getHighlightsFromPlugin, setGrid } from "../test_helpers/helpers";
import { addPivot, updatePivot } from "../test_helpers/pivot_helpers";
import { makeStore } from "../test_helpers/stores";

describe("array function highlights", () => {
  test("Putting the selection inside an array formula highlights it", () => {
    const { model, getPlugin } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A2", "=TRANSPOSE(A1:C1)");
    expect(getHighlightsFromPlugin(getPlugin)).toEqual([]);
    const highlight = {
      sheetId: model.getters.getActiveSheetId(),
      zone: toZone("A2:A4"),
      color: "#17A2B8",
      noFill: true,
      thinLine: true,
      dashed: false,
    };
    selectCell(model, "A2"); // main cell
    expect(getHighlightsFromPlugin(getPlugin).map(flattenHighlightRange)).toEqual([highlight]);
    selectCell(model, "A3"); // array function cell
    expect(getHighlightsFromPlugin(getPlugin).map(flattenHighlightRange)).toEqual([highlight]);
  });

  test("Selecting an array formula that cannot spill is still highlighted", () => {
    const { model, getPlugin } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A2", "=TRANSPOSE(A1:C1)");
    setCellContent(model, "A4", "blocking the spread");
    expect(getHighlightsFromPlugin(getPlugin)).toEqual([]);
    selectCell(model, "A2"); // main cell
    expect(getHighlightsFromPlugin(getPlugin).map(flattenHighlightRange)).toEqual([
      {
        sheetId: model.getters.getActiveSheetId(),
        zone: toZone("A2:A4"),
        color: "#17A2B8",
        noFill: true,
        thinLine: true,
        dashed: true,
      },
    ]);
    selectCell(model, "A3"); // no highlight as the function does not spill
    expect(getHighlightsFromPlugin(getPlugin)).toEqual([]);
  });

  test("Non-array formula are not highlighted", () => {
    const { model, getPlugin } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A2", "=A1");
    selectCell(model, "A2");
    expect(getHighlightsFromPlugin(getPlugin)).toEqual([]);
  });

  test("Array formula using a spill error is not highlighted as blocked", () => {
    const { model, getPlugin } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A1", "=MUNIT(2)");
    setCellContent(model, "A2", "5"); // block the spread of A1
    setCellContent(model, "A4", "=A1:B2");

    const highlight = {
      sheetId: model.getters.getActiveSheetId(),
      zone: toZone("A4:B5"),
      color: "#17A2B8",
      noFill: true,
      thinLine: true,
      dashed: false,
    };

    selectCell(model, "A4");
    expect(getHighlightsFromPlugin(getPlugin).map(flattenHighlightRange)).toEqual([highlight]);
  });

  test("Selecting an array formula that cannot spill is still highlighted", () => {
    const { model, getPlugin } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A2", "=TRANSPOSE(A1:C1)");
    setCellContent(model, "A4", "blocking the spread");
    expect(getHighlightsFromPlugin(getPlugin)).toEqual([]);
    selectCell(model, "A2"); // main cell
    expect(getHighlightsFromPlugin(getPlugin).map(flattenHighlightRange)).toEqual([
      {
        sheetId: model.getters.getActiveSheetId(),
        zone: toZone("A2:A4"),
        color: "#17A2B8",
        noFill: true,
        thinLine: true,
        dashed: true,
      },
    ]);
    selectCell(model, "A3"); // no highlight as the function does not spill
    expect(getHighlightsFromPlugin(getPlugin)).toEqual([]);
  });

  test("Selecting an styled pivot does not highlight it", () => {
    const { model, getPlugin } = makeStore(ArrayFormulaHighlight);
    setGrid(model, { A1: "Header1", B1: "Header2", A2: "Data1", B2: "Data2", F1: "=PIVOT(1)" });
    addPivot(model, "A1:B2", { style: { tableStyleId: "None" } }, "pivotId");

    selectCell(model, "F1");
    expect(getHighlightsFromPlugin(getPlugin)).toMatchObject([
      { range: { zone: toZone("F1:F3") } },
    ]);

    updatePivot(model, "pivotId", { style: { tableStyleId: "PivotTableStyleMedium9" } });
    expect(getHighlightsFromPlugin(getPlugin)).toEqual([]);
  });
});
