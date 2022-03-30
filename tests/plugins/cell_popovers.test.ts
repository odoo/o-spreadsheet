import { CommandResult, Model } from "../../src";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../src/constants";
import { merge, setCellContent } from "../test_helpers";

describe("cell popover plugin", () => {
  test("position is snapped when the viewport is scrolled", () => {
    const model = new Model();
    const startColOne = HEADER_WIDTH;
    const startColTwo = startColOne + DEFAULT_CELL_WIDTH;
    setCellContent(model, "A1", "=0/0");
    expect(model.getters.getCellPopover({ col: 0, row: 0 })).toMatchObject({
      coordinates: {
        x: startColTwo,
        y: HEADER_HEIGHT,
      },
    });
    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 2, offsetY: 0 });
    expect(model.getters.getCellPopover({ col: 0, row: 0 })).toMatchObject({
      coordinates: {
        x: startColTwo,
        y: HEADER_HEIGHT,
      },
    });
    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: DEFAULT_CELL_WIDTH + 1, offsetY: 0 });
    expect(model.getters.getCellPopover({ col: 0, row: 0 })).toMatchObject({
      coordinates: {
        x: startColOne,
        y: HEADER_HEIGHT,
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
        x: HEADER_WIDTH,
        y: HEADER_HEIGHT + 2 * DEFAULT_CELL_HEIGHT,
      },
    });
  });

  test("top right position is correct on a merge", () => {
    const model = new Model();
    merge(model, "A1:B2");
    setCellContent(model, "A1", "=0/0");
    expect(model.getters.getCellPopover({ col: 1, row: 1 })).toMatchObject({
      coordinates: {
        x: HEADER_WIDTH + 2 * DEFAULT_CELL_WIDTH,
        y: HEADER_HEIGHT,
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
