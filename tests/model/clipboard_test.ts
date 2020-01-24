import { GridModel } from "../../src/model/index";

describe("clipboard", () => {
  test("can copy and paste a cell", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } }
        }
      ]
    });
    expect(model.state.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" }
    });

    model.selectCell(1, 1);
    model.copy();
    model.selectCell(3, 1);
    model.paste();
    expect(model.state.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" },
      D2: { col: 3, row: 1, content: "b2", type: "text", value: "b2", xc: "D2" }
    });
    expect(model.state.clipboard.status).toBe("invisible");
  });

  test("can cut and paste a cell", () => {
    const model = new GridModel({});
    model.setValue("B2", "b2");
    expect(model.state.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" }
    });

    model.selectCell(1, 1);
    model.cut();
    expect(model.state.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" }
    });

    model.selectCell(3, 1);
    model.paste();
    expect(model.state.cells).toEqual({
      D2: { col: 3, row: 1, content: "b2", type: "text", value: "b2", xc: "D2" }
    });

    expect(model.state.clipboard.status).toBe("empty");

    // select D3 and paste. it should do nothing
    model.selectCell(3, 2);
    model.paste();
    expect(model.state.cells.D3).not.toBeDefined();
  });

  test("can copy a cell with style", () => {
    const model = new GridModel({});
    model.setValue("B2", "b2");
    model.selectCell(1, 1);
    model.setStyle({ bold: true });
    expect(model.state.cells.B2.style).toBe(2);

    model.copy();
    model.selectCell(2, 1); // C2
    model.paste();
    expect(model.state.cells.B2.style).toBe(2);
    expect(model.state.cells.C2.style).toBe(2);
  });

  test("can copy a cell with borders", () => {
    const model = new GridModel({});
    model.setValue("B2", "b2");
    model.selectCell(1, 1);
    model.setBorder("bottom");
    expect(model.state.cells.B2.border).toBe(2);

    model.copy();
    model.selectCell(2, 1); // C2
    model.paste();
    expect(model.state.cells.B2.border).toBe(2);
    expect(model.state.cells.C2.border).toBe(2);
  });

  test("cutting a cell with style remove the cell", () => {
    const model = new GridModel({});
    model.setValue("B2", "b2");
    model.selectCell(1, 1);
    model.setStyle({ bold: true });

    model.cut();
    model.selectCell(2, 1);
    model.paste();
    expect(model.state.cells).toEqual({
      C2: { col: 2, style: 2, row: 1, content: "b2", type: "text", value: "b2", xc: "C2" }
    });
  });
});
