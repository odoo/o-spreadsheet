import { GridModel } from "../src/grid_model";
import { makeTestFixture, triggerMouseEvent, GridParent } from "./helpers";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Grid component", () => {
  test("can click on a cell to select it", async () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" }, B3: { content: "b3" } }
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.activeXc).toBe("A1");
    triggerMouseEvent("mousedown", 300, 300);
    expect(model.activeXc).toBe("C10");
  });

  test("can shift-click on a cell to update selection", async () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" }, B3: { content: "b3" } }
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.activeXc).toBe("A1");
    triggerMouseEvent("mousedown", 300, 300, { shiftKey: true });
    expect(model.selection).toEqual({
      top: 0,
      left: 0,
      bottom: 9,
      right: 2
    });
  });
});
