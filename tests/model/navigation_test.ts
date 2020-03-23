import { DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT } from "../../src/constants";
import { CURRENT_VERSION, GridModel } from "../../src/model/index";
import "../canvas.mock";

describe("navigation", () => {
  test("normal move to the right", () => {
    const model = new GridModel();
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.workbook.activeCol).toBe(0);
    expect(model.workbook.activeRow).toBe(0);
    expect(model.workbook.selection.anchor.col).toBe(0);
    expect(model.workbook.selection.anchor.row).toBe(0);

    model.dispatch({ type: "MOVE_POSITION", deltaX: 1, deltaY: 0 });
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 1, left: 1, bottom: 0 });
    expect(model.workbook.activeCol).toBe(1);
    expect(model.workbook.activeRow).toBe(0);
    expect(model.workbook.selection.anchor.col).toBe(1);
    expect(model.workbook.selection.anchor.row).toBe(0);
  });

  test("move up from top row", () => {
    const model = new GridModel();
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.workbook.activeCol).toBe(0);
    expect(model.workbook.activeRow).toBe(0);

    model.dispatch({ type: "MOVE_POSITION", deltaX: 0, deltaY: -1 });
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.workbook.activeCol).toBe(0);
    expect(model.workbook.activeRow).toBe(0);
  });

  test("move right from right row", () => {
    const model = new GridModel();
    const colNumber = model.workbook.cols.length;
    model.dispatch({ type: "SELECT_CELL", col: colNumber - 1, row: 0 });

    expect(model.workbook.activeCol).toBe(colNumber - 1);
    model.dispatch({ type: "MOVE_POSITION", deltaX: 1, deltaY: 0 });
    expect(model.workbook.activeCol).toBe(colNumber - 1);
  });

  test("move bottom from bottom row", () => {
    const model = new GridModel();
    const rowNumber = model.workbook.rows.length;
    model.dispatch({ type: "SELECT_CELL", col: 0, row: rowNumber - 1 });
    expect(model.workbook.activeRow).toBe(rowNumber - 1);
    model.dispatch({ type: "MOVE_POSITION", deltaX: 0, deltaY: 1 });
    expect(model.workbook.activeRow).toBe(rowNumber - 1);
  });

  test("move in and out of a merge", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"]
        }
      ]
    });
    expect(model.workbook.activeCol).toBe(0);
    expect(model.workbook.activeRow).toBe(0);

    // move to the right, inside the merge
    model.dispatch({ type: "MOVE_POSITION", deltaX: 1, deltaY: 0 });

    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.workbook.activeCol).toBe(1);
    expect(model.workbook.activeRow).toBe(0);

    // move to the right, outside the merge
    model.dispatch({ type: "MOVE_POSITION", deltaX: 1, deltaY: 0 });
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 3, left: 3, bottom: 0 });
    expect(model.workbook.activeCol).toBe(3);
    expect(model.workbook.activeRow).toBe(0);
    expect(model.workbook.activeXc).toBe("D1");
  });

  test("do nothing if moving out of merge is out of grid", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"]
        }
      ]
    });
    expect(model.workbook.activeCol).toBe(0);
    expect(model.workbook.activeRow).toBe(0);

    // put selection below merge
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 2 });

    // enter merge from below
    expect(model.workbook.activeXc).toBe("B3");
    model.dispatch({ type: "MOVE_POSITION", deltaX: 0, deltaY: -1 });
    expect(model.workbook.activeXc).toBe("B2");

    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.workbook.activeCol).toBe(1);
    expect(model.workbook.activeRow).toBe(1);

    // move to the top, outside the merge
    model.dispatch({ type: "MOVE_POSITION", deltaX: 0, deltaY: -1 });
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.workbook.activeCol).toBe(1);
    expect(model.workbook.activeRow).toBe(1);
  });

  test("move right from right row (of the viewport)", () => {
    const model = new GridModel();
    model.updateVisibleZone(600, 300);

    model.dispatch({ type: "SELECT_CELL", col: 4, row: 0 });

    expect(model.workbook.activeCol).toBe(4);
    expect(model.workbook.viewport.left).toBe(0);
    expect(model.workbook.viewport.right).toBe(5);
    model.dispatch({ type: "MOVE_POSITION", deltaX: 1, deltaY: 0 });
    expect(model.workbook.activeCol).toBe(5);
    expect(model.workbook.viewport.left).toBe(1);
    expect(model.workbook.viewport.right).toBe(6);
    expect(model.workbook.scrollLeft).toBe(DEFAULT_CELL_WIDTH);
  });

  test("move left from left row (of the viewport)", () => {
    const model = new GridModel();
    model.workbook.scrollLeft = 100;
    model.updateVisibleZone(600, 300);

    model.dispatch({ type: "SELECT_CELL", col: 1, row: 0 });

    expect(model.workbook.activeCol).toBe(1);
    expect(model.workbook.viewport.left).toBe(1);
    expect(model.workbook.viewport.right).toBe(6);
    model.dispatch({ type: "MOVE_POSITION", deltaX: -1, deltaY: 0 });
    expect(model.workbook.activeCol).toBe(0);
    expect(model.workbook.viewport.left).toBe(0);
    expect(model.workbook.viewport.right).toBe(5);
    expect(model.workbook.scrollLeft).toBe(0);
  });

  test("move bottom from bottom row (of the viewport)", () => {
    const model = new GridModel();
    model.updateVisibleZone(600, 200);
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 6 });
    expect(model.workbook.activeRow).toBe(6);
    expect(model.workbook.viewport.top).toBe(0);
    expect(model.workbook.viewport.bottom).toBe(7);
    model.dispatch({ type: "MOVE_POSITION", deltaX: 0, deltaY: 1 });
    expect(model.workbook.activeRow).toBe(7);
    expect(model.workbook.viewport.top).toBe(1);
    expect(model.workbook.viewport.bottom).toBe(8);
    expect(model.workbook.scrollTop).toBe(DEFAULT_CELL_HEIGHT);
  });

  test("move top from top row (of the viewport)", () => {
    const model = new GridModel();
    model.workbook.scrollTop = 40;
    model.updateVisibleZone(600, 200);
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 1 });
    expect(model.workbook.activeRow).toBe(1);
    expect(model.workbook.viewport.top).toBe(1);
    expect(model.workbook.viewport.bottom).toBe(8);
    model.dispatch({ type: "MOVE_POSITION", deltaX: 0, deltaY: -1 });
    expect(model.workbook.activeRow).toBe(0);
    expect(model.workbook.viewport.top).toBe(0);
    expect(model.workbook.viewport.bottom).toBe(7);
    expect(model.workbook.scrollTop).toBe(0);
  });
});
