import { Model } from "../../src/model";
import { CancelledReason, Zone, ConditionalFormat, Style } from "../../src/types/index";
import "../canvas.mock";
import { ClipboardPlugin } from "../../src/plugins/clipboard";
import { getCell, getGrid, target, zone } from "../helpers";

function getClipboardVisibleZones(model: Model): Zone[] {
  const clipboardPlugin = (model as any).handlers.find((h) => h instanceof ClipboardPlugin);
  return clipboardPlugin.status === "visible" ? clipboardPlugin.zones : [];
}

function createEqualCF(
  ranges: string[],
  value: string,
  style: Style,
  id: string
): ConditionalFormat {
  return {
    ranges,
    id,
    rule: { values: [value], operator: "Equal", type: "CellIsRule", style },
  };
}

describe("clipboard", () => {
  test("can copy and paste a cell", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });

    expect(model["workbook"].activeSheet.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" },
    });

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("D2") });
    expect(model["workbook"].activeSheet.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" },
      D2: { col: 3, row: 1, content: "b2", type: "text", value: "b2", xc: "D2" },
    });
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can cut and paste a cell", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    expect(model["workbook"].activeSheet.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" },
    });

    model.dispatch("CUT", { target: target("B2") });
    expect(model["workbook"].activeSheet.cells).toEqual({
      B2: { col: 1, row: 1, content: "b2", type: "text", value: "b2", xc: "B2" },
    });
    model.dispatch("PASTE", { target: target("D2") });

    expect(model["workbook"].activeSheet.cells).toEqual({
      D2: { col: 3, row: 1, content: "b2", type: "text", value: "b2", xc: "D2" },
    });

    expect(getClipboardVisibleZones(model).length).toBe(0);

    // select D3 and paste. it should do nothing
    model.dispatch("PASTE", { target: target("D3:D3") });

    expect(getCell(model, "D3")).toBeNull();
  });

  test("paste without copied value", () => {
    const model = new Model();
    const result = model.dispatch("PASTE", { target: target("D2") });
    expect(result).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.EmptyClipboard,
    });
  });

  test("paste zones without copied value", () => {
    const model = new Model();
    const zones = target("A1,B2");
    const pasteZone = model.getters.getPasteZones(zones);
    expect(pasteZone).toEqual(zones);
  });

  test("can cut and paste a cell in differents sheets", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "a1" });
    model.dispatch("CUT", { target: target("A1") });
    const to = model.getters.getActiveSheet();
    model.dispatch("CREATE_SHEET", { activate: true, id: "42" });
    const from = model.getters.getActiveSheet();
    model.dispatch("SET_VALUE", { xc: "A1", text: "a1Sheet2" });
    model.dispatch("PASTE", { target: target("B2") });
    expect(model["workbook"].activeSheet.cells).toEqual({
      A1: { col: 0, row: 0, content: "a1Sheet2", type: "text", value: "a1Sheet2", xc: "A1" },
      B2: { col: 1, row: 1, content: "a1", type: "text", value: "a1", xc: "B2" },
    });
    model.dispatch("ACTIVATE_SHEET", { from, to });
    expect(model["workbook"].activeSheet.cells).toEqual({});

    expect(getClipboardVisibleZones(model).length).toBe(0);

    // select D3 and paste. it should do nothing
    model.dispatch("PASTE", { target: target("D3:D3") });

    expect(getCell(model, "D3")).toBeNull();
  });

  test("can cut and paste a zone inside the cut zone", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "a1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "a2" });

    model.dispatch("CUT", { target: target("A1:A2") });
    expect(getGrid(model)).toEqual({ A1: "a1", A2: "a2" });

    model.dispatch("PASTE", { target: target("A2") });
    expect(getGrid(model)).toEqual({ A2: "a1", A3: "a2" });
  });

  test("can copy a cell with style", () => {
    const model = new Model();
    const sheet1 = model["workbook"].activeSheet.id;
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: sheet1,
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toBe(2);

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("C2") });

    expect(getCell(model, "B2")!.style).toBe(2);
    expect(getCell(model, "C2")!.style).toBe(2);
  });

  test("can copy into a cell with style", () => {
    const model = new Model();
    // set value and style in B2
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toBe(2);

    // set value in A1, select and copy it
    model.dispatch("SET_VALUE", { xc: "A1", text: "a1" });
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("COPY", { target: target("A1") });

    // select B2 again and paste
    model.dispatch("PASTE", { target: target("B2") });

    expect(getCell(model, "B2")!.value).toBe("a1");
    expect(getCell(model, "B2")!.style).not.toBeDefined();
  });

  test("can copy from an empty cell into a cell with style", () => {
    const model = new Model();
    const sheet1 = model["workbook"].activeSheet.id;
    // set value and style in B2
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: sheet1,
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toBe(2);

    // set value in A1, select and copy it
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("COPY", { target: target("A1") });

    model.dispatch("PASTE", { target: target("B2") });

    expect(getCell(model, "B2")).toBeNull();
  });

  test("can copy a cell with borders", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
      border: "bottom",
    });
    expect(getCell(model, "B2")!.border).toBe(2);

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("C2") });

    expect(getCell(model, "B2")!.border).toBe(2);
    expect(getCell(model, "C2")!.border).toBe(2);
  });

  test("can copy a cell with a formatter", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "0.451" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTER", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
      formatter: "0.00%",
    });
    expect(model.getters.getCellText(getCell(model, "B2")!)).toBe("45.10%");

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("C2") });

    expect(model.getters.getCellText(getCell(model, "C2")!)).toBe("45.10%");
  });

  test("can copy and paste merged content", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          merges: ["B1:C2"],
        },
      ],
    });
    model.dispatch("COPY", { target: target("B1") });
    model.dispatch("PASTE", { target: target("B4") });
    expect(model.getters.isInMerge("B4")).toBe(true);
    expect(model.getters.isInMerge("B5")).toBe(true);
    expect(model.getters.isInMerge("C4")).toBe(true);
    expect(model.getters.isInMerge("B5")).toBe(true);
  });

  test("can cut and paste merged content", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          merges: ["B1:C2"],
        },
      ],
    });
    model.dispatch("CUT", { target: target("B1") });
    model.dispatch("PASTE", { target: target("B4") });
    expect(model.getters.isInMerge("B1")).toBe(false);
    expect(model.getters.isInMerge("B2")).toBe(false);
    expect(model.getters.isInMerge("C1")).toBe(false);
    expect(model.getters.isInMerge("B2")).toBe(false);
    expect(model.getters.isInMerge("B4")).toBe(true);
    expect(model.getters.isInMerge("B5")).toBe(true);
    expect(model.getters.isInMerge("C4")).toBe(true);
    expect(model.getters.isInMerge("B5")).toBe(true);
  });

  test("paste on existing merge removes existing merge", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          merges: ["B2:C4"],
        },
      ],
    });
    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("A1") });
    expect(model.getters.isInMerge("B2")).toBe(true);
    expect(model.getters.isInMerge("B3")).toBe(true);
    expect(model.getters.isInMerge("B4")).toBe(false);
    expect(model.getters.isInMerge("C2")).toBe(false);
    expect(model.getters.isInMerge("C3")).toBe(false);
    expect(model.getters.isInMerge("C4")).toBe(false);
  });

  test("copy/paste a merge from one page to another", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          merges: ["B2:C3"],
        },
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    const sheet1 = model["workbook"].visibleSheets[0];
    const sheet2 = model["workbook"].visibleSheets[1];
    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("ACTIVATE_SHEET", { from: sheet1, to: sheet2 });
    model.dispatch("PASTE", { target: target("A1") });
    expect(model.getters.isInMerge("A1")).toBe(true);
    expect(model.getters.isInMerge("A2")).toBe(true);
    expect(model.getters.isInMerge("B1")).toBe(true);
    expect(model.getters.isInMerge("B2")).toBe(true);
  });

  test("Pasting content that will destroy a merge will ask for confirmation", async () => {
    const askConfirmation = jest.fn();
    const model = new Model(
      {
        sheets: [
          {
            colNumber: 5,
            rowNumber: 5,
            merges: ["B2:C3"],
          },
          {
            colNumber: 5,
            rowNumber: 5,
          },
        ],
      },
      { askConfirmation }
    );

    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    const selection = model.getters.getSelection().zones;
    model.dispatch("COPY", { target: selection });

    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    model.dispatch("PASTE", { target: model.getters.getSelectedZones(), interactive: true });
    expect(askConfirmation).toHaveBeenCalled();
  });

  test("Pasting content that will destroy a merge will fail if not forced", async () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          merges: ["B2:C3"],
        },
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });

    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    const selection = model.getters.getSelection().zones;
    model.dispatch("COPY", { target: selection });
    const result = model.dispatch("PASTE", { target: target("A1") });
    expect(result).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WillRemoveExistingMerge,
    });
    expect(model.getters.isInMerge("A1")).toBe(false);
    expect(model.getters.isInMerge("A2")).toBe(false);
    expect(model.getters.isInMerge("B1")).toBe(false);
    expect(model.getters.isInMerge("B2")).toBe(true);
    expect(model.getters.isInMerge("B3")).toBe(true);
    expect(model.getters.isInMerge("C2")).toBe(true);
    expect(model.getters.isInMerge("C3")).toBe(true);
  });

  test("Pasting content that will destroy a merge will be applied if forced", async () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
          merges: ["B2:C3"],
        },
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    const selection = model.getters.getSelection().zones;
    model.dispatch("COPY", { target: selection });
    model.dispatch("PASTE", { target: target("A1"), force: true });
    expect(model.getters.isInMerge("A1")).toBe(true);
    expect(model.getters.isInMerge("A2")).toBe(true);
    expect(model.getters.isInMerge("B1")).toBe(true);
    expect(model.getters.isInMerge("B2")).toBe(true);
    expect(model.getters.isInMerge("B3")).toBe(false);
    expect(model.getters.isInMerge("C2")).toBe(false);
    expect(model.getters.isInMerge("C3")).toBe(false);
  });

  test("cutting a cell with style remove the cell", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });

    model.dispatch("CUT", { target: target("B2") });
    model.dispatch("PASTE", { target: target("C2") });

    expect(model["workbook"].activeSheet.cells).toEqual({
      C2: { col: 2, style: 2, row: 1, content: "b2", type: "text", value: "b2", xc: "C2" },
    });
  });

  test("getClipboardContent export formatted string", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "abc" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("COPY", { target: target("B2") });
    expect(model.getters.getClipboardContent()).toBe("abc");

    model.dispatch("SET_VALUE", { xc: "B2", text: "= 1 + 2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("COPY", { target: target("B2") });
    expect(model.getters.getClipboardContent()).toBe("3");
  });

  test("can copy a rectangular selection", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SET_VALUE", { xc: "B3", text: "b3" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "c2" });
    model.dispatch("SET_VALUE", { xc: "C3", text: "c3" });

    model.dispatch("COPY", { target: target("B2:C3") });

    expect(getCell(model, "D1")).toBeNull();
    expect(getCell(model, "D2")).toBeNull();
    expect(getCell(model, "E1")).toBeNull();
    expect(getCell(model, "E2")).toBeNull();

    model.dispatch("PASTE", { target: target("D1:D1") });

    expect(getCell(model, "D1")!.content).toBe("b2");
    expect(getCell(model, "D2")!.content).toBe("b3");
    expect(getCell(model, "E1")!.content).toBe("c2");
    expect(getCell(model, "E2")!.content).toBe("c3");
  });

  test("empty clipboard: getClipboardContent returns a tab", () => {
    const model = new Model();
    expect(model.getters.getClipboardContent()).toBe("\t");
  });

  test("getClipboardContent exports multiple cells", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SET_VALUE", { xc: "B3", text: "b3" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "c2" });
    model.dispatch("SET_VALUE", { xc: "C3", text: "c3" });
    model.dispatch("COPY", { target: target("B2:C3") });
    expect(model.getters.getClipboardContent()).toBe("b2\tc2\nb3\tc3");
  });

  test("can paste multiple cells from os clipboard", () => {
    const model = new Model();
    model.dispatch("PASTE_FROM_OS_CLIPBOARD", { text: "a\t1\nb\t2", target: target("C1") });

    expect(getCell(model, "C1")!.content).toBe("a");
    expect(getCell(model, "C2")!.content).toBe("b");
    expect(getCell(model, "D1")!.content).toBe("1");
    expect(getCell(model, "D2")!.content).toBe("2");
  });

  test("pasting numbers from windows clipboard => interpreted as number", () => {
    const model = new Model();
    model.dispatch("PASTE_FROM_OS_CLIPBOARD", { text: "1\r\n2\r\n3", target: target("C1") });

    expect(getCell(model, "C1")!.content).toBe("1");
    expect(getCell(model, "C1")!.type).toBe("number");
    expect(getCell(model, "C2")!.content).toBe("2");
    expect(getCell(model, "C2")!.type).toBe("number");
    expect(getCell(model, "C3")!.content).toBe("3");
    expect(getCell(model, "C3")!.type).toBe("number");
  });

  test("incompatible multiple selections: only last one is actually copied", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "a1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "a2" });
    model.dispatch("SET_VALUE", { xc: "C1", text: "c1" });
    model.dispatch("COPY", { target: target("A1:A2,C1") });

    expect(getClipboardVisibleZones(model).length).toBe(1);

    model.dispatch("SELECT_CELL", { col: 4, row: 0 });
    model.dispatch("PASTE", { target: target("E1") });
    expect(getCell(model, "E1")!.content).toBe("c1");
    expect(getCell(model, "E2")).toBeNull();
  });

  test("compatible multiple selections: each column is copied", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "a1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "a2" });
    model.dispatch("SET_VALUE", { xc: "C1", text: "c1" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "c2" });
    model.dispatch("COPY", { target: target("A1:A2,C1:C2") });

    expect(getClipboardVisibleZones(model).length).toBe(2);

    model.dispatch("PASTE", { target: target("E1") });
    expect(getCell(model, "E1")!.content).toBe("a1");
    expect(getCell(model, "E2")!.content).toBe("a2");
    expect(getCell(model, "F1")!.content).toBe("c1");
    expect(getCell(model, "F2")!.content).toBe("c2");
  });

  test("pasting a value in a larger selection", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("COPY", { target: target("A1:A1") });

    model.dispatch("PASTE", { target: target("C2:E3") });
    expect(getCell(model, "C2")!.content).toBe("1");
    expect(getCell(model, "C3")!.content).toBe("1");
    expect(getCell(model, "D2")!.content).toBe("1");
    expect(getCell(model, "D3")!.content).toBe("1");
    expect(getCell(model, "E2")!.content).toBe("1");
    expect(getCell(model, "E3")!.content).toBe("1");
  });

  test("selection is updated to contain exactly the new pasted zone", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("COPY", { target: target("A1:A2") });

    // select C1:C3
    model.dispatch("SELECT_CELL", { col: 2, row: 0 });
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 2, right: 2 });
    model.dispatch("PASTE", { target: target("C1:C3") });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 1, right: 2 });
    expect(getCell(model, "C1")!.content).toBe("1");
    expect(getCell(model, "C2")!.content).toBe("2");
    expect(getCell(model, "C3")).toBeNull();
  });

  test("selection is not changed if pasting a single value into two zones", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("COPY", { target: [zone("A1:A1")] });

    model.dispatch("SELECT_CELL", { col: 2, row: 0 });
    model.dispatch("START_SELECTION_EXPANSION");
    model.dispatch("SELECT_CELL", { col: 4, row: 0 });

    model.dispatch("PASTE", { target: target("C1,E1") });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 0, right: 2 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ top: 0, left: 4, bottom: 0, right: 4 });
  });

  test("pasting a value in multiple zones", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "33" });
    model.dispatch("COPY", { target: target("A1:A1") });

    model.dispatch("PASTE", { target: target("C1,E1") });

    expect(getCell(model, "C1")!.content).toBe("33");
    expect(getCell(model, "E1")!.content).toBe("33");
  });

  test("pasting is not allowed if multiple selection and more than one value", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("COPY", { target: target("A1:A2") });
    const result = model.dispatch("PASTE", { target: target("C1,E1") });

    expect(result).toEqual({ status: "CANCELLED", reason: CancelledReason.WrongPasteSelection });
  });

  test("pasting with multiple selection and more than one value will warn user", async () => {
    const notifyUser = jest.fn();
    const model = new Model({}, { notifyUser });
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("COPY", { target: target("A1:A2") });

    model.dispatch("SELECT_CELL", { col: 2, row: 3 });
    model.dispatch("START_SELECTION_EXPANSION");
    model.dispatch("SELECT_CELL", { col: 4, row: 5 });
    model.dispatch("PASTE", { target: model.getters.getSelectedZones(), interactive: true });
    expect(notifyUser).toHaveBeenCalled();
  });

  test("can copy and paste a cell with STRING content", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: '="test"' });

    expect(model["workbook"].activeSheet.cells["B2"].content).toEqual('="test"');
    expect(model["workbook"].activeSheet.cells["B2"].value).toEqual("test");

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("D2") });
    expect(model["workbook"].activeSheet.cells["B2"].content).toEqual('="test"');
    expect(model["workbook"].activeSheet.cells["B2"].value).toEqual("test");
    expect(model["workbook"].activeSheet.cells["D2"].content).toEqual('="test"');
    expect(model["workbook"].activeSheet.cells["D2"].value).toEqual("test");
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can undo a paste operation", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("D2") });
    expect(getCell(model, "D2")).toBeDefined();
    model.dispatch("UNDO");
    expect(getCell(model, "D2")).toBeNull();
  });

  test("can paste-format a cell with style", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toBe(2);

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("C2"), onlyFormat: true });
    expect(getCell(model, "C2")!.content).toBe("");
    expect(getCell(model, "C2")!.style).toBe(2);
  });

  test("can copy and paste format", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toBe(2);

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("C2"), onlyFormat: true });
    expect(getCell(model, "C2")!.content).toBe("");
    expect(getCell(model, "C2")!.style).toBe(2);
  });

  test("paste format does not remove content", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "c2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toBe(2);

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("C2"), onlyFormat: true });

    expect(getCell(model, "C2")!.content).toBe("c2");
    expect(getCell(model, "C2")!.style).toBe(2);
  });

  test("can undo a paste format", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    model.dispatch("COPY", { target: [zone("B2:B2")] });
    model.dispatch("PASTE", { target: target("C2"), onlyFormat: true });

    expect(getCell(model, "C2")!.content).toBe("");
    expect(getCell(model, "C2")!.style).toBe(2);

    model.dispatch("UNDO");
    expect(getCell(model, "C2")).toBeNull();
  });

  test("can copy and paste a formula and update the refs", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=SUM(C1:C2)" });
    model.dispatch("COPY", { target: target("A1") });
    model.dispatch("PASTE", { target: target("B2") });
    expect(getCell(model, "B2")!.content).toBe("=SUM(D2:D3)");
  });

  test.each([
    ["=SUM(C1:C2)", "=SUM(D2:D3)"],
    ["=$C1", "=$C2"],
    ["=SUM($C1:D$1)", "=SUM($C2:E$1)"],
  ])("can copy and paste formula with $refs", (value, expected) => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: value });
    model.dispatch("COPY", { target: target("A1") });
    model.dispatch("PASTE", { target: target("B2") });
    expect(getCell(model, "B2")!.content).toBe(expected);
  });

  test("can copy format from empty cell to another cell to clear format", () => {
    const model = new Model();

    // write something in B2 and set its format
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toBe(2);

    // select A1 and copy format
    model.dispatch("COPY", { target: target("A1") });

    // select B2 and paste format
    model.dispatch("PASTE", { target: target("B2"), onlyFormat: true });

    expect(getCell(model, "B2")!.content).toBe("b2");
    expect(getCell(model, "B2")!.style).not.toBeDefined();
  });

  test("can copy and paste a conditional formatted cell", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("SET_VALUE", { xc: "C1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1"),
      sheet: model.getters.getActiveSheet(),
    });
    model.dispatch("COPY", { target: target("A1") });
    model.dispatch("PASTE", { target: target("C1") });
    model.dispatch("COPY", { target: target("A2") });
    model.dispatch("PASTE", { target: target("C2") });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toBeUndefined();
    expect(model.getters.getConditionalStyle("C1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("C2")).toBeUndefined();
  });
  test("can cut and paste a conditional formatted cell", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("SET_VALUE", { xc: "C1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1"),
      sheet: model.getters.getActiveSheet(),
    });
    model.dispatch("CUT", { target: target("A1") });
    model.dispatch("PASTE", { target: target("C1") });
    model.dispatch("CUT", { target: target("A2") });
    model.dispatch("PASTE", { target: target("C2") });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toBeUndefined();
    expect(model.getters.getConditionalStyle("C1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("C2")).toBeUndefined();
  });

  test("can copy and paste a conditional formatted zone", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1"),
      sheet: model.getters.getActiveSheet(),
    });
    model.dispatch("COPY", { target: target("A1:A2") });
    model.dispatch("PASTE", { target: target("B1") });
    model.dispatch("PASTE", { target: target("C1") });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toBeUndefined();
    expect(model.getters.getConditionalStyle("B1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("B2")).toBeUndefined();
    expect(model.getters.getConditionalStyle("C1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("C2")).toBeUndefined();
    model.dispatch("SET_VALUE", { xc: "C1", text: "2" });
    model.dispatch("SET_VALUE", { xc: "C2", text: "1" });
    expect(model.getters.getConditionalStyle("C1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("C2")).toEqual({ fillColor: "#FF0000" });
  });

  test("can cut and paste a conditional formatted zone", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1"),
      sheet: model.getters.getActiveSheet(),
    });
    model.dispatch("CUT", { target: target("A1:A2") });
    model.dispatch("PASTE", { target: target("B1") });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toBeUndefined();
    expect(model.getters.getConditionalStyle("B1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("B2")).toBeUndefined();
    model.dispatch("SET_VALUE", { xc: "B1", text: "2" });
    model.dispatch("SET_VALUE", { xc: "B2", text: "1" });
    expect(model.getters.getConditionalStyle("B1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("B2")).toEqual({ fillColor: "#FF0000" });
  });

  test("can copy and paste a conditional formatted cell to another page", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
        },
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    const sheet1 = model["workbook"].visibleSheets[0];
    const sheet2 = model["workbook"].visibleSheets[1];

    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1"),
      sheet: model.getters.getActiveSheet(),
    });
    model.dispatch("COPY", { target: target("A1:A2") });
    model.dispatch("ACTIVATE_SHEET", { from: sheet1, to: sheet2 });
    model.dispatch("PASTE", { target: target("A1") });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toBeUndefined();
    model.dispatch("SET_VALUE", { xc: "A1", text: "2" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "1" });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
  });

  test("can cut and paste a conditional formatted cell to another page", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
        },
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    const sheet1 = model["workbook"].visibleSheets[0];
    const sheet2 = model["workbook"].visibleSheets[1];
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "2" });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1", "A2"], "1", { fillColor: "#FF0000" }, "1"),
      sheet: model.getters.getActiveSheet(),
    });
    model.dispatch("CUT", { target: target("A1:A2") });
    model.dispatch("ACTIVATE_SHEET", { from: sheet1, to: sheet2 });
    model.dispatch("PASTE", { target: target("A1") });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toBeUndefined();
    model.dispatch("SET_VALUE", { xc: "A1", text: "2" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "1" });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
    model.dispatch("ACTIVATE_SHEET", { from: sheet2, to: sheet1 });
    expect(model.getters.getConditionalStyle("A1")).toBeUndefined();
    expect(model.getters.getConditionalStyle("A2")).toBeUndefined();
  });

  test("can copy and paste a cell which contains a cross-sheet reference", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { id: "42", name: "Sheet2" });
    model.dispatch("SET_VALUE", { xc: "B2", text: "=Sheet2!B2" });

    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("B3") });
    expect(model.getters.getCell(1, 2)!.content).toBe("=Sheet2!B3");
  });

  test("can copy and paste a cell which contains a cross-sheet reference in a smaller sheet", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { id: "42", name: "Sheet2", rows: 2, cols: 2 });
    model.dispatch("SET_VALUE", { xc: "A1", text: "=Sheet2!A1:A2" });

    model.dispatch("COPY", { target: target("A1") });
    model.dispatch("PASTE", { target: target("A2") });
    expect(model.getters.getCell(0, 1)!.content).toBe("=#REF");
  });
});

describe("clipboard: pasting outside of sheet", () => {
  test("can copy and paste a full column", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "txt" });

    const currentRowNumber = model["workbook"].activeSheet.rows.length;

    model.dispatch("COPY", { target: [model.getters.getColsZone(0, 0)] });
    model.dispatch("PASTE", { target: target("B2") });
    expect(model["workbook"].activeSheet.rows.length).toBe(currentRowNumber + 1);
    expect(getCell(model, "B2")!.content).toBe("txt");
  });

  test("can copy and paste a full row", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "txt" });

    const currentColNumber = model["workbook"].activeSheet.cols.length;

    model.dispatch("COPY", { target: [model.getters.getRowsZone(0, 0)] });
    model.dispatch("PASTE", { target: target("B2") });
    expect(model["workbook"].activeSheet.cols.length).toBe(currentColNumber + 1);
    expect(getCell(model, "B2")!.content).toBe("txt");
  });
});
