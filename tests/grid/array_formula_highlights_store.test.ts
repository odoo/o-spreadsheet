import { toZone } from "../../src/helpers";
import { ArrayFormulaHighlight } from "../../src/stores/array_formula_highlight";
import { selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { getHighlightsFromStore } from "../test_helpers/helpers";
import { makeStore } from "../test_helpers/stores";

describe("array function highlights", () => {
  test("Putting the selection inside an array formula highlights it", () => {
    const { model, container } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A2", "=TRANSPOSE(A1:C1)");
    expect(getHighlightsFromStore(container)).toEqual([]);
    const highlight = {
      sheetId: model.getters.getActiveSheetId(),
      zone: toZone("A2:A4"),
      color: "#17A2B8",
      noFill: true,
      thinLine: true,
    };
    selectCell(model, "A2"); // main cell
    expect(getHighlightsFromStore(container)).toEqual([highlight]);
    selectCell(model, "A3"); // array function cell
    expect(getHighlightsFromStore(container)).toEqual([highlight]);
  });

  test("Non-array formula are not highlighted", () => {
    const { model, container } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A2", "=A1");
    selectCell(model, "A2");
    expect(getHighlightsFromStore(container)).toEqual([]);
  });
});
