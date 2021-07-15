import { toCartesian, toXC } from "../../src/helpers";
import { Model } from "../../src/model";
import { Viewport } from "../../src/types";
import { merge, selectCell } from "../test_helpers/commands_helpers";
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

  test("move bottom from merge in last postition", () => {
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

  test("move right from merge in last postition", () => {
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
