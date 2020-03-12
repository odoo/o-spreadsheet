import { GridModel } from "../../src/model/index";
import "../canvas.mock";

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

  test("can clear formatting (style)", () => {
    const model = new GridModel();
    model.setValue("B1", "b1");
    model.selectCell(1, 0);
    model.setStyle({ fillColor: "red" });

    expect(model.state.cells.B1.style).toBeDefined();
    model.clearFormatting();
    expect(model.state.cells.B1.content).toBe("b1");
    expect(model.state.cells.B1.style).not.toBeDefined();
  });

  test("clearing format on a cell with no content actually remove it", () => {
    const model = new GridModel();
    model.selectCell(1, 0);
    model.setStyle({ fillColor: "red" });

    expect(model.state.cells.B1.style).toBeDefined();
    model.clearFormatting();
    expect(model.state.cells.B1).not.toBeDefined();
  });

  test("clearing format operation can be undone", () => {
    const model = new GridModel();
    model.setValue("B1", "b1");
    model.selectCell(1, 0);
    model.setStyle({ fillColor: "red" });

    expect(model.state.cells.B1.style).toBeDefined();
    model.clearFormatting();
    expect(model.state.cells.B1.style).not.toBeDefined();
    model.undo();
    expect(model.state.cells.B1.style).toBeDefined();
  });

  test("adding a style to a cell remove cell width cache", () => {
    const model = new GridModel();
    model.setValue("A2", "3");
    // this simulates a rendering which adds the width
    model.state.cells.A2.width = 234;
    model.selectCell(0, 1); // select B2
    model.setStyle({ fontSize: 33 });
    expect(model.state.cells.A2.width).not.toBeDefined();
  });
});
