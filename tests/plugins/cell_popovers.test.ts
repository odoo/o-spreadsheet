import { CommandResult, Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { merge, setCellContent } from "../test_helpers";

describe("cell popover plugin", () => {
  test("position is snapped when the viewport is scrolled", () => {
    const model = new Model();
    const startColOne = 0;
    const startColTwo = startColOne + DEFAULT_CELL_WIDTH;
    setCellContent(model, "A1", "=0/0");
    expect(model.getters.getCellPopover({ col: 0, row: 0 })).toMatchObject({
      coordinates: {
        x: startColTwo,
        y: 0,
      },
    });
    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 2, offsetY: 0 });
    expect(model.getters.getCellPopover({ col: 0, row: 0 })).toMatchObject({
      coordinates: {
        x: startColTwo,
        y: 0,
      },
    });
  });

  test("bottom left position is correct on a merge", () => {
    const model = new Model();
    merge(model, "A1:B2");
    model.dispatch("OPEN_CELL_POPOVER", {
      col: 0,
      row: 0,
      popoverType: "LinkEditor",
    });
    expect(model.getters.getCellPopover({ col: 1, row: 1 })).toMatchObject({
      coordinates: {
        x: 0,
        y: 2 * DEFAULT_CELL_HEIGHT,
      },
    });
  });

  test("top right position is correct on a merge", () => {
    const model = new Model();
    merge(model, "A1:B2");
    setCellContent(model, "A1", "=0/0");
    expect(model.getters.getCellPopover({ col: 1, row: 1 })).toMatchObject({
      coordinates: {
        x: 2 * DEFAULT_CELL_WIDTH,
        y: 0,
      },
    });
  });

  test("cannot open popover which does not exists", () => {
    const model = new Model();
    const result = model.dispatch("OPEN_CELL_POPOVER", {
      col: 0,
      row: 0,
      popoverType: "This doesn't exist",
    });
    expect(result).toBeCancelledBecause(CommandResult.InvalidCellPopover);
  });
});
