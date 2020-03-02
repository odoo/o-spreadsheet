import { GridModel } from "../../src/model";

describe("Model resizer", () => {
  test("Can resize one column, undo, then redo", async () => {
    const model = new GridModel();
    model.state.viewport = { left: 0, top: 0, right: 25, bottom: 99 };

    const initialSize = model.state.cols[1].size;
    const initialTop = model.state.cols[2].left;

    model.updateColSize(1, 100);
    expect(model.state.cols[1].size).toBe(initialSize + 100);
    expect(model.state.cols[2].left).toBe(initialTop + 100);

    model.undo();
    expect(model.state.cols[1].size).toBe(initialSize);
    expect(model.state.cols[2].left).toBe(initialTop);

    model.redo();
    expect(model.state.cols[1].size).toBe(initialSize + 100);
    expect(model.state.cols[2].left).toBe(initialTop + 100);
  });

  test("Can resize one row, then undo", async () => {
    const model = new GridModel();
    model.state.viewport = { left: 0, top: 0, right: 25, bottom: 99 };

    const initialSize = model.state.rows[1].size;
    const initialTop = model.state.rows[2].top;

    model.updateRowSize(1, 100);
    expect(model.state.rows[1].size).toBe(initialSize + 100);
    expect(model.state.rows[2].top).toBe(initialTop + 100);

    model.undo();
    expect(model.state.rows[1].size).toBe(initialSize);
    expect(model.state.rows[2].top).toBe(initialTop);
  });

  test("Can resize multiple columns", async () => {
    const model = new GridModel();
    model.state.viewport = { left: 0, top: 0, right: 25, bottom: 99 };

    const size = model.state.cols[0].size;

    model.state.selection.zones[0] = {
      top: 0,
      bottom: 99,
      left: 1,
      right: 1
    };
    model.state.selection.zones[1] = {
      top: 0,
      bottom: 99,
      left: 3,
      right: 4
    };
    model.updateColsSize(1, 100);

    expect(model.state.cols[1].size).toBe(size + 100);
    expect(model.state.cols[3].size).toBe(size + 100);
    expect(model.state.cols[4].size).toBe(size + 100);
    expect(model.state.cols[5].left).toBe(size * 5 + 100 * 3);
  });

  test("Can resize multiple rows", async () => {
    const model = new GridModel();
    model.state.viewport = { left: 0, top: 0, right: 25, bottom: 99 };

    const size = model.state.rows[0].size;

    model.state.selection.zones[0] = {
      top: 1,
      bottom: 1,
      left: 0,
      right: 25
    };
    model.state.selection.zones[1] = {
      top: 3,
      bottom: 4,
      left: 0,
      right: 25
    };
    model.updateRowsSize(1, 100);

    expect(model.state.rows[1].size).toBe(size + 100);
    expect(model.state.rows[3].size).toBe(size + 100);
    expect(model.state.rows[4].size).toBe(size + 100);
    expect(model.state.rows[5].top).toBe(size * 5 + 100 * 3);
  });

  test("resizing cols/rows update the total width/height", async () => {
    const model = new GridModel();
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const initialWidth = model.state.width;
    const initialHeight = model.state.height;

    model.updateColSize(1, 100);
    expect(model.state.width).toBe(initialWidth + 100);

    model.updateRowSize(1, 42);
    expect(model.state.height).toBe(initialHeight + 42);
  });
});
