import { toCartesian, toXC } from "../../src/helpers";
import { Model } from "../../src/model";
import { CommandResult, Increment, Viewport } from "../../src/types";
import { hideColumns, hideRows, merge, selectCell } from "../test_helpers/commands_helpers";
import { getActiveXc } from "../test_helpers/getters_helpers";

function getViewport(
  model: Model,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number
): Viewport {
  model.dispatch("RESIZE_VIEWPORT", { width, height });
  model.dispatch("SET_VIEWPORT_OFFSET", { offsetX, offsetY });
  return model.getters.getActiveViewport();
}

describe("navigation", () => {
  test("normal move to the right", () => {
    const model = new Model();
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.getters.getPosition()).toEqual([0, 0]);
    expect(model.getters.getSelection().anchor).toEqual([0, 0]);

    model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 1, left: 1, bottom: 0 });
    expect(model.getters.getPosition()).toEqual([1, 0]);
    expect(model.getters.getSelection().anchor).toEqual([1, 0]);
  });

  test("move up from top row", () => {
    const model = new Model();
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.getters.getPosition()).toEqual([0, 0]);

    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -1 });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.getters.getPosition()).toEqual([0, 0]);
  });

  test("move right from right row", () => {
    const model = new Model();
    const activeSheet = model.getters.getActiveSheet();
    const colNumber = activeSheet.cols.length;
    selectCell(model, toXC(colNumber - 1, 0));

    expect(model.getters.getPosition()).toEqual([colNumber - 1, 0]);
    model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });
    expect(model.getters.getPosition()).toEqual([colNumber - 1, 0]);
  });

  test("move bottom from bottom row", () => {
    const model = new Model();
    const activeSheet = model.getters.getActiveSheet();
    const rowNumber = activeSheet.rows.length;
    selectCell(model, toXC(0, rowNumber - 1));
    expect(model.getters.getPosition()).toEqual([0, rowNumber - 1]);
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: 1 });
    expect(model.getters.getPosition()).toEqual([0, rowNumber - 1]);
  });

  test("move bottom from merge in last position", () => {
    const model = new Model();
    const activeSheet = model.getters.getActiveSheet();
    const rowNumber = activeSheet.rows.length;
    model.dispatch("ADD_MERGE", {
      sheetId: activeSheet.id,
      target: [{ top: rowNumber - 2, bottom: rowNumber - 1, left: 0, right: 0 }],
    });
    selectCell(model, toXC(0, rowNumber - 2));
    expect(model.getters.getPosition()).toEqual([0, rowNumber - 2]);
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: 1 });
    expect(model.getters.getPosition()).toEqual([0, rowNumber - 2]);
  });

  test("Cannot move bottom from merge in last position if last row is hidden", () => {
    const model = new Model();
    const activeSheet = model.getters.getActiveSheet();
    const rowNumber = activeSheet.rows.length;
    model.dispatch("ADD_MERGE", {
      sheetId: activeSheet.id,
      target: [{ top: rowNumber - 3, bottom: rowNumber - 2, left: 0, right: 0 }],
    });
    model.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: activeSheet.id,
      dimension: "ROW",
      elements: [rowNumber - 1],
    });
    selectCell(model, toXC(0, rowNumber - 3));
    expect(model.getters.getPosition()).toEqual([0, rowNumber - 3]);
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: 1 });
    expect(model.getters.getPosition()).toEqual([0, rowNumber - 3]);
  });

  test("move right from merge in last position", () => {
    const model = new Model();
    const activeSheet = model.getters.getActiveSheet();
    const colNumber = activeSheet.cols.length;
    model.dispatch("ADD_MERGE", {
      sheetId: activeSheet.id,
      target: [{ top: 0, bottom: 0, left: colNumber - 2, right: colNumber - 1 }],
    });
    selectCell(model, toXC(colNumber - 2, 0));
    expect(model.getters.getPosition()).toEqual([colNumber - 2, 0]);
    model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });
    expect(model.getters.getPosition()).toEqual([colNumber - 2, 0]);
  });

  test("move in and out of a merge", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"],
        },
      ],
    });
    expect(model.getters.getPosition()).toEqual([0, 0]);

    // move to the right, inside the merge
    model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.getters.getPosition()).toEqual([1, 0]);

    // move to the right, outside the merge
    model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 3, left: 3, bottom: 0 });
    expect(model.getters.getPosition()).toEqual([3, 0]);
    expect(getActiveXc(model)).toBe("D1");
  });

  test("do nothing if moving out of merge is out of grid", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"],
        },
      ],
    });
    expect(model.getters.getPosition()).toEqual([0, 0]);

    // put selection below merge
    selectCell(model, "B3");

    // enter merge from below
    expect(getActiveXc(model)).toBe("B3");
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -1 });
    expect(getActiveXc(model)).toBe("B2");

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.getters.getPosition()).toEqual([1, 1]);

    // move to the top, outside the merge
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -1 });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.getters.getPosition()).toEqual([1, 1]);
  });

  test("move right from right col (of the viewport)", () => {
    const model = new Model();
    let viewport = getViewport(model, 600, 300, 0, 0);
    expect(viewport.left).toBe(0);
    expect(viewport.right).toBe(5);

    selectCell(model, "E1");
    viewport = model.getters.getActiveViewport();
    expect(viewport.left).toBe(0);
    expect(viewport.right).toBe(5);

    selectCell(model, "F1");
    viewport = model.getters.getActiveViewport();
    expect(viewport.left).toBe(1);
    expect(viewport.right).toBe(6);
  });

  test("move left from left col (of the viewport)", () => {
    const model = new Model();
    let viewport = getViewport(model, 600, 300, 100, 0);
    expect(viewport.left).toBe(1);
    expect(viewport.right).toBe(6);

    selectCell(model, "B1");
    viewport = model.getters.getActiveViewport();
    expect(viewport.left).toBe(1);
    expect(viewport.right).toBe(6);

    selectCell(model, "A1");
    viewport = model.getters.getActiveViewport();
    expect(viewport.left).toBe(0);
    expect(viewport.right).toBe(5);
  });

  test("move bottom from bottom row (of the viewport)", () => {
    const model = new Model();
    let viewport = getViewport(model, 600, 300, 0, 0);
    expect(viewport.top).toBe(0);
    expect(viewport.bottom).toBe(11);

    selectCell(model, "A11");
    viewport = model.getters.getActiveViewport();
    expect(viewport.top).toBe(0);
    expect(viewport.bottom).toBe(11);

    selectCell(model, "A12");
    viewport = model.getters.getActiveViewport();
    expect(viewport.top).toBe(1);
    expect(viewport.bottom).toBe(12);
  });

  test("move top from top row (of the viewport)", () => {
    const model = new Model();
    let viewport = getViewport(model, 600, 300, 0, 60);
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(14);

    selectCell(model, "A3");
    viewport = model.getters.getActiveViewport();
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(14);

    selectCell(model, "A2");
    viewport = model.getters.getActiveViewport();
    expect(viewport.top).toBe(1);
    expect(viewport.bottom).toBe(12);
  });

  test("move top from top row (of the viewport) with a merge", () => {
    const model = new Model();
    let viewport = getViewport(model, 600, 300, 0, 60);
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(14);

    merge(model, "A1:A2");

    selectCell(model, "A3");
    viewport = model.getters.getActiveViewport();
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(14);

    selectCell(model, "A2");
    viewport = model.getters.getActiveViewport();
    expect(viewport.top).toBe(0);
    expect(viewport.bottom).toBe(11);
  });

  test("move through hidden column", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 1,
          cols: { 2: { isHidden: true } },
        },
      ],
    });
    //from the right
    model.dispatch("SELECT_CELL", { col: 3, row: 0 });
    model.dispatch("MOVE_POSITION", { deltaX: -1, deltaY: 0 });
    expect(model.getters.getPosition()).toEqual(toCartesian("B1"));
    //from the left
    model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });
    expect(model.getters.getPosition()).toEqual(toCartesian("D1"));
  });

  test("don't move through hidden col if out of grid", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 1,
          cols: { 0: { isHidden: true }, 4: { isHidden: true } },
        },
      ],
    });
    // move left from the first visible column
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("MOVE_POSITION", { deltaX: -1, deltaY: 0 });
    expect(model.getters.getPosition()).toEqual(toCartesian("B1"));
    // move right from last visible column
    model.dispatch("SELECT_CELL", { col: 3, row: 0 });
    model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });
    expect(model.getters.getPosition()).toEqual(toCartesian("D1"));
  });

  test("move through hidden row", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 1,
          rowNumber: 5,
          rows: { 2: { isHidden: true } },
        },
      ],
    });
    //from the bottom
    model.dispatch("SELECT_CELL", {
      col: 0,
      row: 3,
    });
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -1 });
    expect(model.getters.getPosition()).toEqual(toCartesian("A2"));
    //from the top
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: 1 });
    expect(model.getters.getPosition()).toEqual(toCartesian("A4"));
  });
});

describe("Navigation starting from hidden cells", () => {
  test("Cannot move position horizontally from hidden row", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 2,
        },
      ],
    });
    selectCell(model, "C1");
    hideRows(model, [0]);
    const move1 = model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });
    expect(move1).toBe(CommandResult.SelectionOutOfBound);
    const move2 = model.dispatch("MOVE_POSITION", { deltaX: -1, deltaY: 0 });
    expect(move2).toBe(CommandResult.SelectionOutOfBound);
  });

  test("Cannot move position vertically from hidden column", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 2,
        },
      ],
    });
    selectCell(model, "C1");
    hideColumns(model, ["C"]);
    const move1 = model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: 1 });
    expect(move1).toBe(CommandResult.SelectionOutOfBound);
    const move2 = model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -1 });
    expect(move2).toBe(CommandResult.SelectionOutOfBound);
  });

  test.each([
    [["A"], "A1", 1, "B1"], // move right from A1 if column A is hidden => B1
    [["A", "B"], "A1", 1, "C1"], // move right from A1 if columns A and B are hidden => C1
    [["A"], "A1", -1, "B1"], // move left from A1 if column A is hidden => B1
    [["A", "B"], "A1", -1, "C1"], // move left from A1 if column A and B are hidden => C1
    [["A", "B"], "B1", -1, "C1"], // move left from B1 if column A and B are hidden => C1

    [["Z"], "Z1", -1, "Y1"], // move left from Z1 if column Z is hidden => Y1
    [["Y", "Z"], "Z1", -1, "X1"], // move left from Z1 if column Y and Z are hidden => X1
    [["Z"], "Z1", 1, "Y1"], // move right from Z1 if column Z is hidden => Y1
    [["Y", "Z"], "Z1", 1, "X1"], // move right from Z1 if column Y and Z are hidden => X1
    [["Y", "Z"], "Y1", 1, "X1"], // move right from Y1 if column Y and Z are hidden => X1
  ])(
    "Move from position horizontally from hidden col",
    (hiddenCols, startPosition, delta, endPosition) => {
      const model = new Model();
      selectCell(model, startPosition);
      hideColumns(model, hiddenCols);
      model.dispatch("MOVE_POSITION", { deltaX: delta as Increment, deltaY: 0 });
      expect(model.getters.getPosition()).toEqual(toCartesian(endPosition));
    }
  );
  test.each([
    [[0], "A1", 1, "A2"], // move bottom from A1 if row 1 is hidden => A2
    [[0, 1], "A1", 1, "A3"], // move bottom from A1 if rows 1 and 2 are hidden => A3
    [[0], "A1", -1, "A2"], // move top from A1 if row 1 is hidden => A2
    [[0, 1], "A1", -1, "A3"], // move top from A1 if rows 1 and 2 are hidden => A3
    [[0, 1], "A2", -1, "A3"], // move top from A2 if rows 1 and 2 are hidden => A3

    [[99], "A100", -1, "A99"], // move top from A100 if row 100 is hidden => A99
    [[98, 99], "A100", -1, "A98"], // move top from A100 if rows 99 and 100 are hidden => A98
    [[99], "A100", 1, "A99"], // move bottom from A100 if row 100 is hidden => A99
    [[98, 99], "A100", 1, "A98"], // move bottom from A100 if rows 99 and 100 are hidden => A98
    [[98, 99], "A99", 1, "A98"], // move bottom from A99 if rows 99 and 100 are hidden => A98
  ])(
    "Move from position vertically from hidden col",
    (hiddenRows, startPosition, delta, endPosition) => {
      const model = new Model();
      selectCell(model, startPosition);
      hideRows(model, hiddenRows);
      model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: delta as Increment });
      expect(model.getters.getPosition()).toEqual(toCartesian(endPosition));
    }
  );
});
