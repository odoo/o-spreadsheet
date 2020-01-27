import { GridModel } from "../../src/model/index";

describe("clipboard", () => {
  test("can copy and paste a cell", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");

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
    const model = new GridModel();
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
    const model = new GridModel();
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
    const model = new GridModel();
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
    const model = new GridModel();
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

  test("getClipboardContent export formatted string", () => {
    const model = new GridModel();
    model.setValue("B2", "abc");
    model.selectCell(1, 1);
    model.copy();
    expect(model.getClipboardContent()).toBe("abc");

    model.setValue("B2", "= 1 + 2");
    model.selectCell(1, 1);
    model.copy();
    expect(model.getClipboardContent()).toBe("3");
  });

  test("can copy a rectangular selection", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.setValue("B3", "b3");
    model.setValue("C2", "c2");
    model.setValue("C3", "c3");

    model.selectCell(1, 1);
    model.updateSelection(2, 2);
    model.copy();

    expect(model.state.cells.D1).not.toBeDefined();
    expect(model.state.cells.D2).not.toBeDefined();
    expect(model.state.cells.E1).not.toBeDefined();
    expect(model.state.cells.E2).not.toBeDefined();

    model.selectCell(3, 0);
    model.paste();

    expect(model.state.cells.D1.content).toBe("b2");
    expect(model.state.cells.D2.content).toBe("b3");
    expect(model.state.cells.E1.content).toBe("c2");
    expect(model.state.cells.E2.content).toBe("c3");
  });

  test("empty clipboard: getClipboardContent returns empty string", () => {
    const model = new GridModel();
    expect(model.getClipboardContent()).toBe("");
  });

  test("getClipboardContent exports multiple cells", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.setValue("B3", "b3");
    model.setValue("C2", "c2");
    model.setValue("C3", "c3");
    model.selectCell(1, 1);
    model.updateSelection(2, 2);
    model.copy();
    expect(model.getClipboardContent()).toBe("b2\tc2\nb3\tc3");
  });

  test("can paste multiple cells from os clipboard", () => {
    const model = new GridModel();
    model.selectCell(2, 0); // C1
    model.paste("a\t1\nb\t2");

    expect(model.state.cells.C1.content).toBe("a");
    expect(model.state.cells.C2.content).toBe("b");
    expect(model.state.cells.D1.content).toBe("1");
    expect(model.state.cells.D2.content).toBe("2");
  });

  test("pasting numbers from windows clipboard => interpreted as number", () => {
    const model = new GridModel();
    model.selectCell(2, 0); // C1
    model.paste("1\r\n2\r\n3");

    expect(model.state.cells.C1.content).toBe("1");
    expect(model.state.cells.C1.type).toBe("number");
    expect(model.state.cells.C2.content).toBe("2");
    expect(model.state.cells.C2.type).toBe("number");
    expect(model.state.cells.C3.content).toBe("3");
    expect(model.state.cells.C3.type).toBe("number");
  });
});
