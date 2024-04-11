import { Model, SpreadsheetChildEnv } from "../../src";
import { cellMenuRegistry } from "../../src/registries";
import { selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { makeTestEnv } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

describe("Pivot menu items", () => {
  let model: Model;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    env = makeTestEnv();
    model = env.model;
  });
  test("It should not display pivot_properties if there is no pivot in the cell", () => {
    selectCell(model, "A1");
    expect(model.getters.getPivotIdFromPosition(model.getters.getActivePosition())).toBeUndefined();
    expect(cellMenuRegistry.get("pivot_properties").isVisible!(env)).toBe(false);
  });

  test("It should display pivot_properties if there is a pivot in the cell", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    setCellContent(model, "A1", `=PIVOT("1")`);
    expect(model.getters.getPivotIdFromPosition(model.getters.getActivePosition())).toBe("1");
    expect(cellMenuRegistry.get("pivot_properties").isVisible!(env)).toBe(true);
  });

  test("It should not display pivot_properties if the pivot does not exist", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    setCellContent(model, "A1", `=PIVOT("2")`);
    expect(model.getters.getPivotIdFromPosition(model.getters.getActivePosition())).toBeUndefined();
    expect(cellMenuRegistry.get("pivot_properties").isVisible!(env)).toBe(false);
  });

  test("It should display pivot_properties if there are multiple pivots in the cell", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    addPivot(model, "M1:N1", {}, "2");
    setCellContent(model, "A1", `=PIVOT("1") + PIVOT("2")`);
    expect(model.getters.getPivotIdFromPosition(model.getters.getActivePosition())).toBe("1");
    expect(cellMenuRegistry.get("pivot_properties").isVisible!(env)).toBe(true);
  });

  test("It should open the pivot side panel when clicking on pivot_properties", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    setCellContent(model, "A1", `=PIVOT("1")`);
    const openSidePanel = jest.spyOn(env, "openSidePanel");
    cellMenuRegistry.get("pivot_properties").execute!(env);
    expect(openSidePanel).toHaveBeenCalledWith("PivotSidePanel", { pivotId: "1" });
  });

  test("It should open the pivot side panel when clicking on pivot_properties with the first pivot id", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    addPivot(model, "M1:N1", {}, "2");
    setCellContent(model, "A1", `=PIVOT("1") + PIVOT("2")`);
    const openSidePanel = jest.spyOn(env, "openSidePanel");
    cellMenuRegistry.get("pivot_properties").execute!(env);
    expect(openSidePanel).toHaveBeenCalledWith("PivotSidePanel", { pivotId: "1" });
  });
});
