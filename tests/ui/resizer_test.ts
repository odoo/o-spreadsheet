import { GridModel } from "../../src/model";
import {
  makeTestFixture,
  triggerMouseEvent,
  GridParent,
  triggerColResizer,
  triggerRowResizer
} from "../helpers";
import { MIN_COL_WIDTH, MIN_ROW_HEIGHT } from "../../src/constants";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Resizer component", () => {
  test("can click on a header to select a column", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    const x = model.state.cols[2].left + 1;
    triggerMouseEvent(".o-resizer .o-col-resizer", "mousedown", x, 10);
    expect(model.state.selection.zones[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.state.activeXc).toBe("C1");
  });

  test("can click on a row-header to select a row", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    const y = model.state.rows[2].top + 1;
    triggerMouseEvent(".o-resizer .o-row-resizer", "mousedown", 10, y);
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.state.activeXc).toBe("A3");
  });

  test("can select multiple rows/cols", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    let y = model.state.rows[2].top + 1;
    triggerMouseEvent(".o-resizer .o-row-resizer", "mousedown", 10, y);
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    y = model.state.rows[3].top + 1;
    triggerMouseEvent(".o-resizer .o-row-resizer", "mousedown", 10, y, { ctrlKey: true });
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.state.selection.zones[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(model.state.activeXc).toBe("A4");
    const x = model.state.cols[2].left + 1;
    triggerMouseEvent(".o-resizer .o-col-resizer", "mousedown", x, 10, { ctrlKey: true });
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.state.selection.zones[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(model.state.selection.zones[2]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.state.activeXc).toBe("C1");
    triggerMouseEvent(".o-resizer .o-col-resizer", "mousedown", x, 10);
    expect(model.state.selection.zones.length).toBe(1);
    expect(model.state.selection.zones[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.state.activeXc).toBe("C1");
  });

  test("Can resize column", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);

    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const x = model.state.cols[2].left;
    await triggerColResizer(x, 50, model, model.state.cols[8].right);
    expect(model.state.cols[1].size).toBe(model.state.cols[0].size + 50);
    expect(model.state.cols[2].size).toBe(model.state.cols[0].size);
  });

  test("Can resize row", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);

    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const y = model.state.rows[2].top;
    await triggerRowResizer(y, 50, model, model.state.rows[8].bottom);
    expect(model.state.rows[1].size).toBe(model.state.rows[0].size + 50);
    expect(model.state.rows[2].size).toBe(model.state.rows[0].size);
  });

  test("Can resize multiples columns", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);

    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    let x = model.state.cols[2].left + 1;
    triggerMouseEvent(".o-resizer .o-col-resizer", "mousedown", x, 10);
    x = model.state.cols[3].left + 1;
    triggerMouseEvent(".o-resizer .o-col-resizer", "mousedown", x, 10, { ctrlKey: true });
    expect(model.state.selection.zones[0]).toEqual({ left: 2, top: 0, right: 2, bottom: 9 });
    expect(model.state.selection.zones[1]).toEqual({ left: 3, top: 0, right: 3, bottom: 9 });
    expect(model.state.activeXc).toBe("D1");

    x = model.state.cols[3].left + 1;
    await triggerColResizer(x, 50, model, model.state.cols[8].right);
    expect(model.state.cols[1].size).toBe(model.state.cols[0].size);
    expect(model.state.cols[2].size).toBe(model.state.cols[0].size + 50);
    expect(model.state.cols[3].size).toBe(model.state.cols[0].size + 50);
    expect(model.state.cols[4].size).toBe(model.state.cols[0].size);
    expect(model.state.cols[4].left).toBe(model.state.cols[0].size * 4 + 100);
  });

  test("Can resize multiples rows", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);

    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    let y = model.state.rows[2].top + 1;
    triggerMouseEvent(".o-resizer .o-row-resizer", "mousedown", 10, y);
    y = model.state.rows[3].top + 1;
    triggerMouseEvent(".o-resizer .o-row-resizer", "mousedown", 10, y, { ctrlKey: true });
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 2, right: 9, bottom: 2 });
    expect(model.state.selection.zones[1]).toEqual({ left: 0, top: 3, right: 9, bottom: 3 });
    expect(model.state.activeXc).toBe("A4");

    y = model.state.rows[3].top + 1;
    await triggerRowResizer(y, 50, model, model.state.rows[8].bottom);
    expect(model.state.rows[1].size).toBe(model.state.rows[0].size);
    expect(model.state.rows[2].size).toBe(model.state.rows[0].size + 50);
    expect(model.state.rows[3].size).toBe(model.state.rows[0].size + 50);
    expect(model.state.rows[4].size).toBe(model.state.rows[0].size);
    expect(model.state.rows[4].top).toBe(model.state.rows[0].size * 4 + 100);
  });

  test("can select all the sheet", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    triggerMouseEvent(".o-resizer .all", "mousedown", 5, 5);
    expect(model.state.selection.zones[0]).toEqual({ left: 0, top: 0, right: 9, bottom: 9 });
    expect(model.state.activeXc).toBe("A1");
  });

  test("Mousemove hover something else than a header", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
    triggerMouseEvent(".o-resizer .o-col-resizer", "mousemove", -10, 10);
    expect(fixture.querySelector("o-handle")).toBeNull();
    triggerMouseEvent(".o-resizer .o-row-resizer", "mousemove", 10, -10);
    expect(fixture.querySelector("o-handle")).toBeNull();
    triggerMouseEvent(".o-resizer .o-col-resizer", "mousemove", 20, 10);
    expect(fixture.querySelector("o-handle")).toBeNull();
    triggerMouseEvent(".o-resizer .o-row-resizer", "mousemove", 10, 12);
    expect(fixture.querySelector("o-handle")).toBeNull();
  });

  test("Min boundaries resizing columns", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);

    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const x = model.state.cols[2].left;
    await triggerColResizer(x, -10000000, model, model.state.cols[8].right);
    expect(model.state.cols[1].size).toBe(MIN_COL_WIDTH);
  });

  test("Min boundaries resizing rows", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);

    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const x = model.state.rows[2].top;
    await triggerRowResizer(x, -10000000, model, model.state.rows[8].bottom);
    expect(model.state.rows[1].size).toBe(MIN_ROW_HEIGHT);
  });

  test("Max boundaries resizing columns", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);

    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const x = model.state.cols[2].left;
    await triggerColResizer(x, 10000000, model, model.state.cols[8].right);
    expect(model.state.cols[1].size).toBe(model.state.clientWidth - 90 - model.state.cols[0].size);
  });

  test("Max boundaries resizing rows", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);

    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const x = model.state.rows[2].top;
    await triggerRowResizer(x, 10000000, model, model.state.rows[8].bottom);
    expect(model.state.rows[1].size).toBe(model.state.clientHeight - 60 - model.state.rows[0].size);
  });
});
