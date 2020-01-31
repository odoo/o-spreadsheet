import { DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT } from "../../src/constants";
import { CURRENT_VERSION, GridModel } from "../../src/model/index";

describe("navigation", () => {
  test("normal move to the right", () => {
    const model = new GridModel();
    expect(model.state.selection.zones[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.state.activeCol).toBe(0);
    expect(model.state.activeRow).toBe(0);
    expect(model.state.selection.anchor.col).toBe(0);
    expect(model.state.selection.anchor.row).toBe(0);

    model.movePosition(1, 0);
    expect(model.state.selection.zones[0]).toEqual({ top: 0, right: 1, left: 1, bottom: 0 });
    expect(model.state.activeCol).toBe(1);
    expect(model.state.activeRow).toBe(0);
    expect(model.state.selection.anchor.col).toBe(1);
    expect(model.state.selection.anchor.row).toBe(0);
  });

  test("move up from top row", () => {
    const model = new GridModel();
    expect(model.state.selection.zones[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.state.activeCol).toBe(0);
    expect(model.state.activeRow).toBe(0);

    model.movePosition(0, -1);
    expect(model.state.selection.zones[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.state.activeCol).toBe(0);
    expect(model.state.activeRow).toBe(0);
  });

  test("move right from right row", () => {
    const model = new GridModel();
    const colNumber = model.state.cols.length;
    model.selectCell(colNumber - 1, 0);
    expect(model.state.activeCol).toBe(colNumber - 1);
    model.movePosition(1, 0);
    expect(model.state.activeCol).toBe(colNumber - 1);
  });

  test("move bottom from bottom row", () => {
    const model = new GridModel();
    const rowNumber = model.state.rows.length;
    model.selectCell(0, rowNumber - 1);
    expect(model.state.activeRow).toBe(rowNumber - 1);
    model.movePosition(0, 1);
    expect(model.state.activeRow).toBe(rowNumber - 1);
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
    expect(model.state.activeCol).toBe(0);
    expect(model.state.activeRow).toBe(0);

    // move to the right, inside the merge
    model.movePosition(1, 0);

    expect(model.state.selection.zones[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.state.activeCol).toBe(1);
    expect(model.state.activeRow).toBe(0);

    // move to the right, outside the merge
    model.movePosition(1, 0);
    expect(model.state.selection.zones[0]).toEqual({ top: 0, right: 3, left: 3, bottom: 0 });
    expect(model.state.activeCol).toBe(3);
    expect(model.state.activeRow).toBe(0);
    expect(model.state.activeXc).toBe("D1");
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
    expect(model.state.activeCol).toBe(0);
    expect(model.state.activeRow).toBe(0);

    // put selection below merge
    model.selectCell(1, 2);

    // enter merge from below
    expect(model.state.activeXc).toBe("B3");
    model.movePosition(0, -1);
    expect(model.state.activeXc).toBe("B2");

    expect(model.state.selection.zones[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.state.activeCol).toBe(1);
    expect(model.state.activeRow).toBe(1);

    // move to the top, outside the merge
    model.movePosition(0, -1);
    expect(model.state.selection.zones[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.state.activeCol).toBe(1);
    expect(model.state.activeRow).toBe(1);
  });

  test("move right from right row (of the viewport)", () => {
    const model = new GridModel();
    model.updateVisibleZone(600, 300);

    model.selectCell(4, 0);
    expect(model.state.activeCol).toBe(4);
    expect(model.state.viewport.left).toBe(0);
    expect(model.state.viewport.right).toBe(5);
    model.movePosition(1, 0);
    expect(model.state.activeCol).toBe(5);
    expect(model.state.viewport.left).toBe(1);
    expect(model.state.viewport.right).toBe(6);
    expect(model.state.scrollLeft).toBe(DEFAULT_CELL_WIDTH);
  });

  test("move left from left row (of the viewport)", () => {
    const model = new GridModel();
    model.state.scrollLeft = 100;
    model.updateVisibleZone(600, 300);

    model.selectCell(1, 0);
    expect(model.state.activeCol).toBe(1);
    expect(model.state.viewport.left).toBe(1);
    expect(model.state.viewport.right).toBe(6);
    model.movePosition(-1, 0);
    expect(model.state.activeCol).toBe(0);
    expect(model.state.viewport.left).toBe(0);
    expect(model.state.viewport.right).toBe(5);
    expect(model.state.scrollLeft).toBe(0);
  });

  test("move bottom from bottom row (of the viewport)", () => {
    const model = new GridModel();
    model.updateVisibleZone(600, 200);
    model.selectCell(0, 6);
    expect(model.state.activeRow).toBe(6);
    expect(model.state.viewport.top).toBe(0);
    expect(model.state.viewport.bottom).toBe(7);
    model.movePosition(0, 1);
    expect(model.state.activeRow).toBe(7);
    expect(model.state.viewport.top).toBe(1);
    expect(model.state.viewport.bottom).toBe(8);
    expect(model.state.scrollTop).toBe(DEFAULT_CELL_HEIGHT);
  });

  test("move top from top row (of the viewport)", () => {
    const model = new GridModel();
    model.state.scrollTop = 40;
    model.updateVisibleZone(600, 200);
    model.selectCell(0, 1);
    expect(model.state.activeRow).toBe(1);
    expect(model.state.viewport.top).toBe(1);
    expect(model.state.viewport.bottom).toBe(8);
    model.movePosition(0, -1);
    expect(model.state.activeRow).toBe(0);
    expect(model.state.viewport.top).toBe(0);
    expect(model.state.viewport.bottom).toBe(7);
    expect(model.state.scrollTop).toBe(0);
  });
});
