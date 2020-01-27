import { GridModel, CURRENT_VERSION } from "../../src/model/index";

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
});
