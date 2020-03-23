import { GridModel, Zone } from "../../src/model/index";
import "../canvas.mock";
import { toCartesian } from "../../src/helpers";

function zone(str: string): Zone {
  let [tl, br] = str.split(":");
  if (!br) {
    br = tl;
  }
  const [left, top] = toCartesian(tl);
  const [right, bottom] = toCartesian(br);
  return { left, top, right, bottom };
}

function target(str: string): Zone[] {
  return str.split(",").map(zone);
}

describe("clipboard", () => {
  test("can copy and paste a cell", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");

    expect(model.workbook.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" }
    });

    model.dispatch({ type: "COPY", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("D2") });
    expect(model.workbook.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" },
      D2: { col: 3, row: 1, content: "b2", type: "text", value: "b2", xc: "D2" }
    });
    expect(model.state.clipboard.length).toBe(0);
  });

  test("can cut and paste a cell", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    expect(model.workbook.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" }
    });

    model.dispatch({ type: "CUT", target: target("B2") });
    expect(model.workbook.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" }
    });
    model.dispatch({ type: "PASTE", target: target("D2") });

    expect(model.workbook.cells).toEqual({
      D2: { col: 3, row: 1, content: "b2", type: "text", value: "b2", xc: "D2" }
    });

    expect(model.state.clipboard.length).toBe(0);

    // select D3 and paste. it should do nothing
    model.dispatch({ type: "PASTE", target: target("D3:D3") });

    expect(model.workbook.cells.D3).not.toBeDefined();
  });

  test("can copy a cell with style", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setStyle({ bold: true });
    expect(model.workbook.cells.B2.style).toBe(2);

    model.dispatch({ type: "COPY", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("C2") });

    expect(model.workbook.cells.B2.style).toBe(2);
    expect(model.workbook.cells.C2.style).toBe(2);
  });

  test("can copy into a cell with style", () => {
    const model = new GridModel();
    // set value and style in B2
    model.setValue("B2", "b2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setStyle({ bold: true });
    expect(model.workbook.cells.B2.style).toBe(2);

    // set value in A1, select and copy it
    model.setValue("A1", "a1");
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.dispatch({ type: "COPY", target: target("A1") });

    // select B2 again and paste
    model.dispatch({ type: "PASTE", target: target("B2") });

    expect(model.workbook.cells.B2.value).toBe("a1");
    expect(model.workbook.cells.B2.style).not.toBeDefined();
  });

  test("can copy from an empty cell into a cell with style", () => {
    const model = new GridModel();
    // set value and style in B2
    model.setValue("B2", "b2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setStyle({ bold: true });
    expect(model.workbook.cells.B2.style).toBe(2);

    // set value in A1, select and copy it
    model.dispatch({ type: "SELECT_CELL", col: 0, row: 0 });
    model.dispatch({ type: "COPY", target: target("A1") });

    model.dispatch({ type: "PASTE", target: target("B2") });

    expect(model.workbook.cells.B2).not.toBeDefined();
  });

  test("can copy a cell with borders", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setBorder("bottom");
    expect(model.workbook.cells.B2.border).toBe(2);

    model.dispatch({ type: "COPY", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("C2") });

    expect(model.workbook.cells.B2.border).toBe(2);
    expect(model.workbook.cells.C2.border).toBe(2);
  });

  test("can copy a cell with a formatter", () => {
    const model = new GridModel();
    model.setValue("B2", "0.451");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setFormat("0.00%");
    expect(model.getters.getCellText(model.workbook.cells.B2)).toBe("45.10%");

    model.dispatch({ type: "COPY", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("C2") });

    expect(model.getters.getCellText(model.workbook.cells.C2)).toBe("45.10%");
  });

  test("cutting a cell with style remove the cell", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setStyle({ bold: true });

    model.dispatch({ type: "CUT", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("C2") });

    expect(model.workbook.cells).toEqual({
      C2: { col: 2, style: 2, row: 1, content: "b2", type: "text", value: "b2", xc: "C2" }
    });
  });

  test("getClipboardContent export formatted string", () => {
    const model = new GridModel();
    model.setValue("B2", "abc");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "COPY", target: target("B2") });
    expect(model.getters.getClipboardContent()).toBe("abc");

    model.setValue("B2", "= 1 + 2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "COPY", target: target("B2") });
    expect(model.getters.getClipboardContent()).toBe("3");
  });

  test("can copy a rectangular selection", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.setValue("B3", "b3");
    model.setValue("C2", "c2");
    model.setValue("C3", "c3");

    model.dispatch({ type: "COPY", target: target("B2:C3") });

    expect(model.workbook.cells.D1).not.toBeDefined();
    expect(model.workbook.cells.D2).not.toBeDefined();
    expect(model.workbook.cells.E1).not.toBeDefined();
    expect(model.workbook.cells.E2).not.toBeDefined();

    model.dispatch({ type: "PASTE", target: target("D1:D1") });

    expect(model.workbook.cells.D1.content).toBe("b2");
    expect(model.workbook.cells.D2.content).toBe("b3");
    expect(model.workbook.cells.E1.content).toBe("c2");
    expect(model.workbook.cells.E2.content).toBe("c3");
  });

  test("empty clipboard: getClipboardContent returns a tab", () => {
    const model = new GridModel();
    expect(model.getters.getClipboardContent()).toBe("\t");
  });

  test("getClipboardContent exports multiple cells", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.setValue("B3", "b3");
    model.setValue("C2", "c2");
    model.setValue("C3", "c3");
    model.dispatch({ type: "COPY", target: target("B2:C3") });
    expect(model.getters.getClipboardContent()).toBe("b2\tc2\nb3\tc3");
  });

  test("can paste multiple cells from os clipboard", () => {
    const model = new GridModel();
    model.dispatch({ type: "PASTE_FROM_OS_CLIPBOARD", text: "a\t1\nb\t2", target: target("C1") });

    expect(model.workbook.cells.C1.content).toBe("a");
    expect(model.workbook.cells.C2.content).toBe("b");
    expect(model.workbook.cells.D1.content).toBe("1");
    expect(model.workbook.cells.D2.content).toBe("2");
  });

  test("pasting numbers from windows clipboard => interpreted as number", () => {
    const model = new GridModel();
    model.dispatch({ type: "PASTE_FROM_OS_CLIPBOARD", text: "1\r\n2\r\n3", target: target("C1") });

    expect(model.workbook.cells.C1.content).toBe("1");
    expect(model.workbook.cells.C1.type).toBe("number");
    expect(model.workbook.cells.C2.content).toBe("2");
    expect(model.workbook.cells.C2.type).toBe("number");
    expect(model.workbook.cells.C3.content).toBe("3");
    expect(model.workbook.cells.C3.type).toBe("number");
  });

  test("incompatible multiple selections: only last one is actually copied", () => {
    const model = new GridModel();
    model.setValue("A1", "a1");
    model.setValue("A2", "a2");
    model.setValue("C1", "c1");
    model.dispatch({ type: "COPY", target: target("A1:A2,C1") });

    const clipboard = model.state.clipboard;
    expect(clipboard.length).toBe(1);

    model.dispatch({ type: "SELECT_CELL", col: 4, row: 0 });
    model.dispatch({ type: "PASTE", target: target("E1") });
    expect(model.workbook.cells.E1.content).toBe("c1");
    expect(model.workbook.cells.E2).not.toBeDefined();
  });

  test("compatible multiple selections: each column is copied", () => {
    const model = new GridModel();
    model.setValue("A1", "a1");
    model.setValue("A2", "a2");
    model.setValue("C1", "c1");
    model.setValue("C2", "c2");
    model.dispatch({ type: "COPY", target: target("A1:A2,C1:C2") });

    const clipboard = model.state.clipboard;
    expect(clipboard.length).toBe(2);

    model.dispatch({ type: "PASTE", target: target("E1") });
    expect(model.workbook.cells.E1.content).toBe("a1");
    expect(model.workbook.cells.E2.content).toBe("a2");
    expect(model.workbook.cells.F1.content).toBe("c1");
    expect(model.workbook.cells.F2.content).toBe("c2");
  });

  test("pasting a value in a larger selection", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.dispatch({ type: "COPY", target: target("A1:A1") });

    model.dispatch({ type: "PASTE", target: target("C2:E3") });
    expect(model.workbook.cells.C2.content).toBe("1");
    expect(model.workbook.cells.C3.content).toBe("1");
    expect(model.workbook.cells.D2.content).toBe("1");
    expect(model.workbook.cells.D3.content).toBe("1");
    expect(model.workbook.cells.E2.content).toBe("1");
    expect(model.workbook.cells.E3.content).toBe("1");
  });

  test("selection is updated to contain exactly the new pasted zone", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.dispatch({ type: "COPY", target: target("A1:A2") });

    model.dispatch({ type: "SELECT_CELL", col: 2, row: 0 });
    model.updateSelection(2, 2); // select C1:C3
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, left: 2, bottom: 2, right: 2 });
    model.dispatch({ type: "PASTE", target: target("C1:C3") });
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, left: 2, bottom: 1, right: 2 });
    expect(model.workbook.cells.C1.content).toBe("1");
    expect(model.workbook.cells.C2.content).toBe("2");
    expect(model.workbook.cells.C3).not.toBeDefined();
  });

  test("selection is not changed if pasting a single value into two zones", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.dispatch({ type: "COPY", target: [zone("A1:A1")] });

    model.dispatch({ type: "SELECT_CELL", col: 2, row: 0 });
    model.dispatch({ type: "SELECT_CELL", col: 4, row: 0, createNewRange: true });

    model.dispatch({ type: "PASTE", target: target("C1,E1") });
    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, left: 2, bottom: 0, right: 2 });
    expect(model.workbook.selection.zones[1]).toEqual({ top: 0, left: 4, bottom: 0, right: 4 });
  });

  test("pasting a value in multiple zones", () => {
    const model = new GridModel();
    model.setValue("A1", "33");
    model.dispatch({ type: "COPY", target: target("A1:A1") });

    model.dispatch({ type: "PASTE", target: target("C1,E1") });

    expect(model.workbook.cells.C1.content).toBe("33");
    expect(model.workbook.cells.E1.content).toBe("33");
  });

  test("pasting is not allowed if multiple selection and more than one value", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.dispatch({ type: "COPY", target: target("A1:A2") });

    const result = model.dispatch({ type: "PASTE", target: target("C1,E1") });

    expect(result).toEqual("CANCELLED");
  });

  test("can copy and paste a cell with STRING content", () => {
    const model = new GridModel();
    model.setValue("B2", '="test"');

    expect(model.workbook.cells["B2"].content).toEqual('="test"');
    expect(model.workbook.cells["B2"].value).toEqual("test");

    model.dispatch({ type: "COPY", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("D2") });
    expect(model.workbook.cells["B2"].content).toEqual('="test"');
    expect(model.workbook.cells["B2"].value).toEqual("test");
    expect(model.workbook.cells["D2"].content).toEqual('="test"');
    expect(model.workbook.cells["D2"].value).toEqual("test");
    expect(model.state.clipboard).toEqual([]);
  });

  test("can undo a paste operation", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");

    model.dispatch({ type: "COPY", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("D2") });
    expect(model.workbook.cells.D2).toBeDefined();
    model.undo();
    expect(model.workbook.cells.D2).not.toBeDefined();
  });

  test("can paste-format a cell with style", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setStyle({ bold: true });
    expect(model.workbook.cells.B2.style).toBe(2);

    model.dispatch({ type: "COPY", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("C2"), onlyFormat: true });
    expect(model.workbook.cells.C2.content).toBe("");
    expect(model.workbook.cells.C2.style).toBe(2);
  });

  test("can copy and paste format", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setStyle({ bold: true });
    expect(model.workbook.cells.B2.style).toBe(2);

    model.dispatch({ type: "COPY", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("C2"), onlyFormat: true });
    expect(model.workbook.cells.C2.content).toBe("");
    expect(model.workbook.cells.C2.style).toBe(2);
  });

  test("paste format does not remove content", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.setValue("C2", "c2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setStyle({ bold: true });
    expect(model.workbook.cells.B2.style).toBe(2);

    model.dispatch({ type: "COPY", target: target("B2") });
    model.dispatch({ type: "PASTE", target: target("C2"), onlyFormat: true });

    expect(model.workbook.cells.C2.content).toBe("c2");
    expect(model.workbook.cells.C2.style).toBe(2);
  });

  test("can undo a paste format", () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setStyle({ bold: true });
    model.dispatch({ type: "COPY", target: [zone("B2:B2")] });
    model.dispatch({ type: "PASTE", target: target("C2"), onlyFormat: true });

    expect(model.workbook.cells.C2.content).toBe("");
    expect(model.workbook.cells.C2.style).toBe(2);

    model.undo();
    expect(model.workbook.cells.C2).not.toBeDefined();
  });

  test("can copy and paste a formula and update the refs", () => {
    const model = new GridModel();
    model.setValue("A1", "=SUM(C1:C2)");
    model.dispatch({ type: "COPY", target: target("A1") });
    model.dispatch({ type: "PASTE", target: target("B2") });
    expect(model.workbook.cells.B2.content).toBe("=SUM(D2:D3)");
  });

  test.each([
    ["=SUM(C1:C2)", "=SUM(D2:D3)"],
    ["=$C1", "=$C2"],
    ["=SUM($C1:D$1)", "=SUM($C2:E$1)"]
  ])("can copy and paste formula with $refs", (value, expected) => {
    const model = new GridModel();
    model.setValue("A1", value);
    model.dispatch({ type: "COPY", target: target("A1") });
    model.dispatch({ type: "PASTE", target: target("B2") });
    expect(model.workbook.cells.B2.content).toBe(expected);
  });

  test("can copy format from empty cell to another cell to clear format", () => {
    const model = new GridModel();

    // write something in B2 and set its format
    model.setValue("B2", "b2");
    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.setStyle({ bold: true });
    expect(model.workbook.cells.B2.style).toBe(2);

    // select A1 and copy format
    model.dispatch({ type: "COPY", target: target("A1") });

    // select B2 and paste format
    model.dispatch({ type: "PASTE", target: target("B2"), onlyFormat: true });

    expect(model.workbook.cells.B2.content).toBe("b2");
    expect(model.workbook.cells.B2.style).not.toBeDefined();
  });
});
