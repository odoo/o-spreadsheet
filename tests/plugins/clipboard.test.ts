import { toCartesian, toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { ClipboardPlugin } from "../../src/plugins/ui/clipboard";
import { CommandResult, Zone } from "../../src/types/index";
import {
  activateSheet,
  createSheet,
  selectCell,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import { getBorder, getCell, getCellContent, getCellText } from "../test_helpers/getters_helpers";
import { createEqualCF, getGrid, target } from "../test_helpers/helpers";

function getClipboardVisibleZones(model: Model): Zone[] {
  const clipboardPlugin = (model as any).handlers.find((h) => h instanceof ClipboardPlugin);
  return clipboardPlugin.status === "visible" ? clipboardPlugin.zones : [];
}

describe("clipboard", () => {
  test("can copy and paste a cell", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");

    expect(getCell(model, "B2")).toMatchObject({ content: "b2", type: "text", value: "b2" });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("D2")] });
    expect(getCell(model, "B2")).toMatchObject({ content: "b2", type: "text", value: "b2" });
    expect(getCell(model, "D2")).toMatchObject({ content: "b2", type: "text", value: "b2" });
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can cut and paste a cell", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    expect(getCell(model, "B2")).toMatchObject({ content: "b2", type: "text", value: "b2" });

    model.dispatch("CUT", { target: [toZone("B2")] });
    expect(getCell(model, "B2")).toMatchObject({ content: "b2", type: "text", value: "b2" });
    model.dispatch("PASTE", { target: [toZone("D2")] });

    expect(getCell(model, "B2")).toBeUndefined();
    expect(getCell(model, "D2")).toMatchObject({ content: "b2", type: "text", value: "b2" });

    expect(getClipboardVisibleZones(model).length).toBe(0);

    // select D3 and paste. it should do nothing
    model.dispatch("PASTE", { target: [toZone("D3:D3")] });

    expect(getCell(model, "D3")).toBeUndefined();
  });

  test("paste without copied value", () => {
    const model = new Model();
    const result = model.dispatch("PASTE", { target: [toZone("D2")] });
    expect(result).toBe(CommandResult.EmptyClipboard);
  });

  test("paste zones without copied value", () => {
    const model = new Model();
    const zones = [toZone("A1"), toZone("B2")];
    const pasteZone = model.getters.getPasteZones(zones);
    expect(pasteZone).toEqual(zones);
  });

  test("can cut and paste a cell in different sheets", () => {
    const model = new Model();
    setCellContent(model, "A1", "a1");
    model.dispatch("CUT", { target: [toZone("A1")] });
    const to = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    setCellContent(model, "A1", "a1Sheet2");
    model.dispatch("PASTE", { target: [toZone("B2")] });
    expect(getCell(model, "A1")).toMatchObject({
      content: "a1Sheet2",
      type: "text",
      value: "a1Sheet2",
    });
    expect(getCell(model, "B2")).toMatchObject({ content: "a1", type: "text", value: "a1" });
    activateSheet(model, to);
    expect(model.getters.getCells(to)).toEqual({});

    expect(getClipboardVisibleZones(model).length).toBe(0);

    // select D3 and paste. it should do nothing
    model.dispatch("PASTE", { target: [toZone("D3:D3")] });

    expect(getCell(model, "D3")).toBeUndefined();
  });

  test("can cut and paste a zone inside the cut zone", () => {
    const model = new Model();
    setCellContent(model, "A1", "a1");
    setCellContent(model, "A2", "a2");

    model.dispatch("CUT", { target: [toZone("A1:A2")] });
    expect(getGrid(model)).toEqual({ A1: "a1", A2: "a2" });

    model.dispatch("PASTE", { target: [toZone("A2")] });
    expect(getGrid(model)).toEqual({ A2: "a1", A3: "a2" });
  });

  test("can copy a cell with style", () => {
    const model = new Model();
    const sheet1 = model.getters.getActiveSheetId();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")] });

    expect(getCell(model, "B2")!.style).toEqual({ bold: true });
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("can copy into a cell with style", () => {
    const model = new Model();
    // set value and style in B2
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    // set value in A1, select and copy it
    setCellContent(model, "A1", "a1");
    selectCell(model, "A1");
    model.dispatch("COPY", { target: [toZone("A1")] });

    // select B2 again and paste
    model.dispatch("PASTE", { target: [toZone("B2")] });

    expect(getCell(model, "B2")!.value).toBe("a1");
    expect(getCell(model, "B2")!.style).not.toBeDefined();
  });

  test("can copy from an empty cell into a cell with style", () => {
    const model = new Model();
    const sheet1 = model.getters.getActiveSheetId();
    // set value and style in B2
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    // set value in A1, select and copy it
    selectCell(model, "A1");
    model.dispatch("COPY", { target: [toZone("A1")] });

    model.dispatch("PASTE", { target: [toZone("B2")] });

    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("can copy a cell with borders", () => {
    const model = new Model();
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      border: "bottom",
    });
    expect(getBorder(model, "B2")).toEqual({ bottom: ["thin", "#000"] });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")] });

    expect(getBorder(model, "B2")).toEqual({ bottom: ["thin", "#000"] });
    expect(getBorder(model, "C2")).toEqual({ bottom: ["thin", "#000"] });
  });

  test("can copy a cell with a format", () => {
    const model = new Model();
    setCellContent(model, "B2", "0.451");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      format: "0.00%",
    });
    expect(getCellContent(model, "B2")).toBe("45.10%");

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")] });

    expect(getCellContent(model, "C2")).toBe("45.10%");
  });

  test("can copy and paste merged content", () => {
    const model = new Model({
      sheets: [
        {
          id: "s1",
          colNumber: 5,
          rowNumber: 5,
          merges: ["B1:C2"],
        },
      ],
    });
    model.dispatch("COPY", { target: target("B1") });
    model.dispatch("PASTE", { target: target("B4") });
    expect(model.getters.isInMerge(model.getters.getActiveSheetId(), ...toCartesian("B4"))).toBe(
      true
    );
    expect(model.getters.isInMerge(model.getters.getActiveSheetId(), ...toCartesian("B5"))).toBe(
      true
    );
    expect(model.getters.isInMerge(model.getters.getActiveSheetId(), ...toCartesian("C4"))).toBe(
      true
    );
    expect(model.getters.isInMerge(model.getters.getActiveSheetId(), ...toCartesian("B5"))).toBe(
      true
    );
  });

  test("can cut and paste merged content", () => {
    const model = new Model({
      sheets: [
        {
          id: "s2",
          colNumber: 5,
          rowNumber: 5,
          merges: ["B1:C2"],
        },
      ],
    });
    model.dispatch("CUT", { target: target("B1") });
    model.dispatch("PASTE", { target: target("B4") });
    expect(model.getters.isInMerge("s2", ...toCartesian("B1"))).toBe(false);
    expect(model.getters.isInMerge("s2", ...toCartesian("B2"))).toBe(false);
    expect(model.getters.isInMerge("s2", ...toCartesian("C1"))).toBe(false);
    expect(model.getters.isInMerge("s2", ...toCartesian("B2"))).toBe(false);
    expect(model.getters.isInMerge("s2", ...toCartesian("B4"))).toBe(true);
    expect(model.getters.isInMerge("s2", ...toCartesian("B5"))).toBe(true);
    expect(model.getters.isInMerge("s2", ...toCartesian("C4"))).toBe(true);
    expect(model.getters.isInMerge("s2", ...toCartesian("B5"))).toBe(true);
  });

  test("paste merge on existing merge removes existing merge", () => {
    const model = new Model({
      sheets: [
        {
          id: "s3",
          colNumber: 5,
          rowNumber: 5,
          merges: ["B2:C4"],
        },
      ],
    });
    model.dispatch("COPY", { target: target("B2") });
    model.dispatch("PASTE", { target: target("A1") });
    expect(model.getters.isInMerge("s3", ...toCartesian("B2"))).toBe(true);
    expect(model.getters.isInMerge("s3", ...toCartesian("B3"))).toBe(true);
    expect(model.getters.isInMerge("s3", ...toCartesian("B4"))).toBe(false);
    expect(model.getters.isInMerge("s3", ...toCartesian("C2"))).toBe(false);
    expect(model.getters.isInMerge("s3", ...toCartesian("C3"))).toBe(false);
    expect(model.getters.isInMerge("s3", ...toCartesian("C4"))).toBe(false);
  });

  test("Pasting content on merge will remove the merge", () => {
    const model = new Model({
      sheets: [
        {
          id: "s1",
          colNumber: 5,
          rowNumber: 5,
          cells: {
            A1: { content: "miam" },
          },
          merges: ["B1:C2"],
        },
      ],
    });
    model.dispatch("COPY", { target: target("A1") });
    model.dispatch("PASTE", { target: target("B1"), force: true });
    expect(model.getters.isInMerge("s1", ...toCartesian("B1"))).toBe(false);
    expect(model.getters.isInMerge("s1", ...toCartesian("B2"))).toBe(false);
    expect(model.getters.isInMerge("s1", ...toCartesian("C1"))).toBe(false);
    expect(model.getters.isInMerge("s1", ...toCartesian("C2"))).toBe(false);
  });

  test("copy/paste a merge from one page to another", () => {
    const model = new Model({
      sheets: [
        {
          id: "s1",
          colNumber: 5,
          rowNumber: 5,
          merges: ["B2:C3"],
        },
        {
          id: "s2",
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    const sheet2 = "s2";
    model.dispatch("COPY", { target: [toZone("B2")] });
    activateSheet(model, sheet2);
    model.dispatch("PASTE", { target: target("A1") });
    expect(model.getters.isInMerge(sheet2, ...toCartesian("A1"))).toBe(true);
    expect(model.getters.isInMerge(sheet2, ...toCartesian("A2"))).toBe(true);
    expect(model.getters.isInMerge(sheet2, ...toCartesian("B1"))).toBe(true);
    expect(model.getters.isInMerge(sheet2, ...toCartesian("B2"))).toBe(true);
  });

  test("copy/paste a formula that has no sheet specific reference to another", () => {
    const model = new Model({
      sheets: [
        {
          id: "s1",
          colNumber: 5,
          rowNumber: 5,
          cells: { A1: { formula: { text: "=|0|", dependencies: ["a2"] } } },
        },
        {
          id: "s2",
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });

    expect(getCellText(model, "A1", "s1")).toBe("=A2");

    model.dispatch("COPY", { target: [toZone("A1")] });
    activateSheet(model, "s2");
    model.dispatch("PASTE", { target: [toZone("A1")] });

    expect(getCellText(model, "A1", "s1")).toBe("=A2");
    expect(getCellText(model, "A1", "s2")).toBe("=A2");
    expect(getCell(model, "A1", "s2")).toMatchObject({
      dependencies: [
        {
          prefixSheet: false,
          sheetId: "s2",
          zone: {
            bottom: 1,
            left: 0,
            right: 0,
            top: 1,
          },
        },
      ],
      type: "formula",
    });
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

    selectCell(model, "B2");
    const selection = model.getters.getSelection().zones;
    model.dispatch("COPY", { target: selection });

    selectCell(model, "A1");
    model.dispatch("PASTE", { target: model.getters.getSelectedZones(), interactive: true });
    expect(askConfirmation).toHaveBeenCalled();
  });

  test("Pasting content that will destroy a merge will fail if not forced", async () => {
    const model = new Model({
      sheets: [
        {
          id: "s1",
          colNumber: 5,
          rowNumber: 5,
          merges: ["B2:C3"],
        },
        {
          id: "s2",
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });

    selectCell(model, "B2");
    const selection = model.getters.getSelection().zones;
    model.dispatch("COPY", { target: selection });
    const result = model.dispatch("PASTE", { target: [toZone("A1")] });
    expect(result).toBe(CommandResult.WillRemoveExistingMerge);
    expect(model.getters.isInMerge("s1", ...toCartesian("A1"))).toBe(false);
    expect(model.getters.isInMerge("s1", ...toCartesian("A2"))).toBe(false);
    expect(model.getters.isInMerge("s1", ...toCartesian("B1"))).toBe(false);
    expect(model.getters.isInMerge("s1", ...toCartesian("B2"))).toBe(true);
    expect(model.getters.isInMerge("s1", ...toCartesian("B3"))).toBe(true);
    expect(model.getters.isInMerge("s1", ...toCartesian("C2"))).toBe(true);
    expect(model.getters.isInMerge("s1", ...toCartesian("C3"))).toBe(true);
  });

  test("Pasting content that will destroy a merge will be applied if forced", async () => {
    const model = new Model({
      sheets: [
        {
          id: "s1",
          colNumber: 5,
          rowNumber: 5,
          merges: ["B2:C3"],
        },
      ],
    });
    selectCell(model, "B2");
    const selection = model.getters.getSelection().zones;
    model.dispatch("COPY", { target: selection });
    model.dispatch("PASTE", { target: target("A1"), force: true });
    expect(model.getters.isInMerge("s1", ...toCartesian("A1"))).toBe(true);
    expect(model.getters.isInMerge("s1", ...toCartesian("A2"))).toBe(true);
    expect(model.getters.isInMerge("s1", ...toCartesian("B1"))).toBe(true);
    expect(model.getters.isInMerge("s1", ...toCartesian("B2"))).toBe(true);
    expect(model.getters.isInMerge("s1", ...toCartesian("B3"))).toBe(false);
    expect(model.getters.isInMerge("s1", ...toCartesian("C2"))).toBe(false);
    expect(model.getters.isInMerge("s1", ...toCartesian("C3"))).toBe(false);
  });

  test("cutting a cell with style remove the cell", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });

    model.dispatch("CUT", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")] });

    expect(getCell(model, "C2")).toMatchObject({
      style: { bold: true },
      content: "b2",
      type: "text",
      value: "b2",
    });
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("getClipboardContent export formatted string", () => {
    const model = new Model();
    setCellContent(model, "B2", "abc");
    selectCell(model, "B2");
    model.dispatch("COPY", { target: [toZone("B2")] });
    expect(model.getters.getClipboardContent()).toBe("abc");

    setCellContent(model, "B2", "= 1 + 2");
    selectCell(model, "B2");
    model.dispatch("COPY", { target: [toZone("B2")] });
    expect(model.getters.getClipboardContent()).toBe("3");
  });

  test("can copy a rectangular selection", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    setCellContent(model, "C2", "c2");
    setCellContent(model, "C3", "c3");

    model.dispatch("COPY", { target: [toZone("B2:C3")] });

    expect(getCell(model, "D1")).toBeUndefined();
    expect(getCell(model, "D2")).toBeUndefined();
    expect(getCell(model, "E1")).toBeUndefined();
    expect(getCell(model, "E2")).toBeUndefined();

    model.dispatch("PASTE", { target: [toZone("D1:D1")] });

    expect(getCellContent(model, "D1")).toBe("b2");
    expect(getCellContent(model, "D2")).toBe("b3");
    expect(getCellContent(model, "E1")).toBe("c2");
    expect(getCellContent(model, "E2")).toBe("c3");
  });

  test("empty clipboard: getClipboardContent returns a tab", () => {
    const model = new Model();
    expect(model.getters.getClipboardContent()).toBe("\t");
  });

  test("getClipboardContent exports multiple cells", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    setCellContent(model, "C2", "c2");
    setCellContent(model, "C3", "c3");
    model.dispatch("COPY", { target: [toZone("B2:C3")] });
    expect(model.getters.getClipboardContent()).toBe("b2\tc2\nb3\tc3");
  });

  test("can paste multiple cells from os clipboard", () => {
    const model = new Model();
    model.dispatch("PASTE_FROM_OS_CLIPBOARD", { text: "a\t1\nb\t2", target: [toZone("C1")] });

    expect(getCellContent(model, "C1")).toBe("a");
    expect(getCellContent(model, "C2")).toBe("b");
    expect(getCellContent(model, "D1")).toBe("1");
    expect(getCellContent(model, "D2")).toBe("2");
  });

  test("pasting numbers from windows clipboard => interpreted as number", () => {
    const model = new Model();
    model.dispatch("PASTE_FROM_OS_CLIPBOARD", { text: "1\r\n2\r\n3", target: [toZone("C1")] });

    expect(getCellContent(model, "C1")).toBe("1");
    expect(getCell(model, "C1")!.type).toBe("number");
    expect(getCellContent(model, "C2")).toBe("2");
    expect(getCell(model, "C2")!.type).toBe("number");
    expect(getCellContent(model, "C3")).toBe("3");
    expect(getCell(model, "C3")!.type).toBe("number");
  });

  test("incompatible multiple selections: only last one is actually copied", () => {
    const model = new Model();
    setCellContent(model, "A1", "a1");
    setCellContent(model, "A2", "a2");
    setCellContent(model, "C1", "c1");
    model.dispatch("COPY", { target: [toZone("A1:A2"), toZone("C1")] });

    expect(getClipboardVisibleZones(model).length).toBe(1);

    selectCell(model, "E1");
    model.dispatch("PASTE", { target: [toZone("E1")] });
    expect(getCellContent(model, "E1")).toBe("c1");
    expect(getCell(model, "E2")).toBeUndefined();
  });

  test("compatible multiple selections: each column is copied", () => {
    const model = new Model();
    setCellContent(model, "A1", "a1");
    setCellContent(model, "A2", "a2");
    setCellContent(model, "C1", "c1");
    setCellContent(model, "C2", "c2");
    model.dispatch("COPY", { target: [toZone("A1:A2"), toZone("C1:C2")] });

    expect(getClipboardVisibleZones(model).length).toBe(2);

    model.dispatch("PASTE", { target: [toZone("E1")] });
    expect(getCellContent(model, "E1")).toBe("a1");
    expect(getCellContent(model, "E2")).toBe("a2");
    expect(getCellContent(model, "F1")).toBe("c1");
    expect(getCellContent(model, "F2")).toBe("c2");
  });

  test("pasting a value in a larger selection", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    model.dispatch("COPY", { target: [toZone("A1:A1")] });

    model.dispatch("PASTE", { target: [toZone("C2:E3")] });
    expect(getCellContent(model, "C2")).toBe("1");
    expect(getCellContent(model, "C3")).toBe("1");
    expect(getCellContent(model, "D2")).toBe("1");
    expect(getCellContent(model, "D3")).toBe("1");
    expect(getCellContent(model, "E2")).toBe("1");
    expect(getCellContent(model, "E3")).toBe("1");
  });

  test("selection is updated to contain exactly the new pasted zone", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    model.dispatch("COPY", { target: [toZone("A1:A2")] });

    // select C1:C3
    selectCell(model, "C1");
    model.dispatch("ALTER_SELECTION", { cell: [2, 2] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 2, right: 2 });
    model.dispatch("PASTE", { target: [toZone("C1:C3")] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 1, right: 2 });
    expect(getCellContent(model, "C1")).toBe("1");
    expect(getCellContent(model, "C2")).toBe("2");
    expect(getCell(model, "C3")).toBeUndefined();
  });

  test("selection is not changed if pasting a single value into two zones", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    model.dispatch("COPY", { target: [toZone("A1:A1")] });

    selectCell(model, "C1");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "E1");

    model.dispatch("PASTE", { target: [toZone("C1"), toZone("E1")] });
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 0, right: 2 });
    expect(model.getters.getSelectedZones()[1]).toEqual({ top: 0, left: 4, bottom: 0, right: 4 });
  });

  test("pasting a value in multiple zones", () => {
    const model = new Model();
    setCellContent(model, "A1", "33");
    model.dispatch("COPY", { target: [toZone("A1:A1")] });

    model.dispatch("PASTE", { target: [toZone("C1"), toZone("E1")] });

    expect(getCellContent(model, "C1")).toBe("33");
    expect(getCellContent(model, "E1")).toBe("33");
  });

  test("pasting is not allowed if multiple selection and more than one value", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    model.dispatch("COPY", { target: [toZone("A1:A2")] });
    const result = model.dispatch("PASTE", { target: [toZone("C1"), toZone("E1")] });

    expect(result).toBe(CommandResult.WrongPasteSelection);
  });

  test("pasting with multiple selection and more than one value will warn user", async () => {
    const notifyUser = jest.fn();
    const model = new Model({}, { notifyUser });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    model.dispatch("COPY", { target: [toZone("A1:A2")] });

    selectCell(model, "C4");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "F6");
    model.dispatch("PASTE", { target: model.getters.getSelectedZones(), interactive: true });
    expect(notifyUser).toHaveBeenCalled();
  });

  test("can copy and paste a cell with STRING content", () => {
    const model = new Model();
    setCellContent(model, "B2", '="test"');

    expect(getCellText(model, "B2")).toEqual('="test"');
    expect(getCell(model, "B2")!.value).toEqual("test");

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("D2")] });
    expect(getCellText(model, "B2")).toEqual('="test"');
    expect(getCell(model, "B2")!.value).toEqual("test");
    expect(getCellText(model, "D2")).toEqual('="test"');
    expect(getCell(model, "D2")!.value).toEqual("test");
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can undo a paste operation", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("D2")] });
    expect(getCell(model, "D2")).toBeDefined();
    undo(model);
    expect(getCell(model, "D2")).toBeUndefined();
  });

  test("can paste-format a cell with style", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")], onlyFormat: true });
    expect(getCellContent(model, "C2")).toBe("");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("can copy and paste format", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")], onlyFormat: true });
    expect(getCellContent(model, "C2")).toBe("");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("paste format does not remove content", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "C2", "c2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")], onlyFormat: true });

    expect(getCellContent(model, "C2")).toBe("c2");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("can undo a paste format", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    model.dispatch("COPY", { target: [toZone("B2:B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")], onlyFormat: true });

    expect(getCellContent(model, "C2")).toBe("");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });

    undo(model);
    expect(getCell(model, "C2")).toBeUndefined();
  });

  test("can copy and paste value only", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")], onlyValue: true });
    expect(getCellContent(model, "C2")).toBe("b2");
  });

  test("can copy a cell with a style and paste value only", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")], onlyValue: true });

    expect(getCell(model, "C2")!.value).toBe("b2");
    expect(getCell(model, "C2")!.style).not.toBeDefined();
  });

  test("can copy a cell with a border and paste value only", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      border: "bottom",
    });
    expect(getBorder(model, "B2")).toEqual({ bottom: ["thin", "#000"] });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")], onlyValue: true });

    expect(getCell(model, "C2")!.value).toBe("b2");
    expect(getBorder(model, "C2")).toBeNull();
  });

  test("can copy a cell with a format and paste value only", () => {
    const model = new Model();
    setCellContent(model, "B2", "0.451");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      format: "0.00%",
    });
    expect(getCellContent(model, "B2")).toBe("45.10%");

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")], onlyValue: true });

    expect(getCellContent(model, "C2")).toBe("0.451");
  });

  test("can copy a cell with a conditional format and paste value only", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "C1", "1");
    setCellContent(model, "C2", "2");
    let result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1"), toZone("A2")],
      sheetId: model.getters.getActiveSheetId(),
    });

    expect(result).toEqual(CommandResult.Success);
    model.dispatch("COPY", { target: target("A1") });
    model.dispatch("PASTE", { target: target("C1"), onlyValue: true });
    model.dispatch("COPY", { target: target("A2") });
    model.dispatch("PASTE", { target: target("C2"), onlyValue: true });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("C1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("C2"))).toBeUndefined();
  });

  test("paste value only does not remove style", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "C3", "c3");
    selectCell(model, "C3");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 2, right: 2, top: 2, bottom: 2 }],
      style: { bold: true },
    });
    expect(getCell(model, "C3")!.style).toEqual({ bold: true });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C3")], onlyValue: true });

    expect(getCellContent(model, "C3")).toBe("b2");
    expect(getCell(model, "C3")!.style).toEqual({ bold: true });
  });

  test("paste value only does not remove border", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "C3", "c3");
    selectCell(model, "C3");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      border: "bottom",
    });
    expect(getBorder(model, "C3")).toEqual({ bottom: ["thin", "#000"] });
    expect(getBorder(model, "C4")).toEqual({ top: ["thin", "#000"] });

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C3")], onlyValue: true });

    expect(getCellContent(model, "C3")).toBe("b2");
    expect(getBorder(model, "C3")).toEqual({ bottom: ["thin", "#000"] });
  });

  test("paste value only does not remove formating", () => {
    const model = new Model();
    setCellContent(model, "B2", "42");
    setCellContent(model, "C3", "0.451");
    selectCell(model, "C3");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      format: "0.00%",
    });
    expect(getCellContent(model, "C3")).toBe("45.10%");

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("C3")], onlyValue: true });

    expect(getCellContent(model, "C3")).toBe("4200.00%");
  });

  test("can copy a formula and paste value only", () => {
    const model = new Model();
    setCellContent(model, "A1", "=SUM(1+2)");
    setCellContent(model, "A2", "=EQ(42,42)");
    setCellContent(model, "A3", '=CONCAT("Ki","kou")');
    model.dispatch("COPY", { target: [toZone("A1:A3")] });
    model.dispatch("PASTE", { target: [toZone("B1")], onlyValue: true });
    expect(getCellContent(model, "B1")).toBe("3");
    expect(getCellContent(model, "B2")).toBe("TRUE");
    expect(getCellContent(model, "B3")).toBe("Kikou");
  });

  test("can undo a paste value only", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    model.dispatch("COPY", { target: [toZone("B2:B2")] });
    model.dispatch("PASTE", { target: [toZone("C2")], onlyValue: true });

    expect(getCellContent(model, "C2")).toBe("b2");
    expect(getCell(model, "C2")!.style).not.toBeDefined();

    undo(model);
    expect(getCell(model, "C2")).toBeUndefined();
  });

  test("can copy and paste a formula and update the refs", () => {
    const model = new Model();
    setCellContent(model, "A1", "=SUM(C1:C2)");
    model.dispatch("COPY", { target: [toZone("A1")] });
    model.dispatch("PASTE", { target: [toZone("B2")] });
    expect(getCellText(model, "B2")).toBe("=SUM(D2:D3)");
  });

  /*
   *
   *    a    b           c         d         e
   * --------------------------------------------
   * 1      |         |          |         |   x
   *        |         |          |         |
   * ----------------------------|---------
   * 2      |         |     x    |         |
   *
   *
   * */

  test.each([
    ["=SUM(C1:C2)", "=SUM(D2:D3)"],
    ["=$C1", "=$C2"],
    ["=SUM($C1:D$1)", "=SUM($C$1:E2)"], //excel and g-sheet compatibility
  ])("can copy and paste formula with $refs", (value, expected) => {
    const model = new Model();
    setCellContent(model, "A1", value);
    model.dispatch("COPY", { target: [toZone("A1")] });
    model.dispatch("PASTE", { target: [toZone("B2")] });
    expect(getCellText(model, "B2")).toBe(expected);
  });

  test("can copy format from empty cell to another cell to clear format", () => {
    const model = new Model();

    // write something in B2 and set its format
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 1, right: 1, top: 1, bottom: 1 }],
      style: { bold: true },
    });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    // select A1 and copy format
    model.dispatch("COPY", { target: [toZone("A1")] });

    // select B2 and paste format
    model.dispatch("PASTE", { target: [toZone("B2")], onlyFormat: true });

    expect(getCellContent(model, "B2")).toBe("b2");
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
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "C1", "1");
    setCellContent(model, "C2", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
      target: [toZone("A1"), toZone("A2")],
    });
    model.dispatch("COPY", { target: target("A1") });
    model.dispatch("PASTE", { target: target("C1") });
    model.dispatch("COPY", { target: target("A2") });
    model.dispatch("PASTE", { target: target("C2") });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("C1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("C2"))).toBeUndefined();
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
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "C1", "1");
    setCellContent(model, "C2", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1"), toZone("A2")],
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("CUT", { target: target("A1") });
    model.dispatch("PASTE", { target: target("C1") });
    model.dispatch("CUT", { target: target("A2") });
    model.dispatch("PASTE", { target: target("C2") });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("C1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("C2"))).toBeUndefined();
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
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1"), toZone("A2")],
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("COPY", { target: target("A1:A2") });
    model.dispatch("PASTE", { target: target("B1") });
    model.dispatch("PASTE", { target: target("C1") });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("B1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("B2"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("C1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("C2"))).toBeUndefined();
    setCellContent(model, "C1", "2");
    setCellContent(model, "C2", "1");
    expect(model.getters.getConditionalStyle(...toCartesian("C1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("C2"))).toEqual({
      fillColor: "#FF0000",
    });
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
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1"), toZone("A2")],
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("CUT", { target: target("A1:A2") });
    model.dispatch("PASTE", { target: target("B1") });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("B1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("B2"))).toBeUndefined();
    setCellContent(model, "B1", "2");
    setCellContent(model, "B2", "1");
    expect(model.getters.getConditionalStyle(...toCartesian("B1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("B2"))).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("can copy and paste a conditional formatted cell to another page", () => {
    const model = new Model({
      sheets: [
        {
          id: "s1",
          colNumber: 5,
          rowNumber: 5,
        },
        {
          id: "s2",
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1"), toZone("A2")],
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("COPY", { target: [toZone("A1:A2")] });
    activateSheet(model, "s2");
    model.dispatch("PASTE", { target: target("A1") });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toBeUndefined();
    setCellContent(model, "A1", "2");
    setCellContent(model, "A2", "1");
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
      fillColor: "#FF0000",
    });
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
    const sheet1 = model.getters.getVisibleSheets()[0];
    const sheet2 = model.getters.getVisibleSheets()[1];
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      target: [toZone("A1"), toZone("A2")],
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("CUT", { target: [toZone("A1:A2")] });
    activateSheet(model, sheet2);
    model.dispatch("PASTE", { target: target("A1") });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toBeUndefined();
    setCellContent(model, "A1", "2");
    setCellContent(model, "A2", "1");
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
      fillColor: "#FF0000",
    });
    activateSheet(model, sheet1);
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toBeUndefined();
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toBeUndefined();
  });

  test("can copy and paste a cell which contains a cross-sheet reference", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42", name: "Sheet2" });
    setCellContent(model, "B2", "=Sheet2!B2");

    model.dispatch("COPY", { target: [toZone("B2")] });
    model.dispatch("PASTE", { target: [toZone("B3")] });
    expect(getCellText(model, "B3")).toBe("=Sheet2!B3");
  });

  test("can copy and paste a cell which contains a cross-sheet reference in a smaller sheet", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42", name: "Sheet2", rows: 2, cols: 2 });
    setCellContent(model, "A1", "=Sheet2!A1:A2");

    model.dispatch("COPY", { target: [toZone("A1")] });
    model.dispatch("PASTE", { target: [toZone("A2")] });
    expect(getCellText(model, "A2")).toBe("=Sheet2!A2:A3");
  });

  test("can copy and paste a cell which contains a cross-sheet reference to a range", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42", name: "Sheet2" });
    setCellContent(model, "A1", "=SUM(Sheet2!A2:A5)");

    model.dispatch("COPY", { target: [toZone("A1")] });
    model.dispatch("PASTE", { target: [toZone("B1")] });
    expect(getCellText(model, "B1")).toBe("=SUM(Sheet2!B2:B5)");
  });
});

describe("clipboard: pasting outside of sheet", () => {
  test("can copy and paste a full column", () => {
    const model = new Model();
    setCellContent(model, "A1", "txt");
    const activeSheet = model.getters.getActiveSheet();
    const currentRowNumber = activeSheet.rows.length;

    model.dispatch("COPY", { target: [model.getters.getColsZone(activeSheet.id, 0, 0)] });
    model.dispatch("PASTE", { target: [toZone("B2")] });
    expect(activeSheet.rows.length).toBe(currentRowNumber + 1);
    expect(getCellContent(model, "B2")).toBe("txt");
  });

  test("can copy and paste a full row", () => {
    const model = new Model();
    setCellContent(model, "A1", "txt");

    const activeSheet = model.getters.getActiveSheet();
    const currentColNumber = activeSheet.cols.length;

    model.dispatch("COPY", { target: [model.getters.getRowsZone(activeSheet.id, 0, 0)] });
    model.dispatch("PASTE", { target: [toZone("B2")] });
    expect(activeSheet.cols.length).toBe(currentColNumber + 1);
    expect(getCellContent(model, "B2")).toBe("txt");
  });

  test("Can cut & paste a formula", () => {
    const model = new Model();
    setCellContent(model, "A1", "=1");
    model.dispatch("CUT", { target: target("A1") });
    model.dispatch("PASTE", { target: target("B1") });
    expect(getCellContent(model, "A1")).toBe("");
    expect(getCellText(model, "B1")).toBe("=1");
  });

  test("Cut & paste a formula correctly update offsets", () => {
    const model = new Model();
    setCellContent(model, "A1", "=B2");
    model.dispatch("CUT", { target: target("A1") });
    model.dispatch("PASTE", { target: target("C2") });
    expect(getCellContent(model, "A1")).toBe("");
    expect(getCellText(model, "C2")).toBe("=D3");
  });

  test("can paste multiple cells from os to outside of sheet", () => {
    const model = new Model();
    setCellContent(model, "A1", "=B2");
    model.dispatch("CUT", { target: target("A1") });
    model.dispatch("PASTE", { target: target("C2") });
    expect(getCellContent(model, "A1")).toBe("");
    expect(getCellText(model, "C2")).toBe("=D3");
  });

  test("can paste multiple cells from os to outside of sheet", () => {
    const model = new Model();
    createSheet(model, { activate: true, sheetId: "2", name: "sheet2", rows: 2, cols: 2 });
    model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
      text: "A\nque\tcoucou\nBOB",
      target: [toZone("B2")],
    });
    expect(getCellContent(model, "B2")).toBe("A");
    expect(getCellContent(model, "B3")).toBe("que");
    expect(getCellContent(model, "C3")).toBe("coucou");
    expect(getCellContent(model, "B4")).toBe("BOB");

    createSheet(model, {
      activate: true,
      sheetId: "3",
      name: "sheet3",
      rows: 2,
      cols: 2,
    });
    model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
      text: "A\nque\tcoucou\tPatrick",
      target: [toZone("B2")],
    });
    expect(getCellContent(model, "B2")).toBe("A");
    expect(getCellContent(model, "B3")).toBe("que");
    expect(getCellContent(model, "C3")).toBe("coucou");
    expect(getCellContent(model, "D3")).toBe("Patrick");
  });
});
