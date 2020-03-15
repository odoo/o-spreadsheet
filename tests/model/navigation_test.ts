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

    model.movePosition(1, 0);
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

    model.movePosition(0, -1);
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 0, left: 0, bottom: 0 });
    expect(model.workbook.activeCol).toBe(0);
    expect(model.workbook.activeRow).toBe(0);
  });

  test("move right from right row", () => {
    const model = new GridModel();
    const colNumber = model.workbook.cols.length;
    model.selectCell(colNumber - 1, 0);
    expect(model.workbook.activeCol).toBe(colNumber - 1);
    model.movePosition(1, 0);
    expect(model.workbook.activeCol).toBe(colNumber - 1);
  });

  test("move bottom from bottom row", () => {
    const model = new GridModel();
    const rowNumber = model.workbook.rows.length;
    model.selectCell(0, rowNumber - 1);
    expect(model.workbook.activeRow).toBe(rowNumber - 1);
    model.movePosition(0, 1);
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
    model.movePosition(1, 0);

    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.workbook.activeCol).toBe(1);
    expect(model.workbook.activeRow).toBe(0);

    // move to the right, outside the merge
    model.movePosition(1, 0);
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
    model.selectCell(1, 2);

    // enter merge from below
    expect(model.workbook.activeXc).toBe("B3");
    model.movePosition(0, -1);
    expect(model.workbook.activeXc).toBe("B2");

    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.workbook.activeCol).toBe(1);
    expect(model.workbook.activeRow).toBe(1);

    // move to the top, outside the merge
    model.movePosition(0, -1);
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, right: 2, left: 1, bottom: 1 });
    expect(model.workbook.activeCol).toBe(1);
    expect(model.workbook.activeRow).toBe(1);
  });

  test("move right from right row (of the viewport)", () => {
    const model = new GridModel();
    model.updateVisibleZone(600, 300);

    model.selectCell(4, 0);
    expect(model.workbook.activeCol).toBe(4);
    expect(model.workbook.viewport.left).toBe(0);
    expect(model.workbook.viewport.right).toBe(5);
    model.movePosition(1, 0);
    expect(model.workbook.activeCol).toBe(5);
    expect(model.workbook.viewport.left).toBe(1);
    expect(model.workbook.viewport.right).toBe(6);
    expect(model.workbook.scrollLeft).toBe(DEFAULT_CELL_WIDTH);
  });

  test("move left from left row (of the viewport)", () => {
    const model = new GridModel();
    model.workbook.scrollLeft = 100;
    model.updateVisibleZone(600, 300);

    model.selectCell(1, 0);
    expect(model.workbook.activeCol).toBe(1);
    expect(model.workbook.viewport.left).toBe(1);
    expect(model.workbook.viewport.right).toBe(6);
    model.movePosition(-1, 0);
    expect(model.workbook.activeCol).toBe(0);
    expect(model.workbook.viewport.left).toBe(0);
    expect(model.workbook.viewport.right).toBe(5);
    expect(model.workbook.scrollLeft).toBe(0);
  });

  test("move bottom from bottom row (of the viewport)", () => {
    const model = new GridModel();
    model.updateVisibleZone(600, 200);
    model.selectCell(0, 6);
    expect(model.workbook.activeRow).toBe(6);
    expect(model.workbook.viewport.top).toBe(0);
    expect(model.workbook.viewport.bottom).toBe(7);
    model.movePosition(0, 1);
    expect(model.workbook.activeRow).toBe(7);
    expect(model.workbook.viewport.top).toBe(1);
    expect(model.workbook.viewport.bottom).toBe(8);
    expect(model.workbook.scrollTop).toBe(DEFAULT_CELL_HEIGHT);
  });

  test("move top from top row (of the viewport)", () => {
    const model = new GridModel();
    model.workbook.scrollTop = 40;
    model.updateVisibleZone(600, 200);
    model.selectCell(0, 1);
    expect(model.workbook.activeRow).toBe(1);
    expect(model.workbook.viewport.top).toBe(1);
    expect(model.workbook.viewport.bottom).toBe(8);
    model.movePosition(0, -1);
    expect(model.workbook.activeRow).toBe(0);
    expect(model.workbook.viewport.top).toBe(0);
    expect(model.workbook.viewport.bottom).toBe(7);
    expect(model.workbook.scrollTop).toBe(0);
  });
});
