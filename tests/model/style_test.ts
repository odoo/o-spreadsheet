import { GridModel } from "../../src/model/index";

describe("styles", () => {
  test("can undo and redo a setStyle operation on an empty cell", () => {
    const model = new GridModel();
    model.selectCell(1, 0);
    model.setStyle({ fillColor: "red" });

    expect(model.state.cells.B1.content).toBe("");
    expect(model.state.cells.B1.style).toBeDefined();
    model.undo();
    expect(model.state.cells.B1).not.toBeDefined();
  });

  test("can undo and redo a setStyle operation on an non empty cell", () => {
    const model = new GridModel();
    model.setValue("B1", "some content");
    model.selectCell(1, 0);
    model.setStyle({ fillColor: "red" });

    expect(model.state.cells.B1.content).toBe("some content");
    expect(model.state.cells.B1.style).toBeDefined();
    model.undo();
    expect(model.state.cells.B1.content).toBe("some content");
    expect(model.state.cells.B1.style).not.toBeDefined();
  });
});
