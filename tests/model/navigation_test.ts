import { Model } from "../../src/model";
import "../canvas.mock";
import { getActiveXc } from "../helpers";
import { Viewport } from "../../src/types";

function getViewport(
  model: Model,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number
): Viewport {
  return model.getters.getAdjustedViewport(
    { width, height, offsetX, offsetY, left: 0, right: 0, top: 0, bottom: 0 },
    "zone"
  );
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
    const colNumber = model.workbook.cols.length;
    model.dispatch("SELECT_CELL", { col: colNumber - 1, row: 0 });

    expect(model.getters.getPosition()).toEqual([colNumber - 1, 0]);
    model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 });
    expect(model.getters.getPosition()).toEqual([colNumber - 1, 0]);
  });

  test("move bottom from bottom row", () => {
    const model = new Model();
    const rowNumber = model.workbook.rows.length;
    model.dispatch("SELECT_CELL", { col: 0, row: rowNumber - 1 });
    expect(model.getters.getPosition()).toEqual([0, rowNumber - 1]);
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: 1 });
    expect(model.getters.getPosition()).toEqual([0, rowNumber - 1]);
  });

  test("move in and out of a merge", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["B1:C2"]
        }
      ]
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
          merges: ["B1:C2"]
        }
      ]
    });
    expect(model.getters.getPosition()).toEqual([0, 0]);

    // put selection below merge
    model.dispatch("SELECT_CELL", { col: 1, row: 2 });

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

    model.dispatch("SELECT_CELL", { col: 4, row: 0 });
    viewport = model.getters.getAdjustedViewport(viewport, "position");
    expect(viewport.left).toBe(0);
    expect(viewport.right).toBe(5);

    model.dispatch("SELECT_CELL", { col: 5, row: 0 });
    viewport = model.getters.getAdjustedViewport(viewport, "position");
    expect(viewport.left).toBe(1);
    expect(viewport.right).toBe(6);
  });

  test("move left from left col (of the viewport)", () => {
    const model = new Model();
    let viewport = getViewport(model, 600, 300, 100, 0);
    expect(viewport.left).toBe(1);
    expect(viewport.right).toBe(6);

    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    viewport = model.getters.getAdjustedViewport(viewport, "position");
    expect(viewport.left).toBe(1);
    expect(viewport.right).toBe(6);

    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    viewport = model.getters.getAdjustedViewport(viewport, "position");
    expect(viewport.left).toBe(0);
    expect(viewport.right).toBe(5);
  });

  test("move bottom from bottom row (of the viewport)", () => {
    const model = new Model();
    let viewport = getViewport(model, 600, 300, 0, 0);
    expect(viewport.top).toBe(0);
    expect(viewport.bottom).toBe(11);

    model.dispatch("SELECT_CELL", { col: 0, row: 10 });
    viewport = model.getters.getAdjustedViewport(viewport, "position");
    expect(viewport.top).toBe(0);
    expect(viewport.bottom).toBe(11);

    model.dispatch("SELECT_CELL", { col: 0, row: 11 });
    viewport = model.getters.getAdjustedViewport(viewport, "position");
    expect(viewport.top).toBe(1);
    expect(viewport.bottom).toBe(12);
  });

  test("move top from top row (of the viewport)", () => {
    const model = new Model();
    let viewport = getViewport(model, 600, 300, 0, 60);
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(14);

    model.dispatch("SELECT_CELL", { col: 0, row: 2 });
    viewport = model.getters.getAdjustedViewport(viewport, "position");
    expect(viewport.top).toBe(2);
    expect(viewport.bottom).toBe(14);

    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    viewport = model.getters.getAdjustedViewport(viewport, "position");
    expect(viewport.top).toBe(1);
    expect(viewport.bottom).toBe(12);
  });
});
