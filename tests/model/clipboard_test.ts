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
    model.paste({ clipboardContent: "a\t1\nb\t2" });

    expect(model.state.cells.C1.content).toBe("a");
    expect(model.state.cells.C2.content).toBe("b");
    expect(model.state.cells.D1.content).toBe("1");
    expect(model.state.cells.D2.content).toBe("2");
  });

  test("pasting numbers from windows clipboard => interpreted as number", () => {
    const model = new GridModel();
    model.selectCell(2, 0); // C1
    model.paste({ clipboardContent: "1\r\n2\r\n3" });

    expect(model.state.cells.C1.content).toBe("1");
    expect(model.state.cells.C1.type).toBe("number");
    expect(model.state.cells.C2.content).toBe("2");
    expect(model.state.cells.C2.type).toBe("number");
    expect(model.state.cells.C3.content).toBe("3");
    expect(model.state.cells.C3.type).toBe("number");
  });

  test("incompatible multiple selections: only last one is actually copied", () => {
    const model = new GridModel();
    model.setValue("A1", "a1");
    model.setValue("A2", "a2");
    model.setValue("C1", "c1");
    model.selectCell(0, 0); // A1
    model.updateSelection(0, 1); // A1:A2
    model.selectCell(2, 0, true); // A1:A2 and C1
    model.copy();

    const clipboard = model.state.clipboard;
    expect(clipboard.zones.length).toBe(1);
    expect(clipboard.cells!.length).toBe(1);

    model.selectCell(4, 0); // E1
    model.paste();
    expect(model.state.cells.E1.content).toBe("c1");
    expect(model.state.cells.E2).not.toBeDefined();
  });

  test("compatible multiple selections: each column is copied", () => {
    const model = new GridModel();
    model.setValue("A1", "a1");
    model.setValue("A2", "a2");
    model.setValue("C1", "c1");
    model.setValue("C2", "c2");
    model.selectCell(0, 0); // A1
    model.updateSelection(0, 1); // A1:A2
    model.selectCell(2, 0, true); // A1:A2 and C1
    model.updateSelection(2, 1); // A1:A2 and C1:C2;
    model.copy();

    const clipboard = model.state.clipboard;
    expect(clipboard.zones.length).toBe(2);
    expect(clipboard.cells!.length).toBe(2);

    model.selectCell(4, 0); // E1
    model.paste();
    expect(model.state.cells.E1.content).toBe("a1");
    expect(model.state.cells.E2.content).toBe("a2");
    expect(model.state.cells.F1.content).toBe("c1");
    expect(model.state.cells.F2.content).toBe("c2");
  });

  test("pasting a value in a larger selection", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.selectCell(0, 0); // A1
    model.copy();

    model.selectCell(2, 1); // C2
    model.updateSelection(4, 2); // select C2:E3
    model.paste();
    expect(model.state.cells.C2.content).toBe("1");
    expect(model.state.cells.C3.content).toBe("1");
    expect(model.state.cells.D2.content).toBe("1");
    expect(model.state.cells.D3.content).toBe("1");
    expect(model.state.cells.E2.content).toBe("1");
    expect(model.state.cells.E3.content).toBe("1");
  });

  test("selection is updated to contain exactly the new pasted zone", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.selectCell(0, 0); // A1
    model.updateSelection(0, 1); // A1:A2
    model.copy();

    model.selectCell(2, 0); // C1
    model.updateSelection(2, 2); // select C1:C3
    expect(model.state.selection.zones[0]).toEqual({ top: 0, left: 2, bottom: 2, right: 2 });
    model.paste();
    expect(model.state.selection.zones[0]).toEqual({ top: 0, left: 2, bottom: 1, right: 2 });
    expect(model.state.cells.C1.content).toBe("1");
    expect(model.state.cells.C2.content).toBe("2");
    expect(model.state.cells.C3).not.toBeDefined();
  });

  test("selection is not changed if pasting a single value into two zones", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.selectCell(0, 0); // A1
    model.copy();

    model.selectCell(2, 0); // C1
    model.selectCell(4, 0, true); // select C1,E1

    model.paste();
    expect(model.state.selection.zones[0]).toEqual({ top: 0, left: 2, bottom: 0, right: 2 });
    expect(model.state.selection.zones[1]).toEqual({ top: 0, left: 4, bottom: 0, right: 4 });
  });

  test("pasting a value in multiple zones", () => {
    const model = new GridModel();
    model.setValue("A1", "33");
    model.selectCell(0, 0); // A1
    model.copy();

    model.selectCell(2, 0); // C1
    model.selectCell(4, 0, true); // select C1,E1
    model.paste();

    expect(model.state.cells.C1.content).toBe("33");
    expect(model.state.cells.E1.content).toBe("33");
  });

  test("pasting is not allowed if multiple selection and more than one value", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.selectCell(0, 0); // A1
    model.updateSelection(0, 1); // select A1:A2
    model.copy();

    model.selectCell(2, 0); // C1
    model.selectCell(4, 0, true); // select C1,E1

    expect(model.paste()).toBe(false);
  });

  test("can copy and paste a cell with STRING content", () => {
    const model = new GridModel();
    model.setValue("B2", '="test"');

    expect(model.state.cells["B2"].content).toEqual('="test"');
    expect(model.state.cells["B2"].value).toEqual("test");

    model.selectCell(1, 1);
    model.copy();
    model.selectCell(3, 1);
    model.paste();
    expect(model.state.cells["B2"].content).toEqual('="test"');
    expect(model.state.cells["B2"].value).toEqual("test");
    expect(model.state.cells["D2"].content).toEqual('="test"');
    expect(model.state.cells["D2"].value).toEqual("test");
    expect(model.state.clipboard.status).toBe("invisible");
  });

  test("can undo a paste operation", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");

    model.selectCell(1, 1);
    model.copy();
    model.selectCell(3, 1); //D2
    model.paste();
    expect(model.state.cells.D2).toBeDefined();
    model.undo();
    expect(model.state.cells.D2).not.toBeDefined();
  });

  test("can paste-format a cell with style", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.selectCell(1, 1);
    model.setStyle({ bold: true });
    expect(model.state.cells.B2.style).toBe(2);

    model.copy();
    model.selectCell(2, 1); // C2
    model.paste({ onlyFormat: true });
    expect(model.state.cells.C2.content).toBe("");
    expect(model.state.cells.C2.style).toBe(2);
  });

  test("can copy and paste format", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.selectCell(1, 1);
    model.setStyle({ bold: true });
    expect(model.state.cells.B2.style).toBe(2);

    model.copy({ onlyFormat: true });
    expect(model.state.isCopyingFormat).toBeTruthy();
    model.selectCell(2, 1); // C2
    model.paste({ onlyFormat: true });
    expect(model.state.isCopyingFormat).toBeFalsy();
    expect(model.state.cells.C2.content).toBe("");
    expect(model.state.cells.C2.style).toBe(2);
  });

  test("paste format does not remove content", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.setValue("C2", "c2");
    model.selectCell(1, 1);
    model.setStyle({ bold: true });
    expect(model.state.cells.B2.style).toBe(2);

    model.copy();
    model.selectCell(2, 1); // C2
    model.paste({ onlyFormat: true });
    expect(model.state.cells.C2.content).toBe("c2");
    expect(model.state.cells.C2.style).toBe(2);
  });

  test("can undo a paste format", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.selectCell(1, 1);
    model.setStyle({ bold: true });
    model.copy();
    model.selectCell(2, 1); // C2
    model.paste({ onlyFormat: true });
    expect(model.state.cells.C2.content).toBe("");
    expect(model.state.cells.C2.style).toBe(2);

    model.undo();
    expect(model.state.cells.C2).not.toBeDefined();
  });

  test("can copy and paste a formula and update the refs", () => {
    const model = new GridModel();
    model.setValue("A1", "=SUM(C1:C2)");
    model.selectCell(0, 0);
    model.copy();
    model.selectCell(1, 1);
    model.paste();
    expect(model.state.cells.B2.content).toBe("=SUM(D2:D3)");
  });
});
