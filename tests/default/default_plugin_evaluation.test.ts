import { Model } from "../../src";
import { setCellContent } from "../test_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";

describe("setting a default format re-evaluates the cells inheriting it", () => {
  test("sheet default", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "1");

    model.dispatch("SET_SHEET_DEFAULT_FORMAT", { sheetId, format: "0.00%" });

    expect(getCellContent(model, "A1")).toBe("100.00%");
  });

  test("column default", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "1");
    setCellContent(model, "B1", "1");

    model.dispatch("SET_HEADERS_DEFAULT_FORMAT", {
      sheetId,
      dimension: "COL",
      elements: [1],
      format: "0.00%",
    });

    expect(getCellContent(model, "B1")).toBe("100.00%");
    expect(getCellContent(model, "A1")).toBe("1");
  });
});
