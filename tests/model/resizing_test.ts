import { Model } from "../../src/model";
import "../canvas.mock";

describe("Model resizer", () => {
  test("Can resize one column, undo, then redo", async () => {
    const model = new Model();

    const initialSize = model.getters.getCol(1).size;
    const initialTop = model.getters.getCol(2).start;
    const initialWidth = model.getters.getGridSize()[0];

    model.dispatch("RESIZE_COLUMNS", {
      sheet: "Sheet1",
      cols: [1],
      size: model.getters.getCol(1).size + 100,
    });
    expect(model.getters.getCol(1).size).toBe(196);
    expect(model.getters.getCol(2).start).toBe(initialTop + 100);
    expect(model.getters.getGridSize()[0]).toBe(initialWidth + 100);

    model.dispatch("UNDO");
    expect(model.getters.getCol(1).size).toBe(initialSize);
    expect(model.getters.getCol(2).start).toBe(initialTop);
    expect(model.getters.getGridSize()[0]).toBe(initialWidth);

    model.dispatch("REDO");
    expect(model.getters.getCol(1).size).toBe(initialSize + 100);
    expect(model.getters.getCol(2).start).toBe(initialTop + 100);
    expect(model.getters.getGridSize()[0]).toBe(initialWidth + 100);
  });

  test("Can resize one row, then undo", async () => {
    const model = new Model();

    const initialSize = model.getters.getRow(1).size;
    const initialTop = model.getters.getRow(2).start;
    const initialHeight = model.getters.getGridSize()[1];

    model.dispatch("RESIZE_ROWS", {
      sheet: "Sheet1",
      rows: [1],
      size: initialSize + 100,
    });
    expect(model.getters.getRow(1).size).toBe(initialSize + 100);
    expect(model.getters.getRow(2).start).toBe(initialTop + 100);
    expect(model.getters.getGridSize()[1]).toBe(initialHeight + 100);

    model.dispatch("UNDO");
    expect(model.getters.getRow(1).size).toBe(initialSize);
    expect(model.getters.getRow(2).start).toBe(initialTop);
    expect(model.getters.getGridSize()[1]).toBe(initialHeight);
  });

  test("changing sheets update the sizes", async () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET");

    expect(model.getters.getActiveSheet()).toBe("Sheet2");

    model.dispatch("RESIZE_COLUMNS", {
      sheet: "Sheet2",
      cols: [1],
      size: model.getters.getCol(1).size + 100,
    });

    const initialWidth = model.getters.getGridSize()[0];

    model.dispatch("ACTIVATE_SHEET", { from: "Sheet2", to: "Sheet1" });
    expect(model.getters.getGridSize()[0]).toBe(initialWidth - 100);
  });

  test("Can resize multiple columns", async () => {
    const model = new Model();

    const size = model.getters.getCol(0).size;

    model.dispatch("RESIZE_COLUMNS", {
      sheet: "Sheet1",
      cols: [1, 3, 4],
      size: 100,
    });
    expect(model.getters.getCol(1).size).toBe(100);
    expect(model.getters.getCol(2).size).toBe(size);
    expect(model.getters.getCol(3).size).toBe(100);
    expect(model.getters.getCol(4).size).toBe(100);
    expect(model.getters.getCol(5).start).toBe(size * 2 + 100 * 3);
  });

  test("Can resize multiple rows", async () => {
    const model = new Model();

    const size = model.getters.getRow(0).size;

    model.dispatch("RESIZE_ROWS", {
      sheet: "Sheet1",
      rows: [1, 3, 4],
      size: 100,
    });

    expect(model.getters.getRow(1).size).toBe(100);
    expect(model.getters.getRow(2).size).toBe(size);
    expect(model.getters.getRow(3).size).toBe(100);
    expect(model.getters.getRow(4).size).toBe(100);
    expect(model.getters.getRow(5).start).toBe(2 * size + 100 * 3);
  });

  test("resizing cols/rows update the total width/height", async () => {
    const model = new Model();

    const [initialWidth, initialHeight] = model.getters.getGridSize();

    model.dispatch("RESIZE_COLUMNS", {
      sheet: "Sheet1",
      cols: [1],
      size: model.getters.getCol(1).size + 100,
    });
    expect(model.getters.getGridSize()[0]).toBe(initialWidth + 100);

    model.dispatch("RESIZE_ROWS", {
      sheet: "Sheet1",
      rows: [1],
      size: model.getters.getRow(1).size + 42,
    });
    expect(model.getters.getGridSize()[1]).toBe(initialHeight + 42);
  });
});
