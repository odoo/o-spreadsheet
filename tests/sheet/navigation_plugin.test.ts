import { toCartesian, toXC } from "../../src/helpers";
import { Model } from "../../src/model";
import { CommandResult, Direction, Viewport } from "../../src/types";
import {
  hideColumns,
  hideRows,
  merge,
  moveAnchorCell,
  selectCell,
  setViewportOffset,
} from "../test_helpers/commands_helpers";
import { getActivePosition, getSelectionAnchorCellXc } from "../test_helpers/getters_helpers";

function getViewport(
  model: Model,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number
): Viewport {
  model.dispatch("RESIZE_SHEETVIEW", { width, height, gridOffsetX: 0, gridOffsetY: 0 });
  setViewportOffset(model, offsetX, offsetY);
  return model.getters.getActiveMainViewport();
}

describe("navigation", () => {
  test("normal move to the right", () => {
    const model = Model.BuildSync();
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(getActivePosition(model)).toBe("A1");
    expect(model.getters.getSelection().anchor.cell).toEqual(toCartesian("A1"));

    moveAnchorCell(model, "right");
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 1, left: 1, bottom: 0 });
    expect(getActivePosition(model)).toBe("B1");
    expect(model.getters.getSelection().anchor.cell).toEqual(toCartesian("B1"));
  });

  test("move up from top row", () => {
    const model = Model.BuildSync();
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(getActivePosition(model)).toBe("A1");

    moveAnchorCell(model, "up");
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(getActivePosition(model)).toBe("A1");
  });

  test("move right from right row", () => {
    const model = Model.BuildSync();
    const activeSheetId = model.getters.getActiveSheetId();
    const colNumber = model.getters.getNumberCols(activeSheetId);
    const xc = toXC(colNumber - 1, 0);
    selectCell(model, xc);

    expect(getActivePosition(model)).toBe(xc);
    moveAnchorCell(model, "right");
    expect(getActivePosition(model)).toBe(xc);
  });

  test("move bottom from bottom row", () => {
    const model = Model.BuildSync();
    const activeSheetId = model.getters.getActiveSheetId();
    const rowNumber = model.getters.getNumberRows(activeSheetId);
    const xc = toXC(0, rowNumber - 1);
    selectCell(model, xc);
    expect(getActivePosition(model)).toBe(xc);
    moveAnchorCell(model, "down");
    expect(getActivePosition(model)).toBe(xc);
  });

  test("move bottom from merge in last position", () => {
    const model = Model.BuildSync();
    const activeSheetId = model.getters.getActiveSheetId();
    const rowNumber = model.getters.getNumberRows(activeSheetId);
    model.dispatch("ADD_MERGE", {
      sheetId: activeSheetId,
      target: [{ top: rowNumber - 2, bottom: rowNumber - 1, left: 0, right: 0 }],
    });
    const xc = toXC(0, rowNumber - 2);
    selectCell(model, xc);
    expect(getActivePosition(model)).toBe(xc);
    moveAnchorCell(model, "down");
    expect(getActivePosition(model)).toBe(xc);
  });

  test("Cannot move bottom from merge in last position if last row is hidden", () => {
    const model = Model.BuildSync();
    const activeSheetId = model.getters.getActiveSheetId();
    const rowNumber = model.getters.getNumberRows(activeSheetId);
    model.dispatch("ADD_MERGE", {
      sheetId: activeSheetId,
      target: [{ top: rowNumber - 3, bottom: rowNumber - 2, left: 0, right: 0 }],
    });
    model.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: activeSheetId,
      dimension: "ROW",
      elements: [rowNumber - 1],
    });
    const xc = toXC(0, rowNumber - 3);
    selectCell(model, xc);
    expect(getActivePosition(model)).toBe(xc);
    moveAnchorCell(model, "down");
    expect(getActivePosition(model)).toBe(xc);
  });

  test("move right from merge in last position", () => {
    const model = Model.BuildSync();
    const activeSheetId = model.getters.getActiveSheetId();
    const colNumber = model.getters.getNumberCols(activeSheetId);
    model.dispatch("ADD_MERGE", {
      sheetId: activeSheetId,
      target: [{ top: 0, bottom: 0, left: colNumber - 2, right: colNumber - 1 }],
    });
    const xc = toXC(colNumber - 2, 0);
    selectCell(model, xc);
    expect(getActivePosition(model)).toBe(xc);
    moveAnchorCell(model, "right");
    expect(getActivePosition(model)).toBe(xc);
  });

  test("move in and out of a merge", () => {
    const model = Model.BuildSync({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["B1:C2"] }],
    });
    expect(getActivePosition(model)).toBe("A1");

    // move to the right, inside the merge
    moveAnchorCell(model, "right");

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(getActivePosition(model)).toBe("B1");

    // move to the right, outside the merge
    moveAnchorCell(model, "right");
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 3, left: 3, bottom: 0 });
    expect(getActivePosition(model)).toBe("D1");
    expect(getSelectionAnchorCellXc(model)).toBe("D1");
  });

  test("do nothing if moving out of merge is out of grid", () => {
    const model = Model.BuildSync({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["B1:C2"] }],
    });
    expect(getSelectionAnchorCellXc(model)).toEqual("A1");

    // put selection below merge
    selectCell(model, "B3");

    // enter merge from below
    expect(getSelectionAnchorCellXc(model)).toBe("B3");
    moveAnchorCell(model, "up");
    expect(getSelectionAnchorCellXc(model)).toBe("B2");

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(getSelectionAnchorCellXc(model)).toEqual("B2");

    // move to the top, outside the merge
    moveAnchorCell(model, "up");
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(getSelectionAnchorCellXc(model)).toEqual("B2");
  });

  test("move right from right col (of the viewport)", () => {
    const model = Model.BuildSync();
    let viewport = getViewport(model, 600, 300, 0, 0);
    expect(viewport.left).toBe(0);
    expect(viewport.right).toBe(6);

    selectCell(model, "E1");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.left).toBe(0);
    expect(viewport.right).toBe(6);

    selectCell(model, "G1");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.left).toBe(1);
    expect(viewport.right).toBe(7);
  });

  test("move left from left col (of the viewport)", () => {
    const model = Model.BuildSync();
    let viewport = getViewport(model, 600, 300, 100, 0);
    expect(viewport.left).toBe(1);
    expect(viewport.right).toBe(7);

    selectCell(model, "B1");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.left).toBe(1);
    expect(viewport.right).toBe(7);

    selectCell(model, "A1");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.left).toBe(0);
    expect(viewport.right).toBe(6);
  });

  test("move bottom from bottom row (of the viewport)", () => {
    const model = Model.BuildSync();
    let viewport = getViewport(model, 600, 300, 0, 0);
    expect(viewport.top).toBe(0);
    expect(viewport.bottom).toBe(13);

    selectCell(model, "A13");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.top).toBe(0);
    expect(viewport.bottom).toBe(13);

    selectCell(model, "A14");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.top).toBe(1);
    expect(viewport.bottom).toBe(14);
  });

  test("move top from top row (of the viewport)", () => {
    const model = Model.BuildSync();
    let viewport = getViewport(model, 600, 300, 0, 60);
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(15);

    selectCell(model, "A3");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(15);

    selectCell(model, "A2");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.top).toBe(1);
    expect(viewport.bottom).toBe(14);
  });

  test("move top from top row (of the viewport) with a merge", () => {
    const model = Model.BuildSync();
    let viewport = getViewport(model, 600, 300, 0, 60);
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(15);

    merge(model, "A1:A2");

    selectCell(model, "A3");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(15);

    selectCell(model, "A2");
    viewport = model.getters.getActiveMainViewport();
    expect(viewport.top).toBe(0);
    expect(viewport.bottom).toBe(13);
  });

  test("move through hidden column", () => {
    const model = Model.BuildSync({
      sheets: [{ colNumber: 5, rowNumber: 1, cols: { 2: { isHidden: true } } }],
    });
    //from the right
    selectCell(model, "D1");
    moveAnchorCell(model, "left");
    expect(getActivePosition(model)).toBe("B1");
    //from the left
    moveAnchorCell(model, "right");
    expect(getActivePosition(model)).toBe("D1");
  });

  test("don't move through hidden col if out of grid", () => {
    const model = Model.BuildSync({
      sheets: [
        { colNumber: 5, rowNumber: 1, cols: { 0: { isHidden: true }, 4: { isHidden: true } } },
      ],
    });
    // move left from the first visible column
    selectCell(model, "B1");
    moveAnchorCell(model, "left");
    expect(getActivePosition(model)).toBe("B1");
    // move right from last visible column
    selectCell(model, "D1");
    moveAnchorCell(model, "right");
    expect(getActivePosition(model)).toBe("D1");
  });

  test("move through hidden row", () => {
    const model = Model.BuildSync({
      sheets: [{ colNumber: 1, rowNumber: 5, rows: { 2: { isHidden: true } } }],
    });
    selectCell(model, "A4");
    moveAnchorCell(model, "up");
    expect(getActivePosition(model)).toBe("A2");
    //from the top
    moveAnchorCell(model, "down");
    expect(getActivePosition(model)).toBe("A4");
  });
});

describe("Navigation starting from hidden cells", () => {
  test("Cannot move position horizontally from hidden row", () => {
    const model = Model.BuildSync({ sheets: [{ colNumber: 5, rowNumber: 2 }] });
    selectCell(model, "C1");
    hideRows(model, [0]);
    const move1 = moveAnchorCell(model, "right");
    expect(move1).toBeCancelledBecause(CommandResult.SelectionOutOfBound);
    const move2 = moveAnchorCell(model, "left");
    expect(move2).toBeCancelledBecause(CommandResult.SelectionOutOfBound);
  });

  test("Cannot move position vertically from hidden column", () => {
    const model = Model.BuildSync({ sheets: [{ colNumber: 5, rowNumber: 2 }] });
    selectCell(model, "C1");
    hideColumns(model, ["C"]);
    const move1 = moveAnchorCell(model, "down");
    expect(move1).toBeCancelledBecause(CommandResult.SelectionOutOfBound);
    const move2 = moveAnchorCell(model, "up");
    expect(move2).toBeCancelledBecause(CommandResult.SelectionOutOfBound);
  });

  test.each([
    [["A"], "A1", "right", "B1"], // move right from A1 if column A is hidden => B1
    [["A", "B"], "A1", "right", "C1"], // move right from A1 if columns A and B are hidden => C1
    [["A"], "A1", "left", "B1"], // move left from A1 if column A is hidden => B1
    [["A", "B"], "A1", "left", "C1"], // move left from A1 if column A and B are hidden => C1
    [["A", "B"], "B1", "left", "C1"], // move left from B1 if column A and B are hidden => C1

    [["Z"], "Z1", "left", "Y1"], // move left from Z1 if column Z is hidden => Y1
    [["Y", "Z"], "Z1", "left", "X1"], // move left from Z1 if column Y and Z are hidden => X1
    [["Z"], "Z1", "right", "Y1"], // move right from Z1 if column Z is hidden => Y1
    [["Y", "Z"], "Z1", "right", "X1"], // move right from Z1 if column Y and Z are hidden => X1
    [["Y", "Z"], "Y1", "right", "X1"], // move right from Y1 if column Y and Z are hidden => X1
  ])(
    "Move from position horizontally from hidden col",
    (hiddenCols, startPosition, direction, endPosition) => {
      const model = Model.BuildSync();
      selectCell(model, startPosition);
      hideColumns(model, hiddenCols);
      moveAnchorCell(model, direction as Direction);
      expect(getActivePosition(model)).toBe(endPosition);
    }
  );
  test.each([
    [[0], "A1", "down", "A2"], // move bottom from A1 if row 1 is hidden => A2
    [[0, 1], "A1", "down", "A3"], // move bottom from A1 if rows 1 and 2 are hidden => A3
    [[0], "A1", "up", "A2"], // move top from A1 if row 1 is hidden => A2
    [[0, 1], "A1", "up", "A3"], // move top from A1 if rows 1 and 2 are hidden => A3
    [[0, 1], "A2", "up", "A3"], // move top from A2 if rows 1 and 2 are hidden => A3

    [[99], "A100", "up", "A99"], // move top from A100 if row 100 is hidden => A99
    [[98, 99], "A100", "up", "A98"], // move top from A100 if rows 99 and 100 are hidden => A98
    [[99], "A100", "down", "A99"], // move bottom from A100 if row 100 is hidden => A99
    [[98, 99], "A100", "down", "A98"], // move bottom from A100 if rows 99 and 100 are hidden => A98
    [[98, 99], "A99", "down", "A98"], // move bottom from A99 if rows 99 and 100 are hidden => A98
  ])(
    "Move from position vertically from hidden col",
    (hiddenRows, startPosition, direction, endPosition) => {
      const model = Model.BuildSync();
      selectCell(model, startPosition);
      hideRows(model, hiddenRows);
      moveAnchorCell(model, direction as Direction);
      expect(getActivePosition(model)).toBe(endPosition);
    }
  );

  test("Cannot from zero or negative steps does nothing", () => {
    const model = Model.BuildSync({ sheets: [{ colNumber: 5, rowNumber: 2 }] });
    selectCell(model, "C1");
    hideColumns(model, ["C"]);
    const move1 = moveAnchorCell(model, "down", 0);
    expect(move1).toBeCancelledBecause(CommandResult.InvalidSelectionStep);
    const move2 = moveAnchorCell(model, "up", -1);
    expect(move2).toBeCancelledBecause(CommandResult.InvalidSelectionStep);
    const move3 = moveAnchorCell(model, "right", -2);
    expect(move3).toBeCancelledBecause(CommandResult.InvalidSelectionStep);
    const move4 = moveAnchorCell(model, "left", -3);
    expect(move4).toBeCancelledBecause(CommandResult.InvalidSelectionStep);
  });
});
