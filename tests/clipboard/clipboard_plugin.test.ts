import { clipboardHandlersRegistries } from "../../src/clipboard_handlers";
import { DEFAULT_BORDER_DESC } from "../../src/constants";
import { toCartesian, toZone, zoneToXc } from "../../src/helpers";
import { getClipboardDataPositions } from "../../src/helpers/clipboard/clipboard_helpers";
import { Model } from "../../src/model";
import {
  ClipboardMIMEType,
  ClipboardPasteTarget,
  CommandResult,
  DEFAULT_LOCALE,
} from "../../src/types/index";
import { XMLString } from "../../src/types/xlsx";
import { parseXML, xmlEscape } from "../../src/xlsx/helpers/xml_helpers";
import { MockClipboardData } from "../test_helpers/clipboard";
import {
  activateSheet,
  addCellToSelection,
  addColumns,
  addRows,
  cleanClipBoardHighlight,
  copy,
  copyPasteAboveCells,
  copyPasteCellsOnLeft,
  createSheet,
  createSheetWithName,
  createTable,
  cut,
  deleteCells,
  deleteColumns,
  deleteRows,
  deleteSheet,
  insertCells,
  merge,
  paste,
  pasteFromOSClipboard,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setCellFormat,
  setFormat,
  setSelection,
  setStyle,
  setViewportOffset,
  setZoneBorders,
  undo,
  updateLocale,
} from "../test_helpers/commands_helpers";
import {
  getBorder,
  getCell,
  getCellContent,
  getCellError,
  getCellText,
  getClipboardVisibleZones,
  getEvaluatedCell,
  getStyle,
} from "../test_helpers/getters_helpers";
import { createEqualCF, getGrid, target, toRangesData } from "../test_helpers/helpers";

let model: Model;

describe("clipboard", () => {
  test("can copy and paste a cell", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");

    expect(getCell(model, "B2")).toMatchObject({
      content: "b2",
    });

    copy(model, "B2");
    paste(model, "D2");
    expect(getCell(model, "B2")).toMatchObject({
      content: "b2",
    });
    expect(getCell(model, "D2")).toMatchObject({
      content: "b2",
    });
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can cut and paste a cell", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    expect(getCell(model, "B2")).toMatchObject({
      content: "b2",
    });

    cut(model, "B2");
    expect(getCell(model, "B2")).toMatchObject({
      content: "b2",
    });
    paste(model, "D2");

    expect(getCell(model, "B2")).toBeUndefined();
    expect(getCell(model, "D2")).toMatchObject({
      content: "b2",
    });

    expect(getClipboardVisibleZones(model).length).toBe(0);

    // select D3 and paste. it should do nothing
    paste(model, "D3");

    expect(getCell(model, "D3")).toBeUndefined();
  });

  test("can clean the clipboard visible zones (copy)", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    copy(model, "B2");
    expect(getClipboardVisibleZones(model).length).toBe(1);
    cleanClipBoardHighlight(model);
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can clean the clipboard visible zones (cut)", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    cut(model, "B2");
    expect(getClipboardVisibleZones(model).length).toBe(1);
    cleanClipBoardHighlight(model);
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("cut command will cut the selection if no target were given", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setSelection(model, ["B2"]);
    model.dispatch("CUT");
    paste(model, "D2");
    expect(getCell(model, "D2")?.content).toBe("b2");
  });

  test("paste without copied value", () => {
    const model = new Model();
    const result = paste(model, "D2");
    expect(result).toBeCancelledBecause(CommandResult.EmptyClipboard);
  });

  test("can cut and paste a cell in different sheets", () => {
    const model = new Model();
    setCellContent(model, "A1", "a1");
    cut(model, "A1");
    const to = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    setCellContent(model, "A1", "a1Sheet2");
    paste(model, "B2");
    expect(getCell(model, "A1")).toMatchObject({
      content: "a1Sheet2",
    });
    expect(getCell(model, "B2")).toMatchObject({
      content: "a1",
    });
    activateSheet(model, to);
    expect(model.getters.getEvaluatedCells(to)).toEqual([]);

    expect(getClipboardVisibleZones(model).length).toBe(0);

    // select D3 and paste. it should do nothing
    paste(model, "D3");

    expect(getCell(model, "D3")).toBeUndefined();
  });

  test("can cut and paste a zone inside the cut zone", () => {
    const model = new Model();
    setCellContent(model, "A1", "a1");
    setCellContent(model, "A2", "a2");

    cut(model, "A1:A2");
    expect(getGrid(model)).toEqual({ A1: "a1", A2: "a2" });

    paste(model, "A2");
    expect(getGrid(model)).toEqual({ A2: "a1", A3: "a2" });
  });

  test("can copy a cell with style", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setStyle(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    copy(model, "B2");
    paste(model, "C2");

    expect(getCell(model, "B2")!.style).toEqual({ bold: true });
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("copying external content & paste-format on a cell will not paste content", () => {
    const model = new Model();
    const clipboardData = new MockClipboardData();
    clipboardData.setData(ClipboardMIMEType.PlainText, "Excalibur");

    const content = clipboardData.getData(ClipboardMIMEType.PlainText);
    pasteFromOSClipboard(model, "C2", content);
    expect(getCellContent(model, "C2")).toBe(content);
    pasteFromOSClipboard(model, "C3", content, "onlyFormat");
    expect(getCellContent(model, "C3")).toBe("");
  });

  test("cannot paste multiple times after cut", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setStyle(model, "B2", { bold: true });

    cut(model, "B2");
    paste(model, "C2");
    expect(getCellContent(model, "C2")).toBe("b2");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });

    paste(model, "E5");
    expect(getCell(model, "E5")).toBe(undefined);
  });

  test("Cut clipboard should be invalidated when sheet is deleted", () => {
    const model = new Model();
    const sheet1Id = model.getters.getActiveSheetId();
    const sheet2Id = "sheet2";
    createSheet(model, { sheetId: sheet2Id });

    setCellContent(model, "A1", "Apple", sheet1Id);
    setStyle(model, "A1", { bold: true });
    cut(model, "A1");

    activateSheet(model, sheet2Id);
    deleteSheet(model, sheet1Id);
    paste(model, "A2");
    expect(getCell(model, "A2", sheet2Id)).toBe(undefined);
  });

  test("can paste even if sheet containing copy zone has been deleted", () => {
    const model = new Model();
    const sheet1Id = model.getters.getActiveSheetId();
    const sheet2Id = "sheet2";
    createSheet(model, { sheetId: sheet2Id });

    setCellContent(model, "A1", "Apple", sheet1Id);
    setStyle(model, "A1", { bold: true });
    copy(model, "A1");

    activateSheet(model, sheet2Id);
    deleteSheet(model, sheet1Id);
    paste(model, "A2");
    expect(getCellContent(model, "A2", sheet2Id)).toBe("Apple");
    expect(getCell(model, "A2", sheet2Id)!.style).toEqual({ bold: true });
  });

  test("can copy into a cell with style", () => {
    const model = new Model();
    // set value and style in B2
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    setStyle(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    // set value in A1, select and copy it
    setCellContent(model, "A1", "a1");
    selectCell(model, "A1");
    copy(model, "A1");

    // select B2 again and paste
    paste(model, "B2");

    expect(getEvaluatedCell(model, "B2").value).toBe("a1");
    expect(getCell(model, "B2")!.style).not.toBeDefined();
  });

  test("can copy from an empty cell into a cell with style", () => {
    const model = new Model();
    // set value and style in B2
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    setStyle(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    // set value in A1, select and copy it
    selectCell(model, "A1");
    copy(model, "A1");

    paste(model, "B2");

    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("can copy a cell with borders", () => {
    const model = new Model();
    selectCell(model, "B2");
    setZoneBorders(model, { position: "bottom" });
    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });

    copy(model, "B2");
    paste(model, "C2");

    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
  });

  test("paste cell does not overwrite existing borders", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setZoneBorders(model, { position: "all" }, ["A1"]);
    copy(model, "B2");
    paste(model, "A1");
    expect(model.getters.getCellBorder({ sheetId, col: 0, row: 0 })).toEqual({
      top: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
  });

  test("can copy a cell with a format", () => {
    const model = new Model();
    setCellContent(model, "B2", "0.451");
    selectCell(model, "B2");
    setFormat(model, "B2", "0.00%");
    expect(getCellContent(model, "B2")).toBe("45.10%");

    copy(model, "B2");
    paste(model, "C2");

    expect(getCellContent(model, "C2")).toBe("45.10%");
  });

  test("can copy and paste merged content", () => {
    const model = new Model({
      sheets: [{ id: "s1", colNumber: 5, rowNumber: 5, merges: ["B1:C2"] }],
    });
    copy(model, "B1");
    paste(model, "B4");
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.isInMerge({ sheetId, ...toCartesian("B4") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId, ...toCartesian("B5") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId, ...toCartesian("C4") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId, ...toCartesian("B5") })).toBe(true);
  });

  test("can cut and paste merged content", () => {
    const model = new Model({
      sheets: [{ id: "s2", colNumber: 5, rowNumber: 5, merges: ["B1:C2"] }],
    });
    cut(model, "B1:C2");
    paste(model, "B4");
    expect(model.getters.isInMerge({ sheetId: "s2", ...toCartesian("B1") })).toBe(false);
    expect(model.getters.isInMerge({ sheetId: "s2", ...toCartesian("B2") })).toBe(false);
    expect(model.getters.isInMerge({ sheetId: "s2", ...toCartesian("C1") })).toBe(false);
    expect(model.getters.isInMerge({ sheetId: "s2", ...toCartesian("C2") })).toBe(false);
    expect(model.getters.isInMerge({ sheetId: "s2", ...toCartesian("B4") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: "s2", ...toCartesian("B5") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: "s2", ...toCartesian("C4") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: "s2", ...toCartesian("C5") })).toBe(true);
  });

  test("Pasting merge on content will remove the content", () => {
    const model = new Model({
      sheets: [
        {
          id: "s1",
          colNumber: 5,
          rowNumber: 5,
          cells: { A1: { content: "merge" }, C1: { content: "a" }, D2: { content: "a" } },
          merges: ["A1:B2"],
        },
      ],
    });
    copy(model, "A1");
    paste(model, "C1");
    expect(model.getters.isInMerge({ sheetId: "s1", ...toCartesian("C1") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: "s1", ...toCartesian("D2") })).toBe(true);
    expect(getCellContent(model, "C1")).toBe("merge");
    expect(getCellContent(model, "D2")).toBe("");
  });

  test("copy/paste a merge from one page to another", () => {
    const model = new Model({
      sheets: [
        { id: "s1", colNumber: 5, rowNumber: 5, merges: ["B2:C3"] },
        { id: "s2", colNumber: 5, rowNumber: 5 },
      ],
    });
    const sheet2 = "s2";
    copy(model, "B2");
    activateSheet(model, sheet2);
    paste(model, "A1");
    expect(model.getters.isInMerge({ sheetId: sheet2, ...toCartesian("A1") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: sheet2, ...toCartesian("A2") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: sheet2, ...toCartesian("B1") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: sheet2, ...toCartesian("B2") })).toBe(true);
  });

  test("copy/paste a formula that has no sheet specific reference to another", () => {
    const model = new Model({
      sheets: [
        { id: "s1", colNumber: 5, rowNumber: 5, cells: { A1: { content: "=A2" } } },
        { id: "s2", colNumber: 5, rowNumber: 5 },
      ],
    });

    expect(getCellText(model, "A1", "s1")).toBe("=A2");

    copy(model, "A1");
    activateSheet(model, "s2");
    paste(model, "A1");

    expect(getCellText(model, "A1", "s1")).toBe("=A2");
    expect(getCellText(model, "A1", "s2")).toBe("=A2");
  });

  test("Pasting content that will destroy a merge will fail", async () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    merge(model, "B2:C3");
    copy(model, "B2");
    const result = paste(model, "A1");
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
    expect(model.getters.getMerges(sheetId).map(zoneToXc)).toEqual(["B2:C3"]);
  });

  test("Can paste a single cell on a merge", () => {
    const model = new Model();
    setCellContent(model, "A1", "thingies");
    merge(model, "B1:B2");
    copy(model, "A1");
    paste(model, "B1:B2");
    expect(getCellContent(model, "B1")).toEqual("thingies");
  });

  test("cutting a cell with style remove the cell", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    setStyle(model, "B2", { bold: true });
    cut(model, "B2");
    paste(model, "C2");

    expect(getCell(model, "C2")).toMatchObject({
      style: { bold: true },
      content: "b2",
    });
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("getClipboardContent export formatted string", () => {
    const model = new Model();
    setCellContent(model, "B2", "abc");
    selectCell(model, "B2");
    copy(model, "B2");
    expect(model.getters.getClipboardTextContent()).toBe("abc");

    setCellContent(model, "B2", "= 1 + 2");
    selectCell(model, "B2");
    copy(model, "B2");
    expect(model.getters.getClipboardTextContent()).toBe("3");
  });

  describe("Copied cells HTML", () => {
    let model: Model;
    beforeEach(() => {
      model = new Model();
    });

    test("Copied HTML table snapshot", async () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");
      setCellContent(model, "A2", "3");
      copy(model, "A1:B2");
      const htmlContent = model.getters.getClipboardContent()[ClipboardMIMEType.Html]!;
      expect(htmlContent).toMatchSnapshot();
    });

    test("Copied group of cells are represented as a valid HTML table in the clipboard", async () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");
      setCellContent(model, "A2", "3");
      copy(model, "A1:B2");
      const htmlContent = model.getters.getClipboardContent()[ClipboardMIMEType.Html]!;
      const parsedHTML = parseXML(new XMLString(htmlContent), "text/html");

      expect(parsedHTML.body.firstElementChild?.tagName).toBe("TABLE");
      const tableRows = parsedHTML.querySelectorAll("tr");
      expect(tableRows).toHaveLength(2);
      expect(tableRows[0].querySelectorAll("td")).toHaveLength(2);
      expect(tableRows[0].querySelectorAll("td")[0].innerHTML).toEqual("1");
      expect(tableRows[0].querySelectorAll("td")[1].innerHTML).toEqual("2");

      expect(tableRows[1].querySelectorAll("td")).toHaveLength(2);
      expect(tableRows[1].querySelectorAll("td")[0].innerHTML).toEqual("3");
      expect(tableRows[1].querySelectorAll("td")[1].innerHTML).toEqual("");
    });

    test("Copied HTML table style", async () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "3");
      copy(model, "A1:A2");
      const htmlContent = model.getters.getClipboardContent()[ClipboardMIMEType.Html]!;

      expect(htmlContent).toContain('style="border-collapse:collapse"');
      expect(htmlContent).toContain('border="1"');
    });

    test("Copied cells have their style in the HTML", async () => {
      const sheetId = model.getters.getActiveSheetId();
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "3");
      setStyle(model, "A1", { bold: true });
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("1", { fillColor: "#123456" }, "id"),
        ranges: toRangesData(sheetId, "A1"),
        sheetId,
      });
      copy(model, "A1:A2");

      const htmlContent = model.getters.getClipboardContent()[ClipboardMIMEType.Html]!;
      const firstCellStyle = htmlContent
        .replace(/\n/g, "")
        .match(/<td style="(.*?)">.*?<\/td>/)![1];

      expect(firstCellStyle).toContain("font-weight:bold;");
      expect(firstCellStyle).toContain("background:#123456;");
    });

    test("Copied cells have their content escaped", async () => {
      const cellContent = "<div>1</div>";
      setCellContent(model, "A1", cellContent);
      setCellContent(model, "A2", "3");
      copy(model, "A1:A2");
      const htmlContent = model.getters.getClipboardContent()[ClipboardMIMEType.Html]!;

      expect(htmlContent).toContain(xmlEscape(cellContent));
    });

    test("Copied single cells are not in a html table", async () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      copy(model, "A1");
      expect(model.getters.getClipboardContent()[ClipboardMIMEType.Html]).toEqual("1");
    });
  });

  test("can copy a rectangular selection", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    setCellContent(model, "C2", "c2");
    setCellContent(model, "C3", "c3");

    copy(model, "B2:C3");

    expect(getCell(model, "D1")).toBeUndefined();
    expect(getCell(model, "D2")).toBeUndefined();
    expect(getCell(model, "E1")).toBeUndefined();
    expect(getCell(model, "E2")).toBeUndefined();

    paste(model, "D1");

    expect(getCellContent(model, "D1")).toBe("b2");
    expect(getCellContent(model, "D2")).toBe("b3");
    expect(getCellContent(model, "E1")).toBe("c2");
    expect(getCellContent(model, "E2")).toBe("c3");
  });

  test("empty clipboard: getClipboardContent returns a tab", () => {
    const model = new Model();
    expect(model.getters.getClipboardTextContent()).toBe("\t");
  });

  test("getClipboardContent exports multiple cells", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    setCellContent(model, "C2", "c2");
    setCellContent(model, "C3", "c3");
    copy(model, "B2:C3");
    expect(model.getters.getClipboardTextContent()).toBe("b2\tc2\nb3\tc3");
  });

  test("can paste multiple cells from os clipboard", () => {
    const model = new Model();
    pasteFromOSClipboard(model, "C1", "a\t1\nb\t2");

    expect(getCellContent(model, "C1")).toBe("a");
    expect(getCellContent(model, "C2")).toBe("b");
    expect(getCellContent(model, "D1")).toBe("1");
    expect(getCellContent(model, "D2")).toBe("2");
  });

  test("Pasting content from os that will destroy a merge will fail", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    merge(model, "B2:C3");
    const result = pasteFromOSClipboard(model, "B2", "a\t1\nb\t2");
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
    expect(model.getters.getMerges(sheetId).map(zoneToXc)).toEqual(["B2:C3"]);
  });

  test("pasting from OS will not change the viewport", () => {
    const model = new Model();
    const viewport = model.getters.getActiveMainViewport();
    pasteFromOSClipboard(model, "C60", "a\t1\nb\t2");
    expect(model.getters.getActiveMainViewport()).toEqual(viewport);
  });

  test("pasting numbers from windows clipboard => interpreted as number", () => {
    const model = new Model();
    pasteFromOSClipboard(model, "C1", "1\r\n2\r\n3");

    expect(getCellContent(model, "C1")).toBe("1");
    expect(getEvaluatedCell(model, "C1").value).toBe(1);
    expect(getCellContent(model, "C2")).toBe("2");
    expect(getEvaluatedCell(model, "C2").value).toBe(2);
    expect(getCellContent(model, "C3")).toBe("3");
    expect(getEvaluatedCell(model, "C3").value).toBe(3);
  });

  test("incompatible multiple selections: only last one is actually copied", () => {
    const model = new Model();
    setCellContent(model, "A1", "a1");
    setCellContent(model, "A2", "a2");
    setCellContent(model, "C1", "c1");
    copy(model, "A1:A2", "C1");

    expect(getClipboardVisibleZones(model).length).toBe(1);

    selectCell(model, "E1");
    paste(model, "E1");
    expect(getCellContent(model, "E1")).toBe("c1");
    expect(getCell(model, "E2")).toBeUndefined();
  });

  test("compatible multiple selections: each column is copied", () => {
    const model = new Model();
    setCellContent(model, "A1", "a1");
    setCellContent(model, "A2", "a2");
    setCellContent(model, "C1", "c1");
    setCellContent(model, "C2", "c2");
    copy(model, "A1:A2", " C1:C2");

    expect(getClipboardVisibleZones(model).length).toBe(2);

    paste(model, "E1");
    expect(getCellContent(model, "E1")).toBe("a1");
    expect(getCellContent(model, "E2")).toBe("a2");
    expect(getCellContent(model, "F1")).toBe("c1");
    expect(getCellContent(model, "F2")).toBe("c2");
  });

  test("Viewport won't move after pasting", () => {
    const model = new Model();
    copy(model, "A1:B2");

    setSelection(model, ["C60:D70"]);
    setViewportOffset(model, 0, 0);
    const viewport = model.getters.getActiveMainViewport();

    paste(model, "C60:D70");
    expect(model.getters.getActiveMainViewport()).toEqual(viewport);
  });

  describe("copy/paste a zone in a larger selection will duplicate the zone on the selection as long as it does not exceed it", () => {
    test("paste a value (zone with hight=1 and width=1)", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      copy(model, "A1");
      paste(model, "C2:D3");
      expect(getCellContent(model, "C2")).toBe("1");
      expect(getCellContent(model, "C3")).toBe("1");
      expect(getCellContent(model, "D2")).toBe("1");
      expect(getCellContent(model, "D3")).toBe("1");
    });

    test("paste a zone with hight zone > 1", () => {
      const model = new Model();
      setCellContent(model, "A1", "a1");
      setCellContent(model, "A2", "a2");
      copy(model, "A1:A2");
      paste(model, "A3:A7");
      expect(getCellContent(model, "A3")).toBe("a1");
      expect(getCellContent(model, "A4")).toBe("a2");
      expect(getCellContent(model, "A5")).toBe("a1");
      expect(getCellContent(model, "A6")).toBe("a2");
      expect(getCellContent(model, "A7")).toBe("");
    });

    test("paste a zone with width zone > 1", () => {
      const model = new Model();
      setCellContent(model, "A1", "a1");
      setCellContent(model, "B1", "b1");
      copy(model, "A1:B1");
      paste(model, "C1:G1");
      expect(getCellContent(model, "C1")).toBe("a1");
      expect(getCellContent(model, "D1")).toBe("b1");
      expect(getCellContent(model, "E1")).toBe("a1");
      expect(getCellContent(model, "F1")).toBe("b1");
      expect(getCellContent(model, "G1")).toBe("");
    });

    test("selection is updated to contain exactly the new pasted zone", () => {
      const model = new Model();
      copy(model, "A1:B2");

      // select C3:G7
      selectCell(model, "C3");
      setAnchorCorner(model, "G7");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 2, left: 2, bottom: 6, right: 6 });

      paste(model, "C3:G7");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 2, left: 2, bottom: 5, right: 5 });
    });
  });

  describe("cut/paste a zone in a larger selection will paste the zone only once", () => {
    test("paste a value (zone with hight=1 and width=1)", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      cut(model, "A1");
      paste(model, "C2:D3");
      expect(getCellContent(model, "C2")).toBe("1");
      expect(getCellContent(model, "C3")).toBe("");
      expect(getCellContent(model, "D2")).toBe("");
      expect(getCellContent(model, "D3")).toBe("");
    });

    test("with hight zone > 1", () => {
      const model = new Model();
      setCellContent(model, "A1", "a1");
      setCellContent(model, "A2", "a2");
      cut(model, "A1:A2");
      paste(model, "A3:A7");
      expect(getCellContent(model, "A3")).toBe("a1");
      expect(getCellContent(model, "A4")).toBe("a2");
      expect(getCellContent(model, "A5")).toBe("");
      expect(getCellContent(model, "A6")).toBe("");
      expect(getCellContent(model, "A7")).toBe("");
    });

    test("with width zone > 1", () => {
      const model = new Model();
      setCellContent(model, "A1", "a1");
      setCellContent(model, "B1", "b1");
      cut(model, "A1:B1");
      paste(model, "C1:G1");
      expect(getCellContent(model, "C1")).toBe("a1");
      expect(getCellContent(model, "D1")).toBe("b1");
      expect(getCellContent(model, "E1")).toBe("");
      expect(getCellContent(model, "F1")).toBe("");
      expect(getCellContent(model, "G1")).toBe("");
    });

    test("selection is updated to contain exactly the cut and pasted zone", () => {
      const model = new Model();
      cut(model, "A1:B2");

      // select C3:G7
      selectCell(model, "C3");
      setAnchorCorner(model, "G7");

      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 2, left: 2, bottom: 6, right: 6 });

      paste(model, "C3:G7");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 2, left: 2, bottom: 3, right: 3 });
    });
  });

  describe("copy/paste a zone in several selection will duplicate the zone on each selection", () => {
    test("paste a value (zone with hight=1 and width=1)", () => {
      const model = new Model();
      setCellContent(model, "A1", "33");
      copy(model, "A1");
      paste(model, "C1, E1");
      expect(getCellContent(model, "C1")).toBe("33");
      expect(getCellContent(model, "E1")).toBe("33");
    });

    test("selection is updated to contain exactly the new pasted zones", () => {
      const model = new Model();
      copy(model, "A1");

      // select C1 and E1
      selectCell(model, "C1");
      addCellToSelection(model, "E1");

      paste(model, "C1, E1");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 0, right: 2 });
      expect(model.getters.getSelectedZones()[1]).toEqual({ top: 0, left: 4, bottom: 0, right: 4 });
    });

    test("paste a zone with more than one value is not allowed", () => {
      const model = new Model();
      copy(model, "A1:B2");
      const result = paste(model, "C1, E1");
      expect(result).toBeCancelledBecause(CommandResult.WrongPasteSelection);
    });
  });

  describe("cut/paste a zone in several selection will paste the zone only once", () => {
    test("paste a value (zone with hight=1 and width=1)", () => {
      const model = new Model();
      setCellContent(model, "A1", "33");
      cut(model, "A1");
      paste(model, "E1, C1");
      expect(getCellContent(model, "E1")).toBe("33");
      expect(getCellContent(model, "C1")).toBe("");
    });

    test("selection is updated to contain exactly the new pasted zones", () => {
      const model = new Model();
      cut(model, "A1");

      // select C1 and E1
      selectCell(model, "C1");
      addCellToSelection(model, "E1");

      paste(model, "C1, E1");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 0, right: 2 });
      expect(model.getters.getSelectedZones().length).toBe(1);
    });

    test("paste a zone with more than one value is not allowed", () => {
      const model = new Model();
      cut(model, "A1:B2");
      const result = paste(model, "C1, E1");
      expect(result).toBeCancelledBecause(CommandResult.WrongPasteSelection);
    });
  });

  describe("cut/paste several zones", () => {
    test("cutting is not allowed if multiple selection", () => {
      const model = new Model();
      const result = cut(model, "A1", "A2");
      expect(result).toBeCancelledBecause(CommandResult.WrongCutSelection);
    });
  });

  describe("copy/paste several zones", () => {
    beforeEach(() => {
      model = new Model();
      setCellContent(model, "A1", "a1");
      setCellContent(model, "A2", "a2");
      setCellContent(model, "A3", "a3");
      setCellContent(model, "B1", "b1");
      setCellContent(model, "B2", "b2");
      setCellContent(model, "B3", "b3");
      setCellContent(model, "C1", "c1");
      setCellContent(model, "C2", "c2");
      setCellContent(model, "C3", "c3");
    });

    describe("if they have same left and same right", () => {
      test("copy all zones", () => {
        copy(model, "A1:B1", " A2:B2");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:B1"));
        expect(getClipboardVisibleZones(model)[1]).toEqual(toZone("A2:B2"));
        expect(getClipboardVisibleZones(model).length).toBe(2);
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
        expect(getCellContent(model, "G6")).toBe("b1");
        expect(getCellContent(model, "G7")).toBe("b2");
      });

      test("Copy cells only once", () => {
        copy(model, "A1:A3", "A1:A2", "A2:A3", "A1", "A2", "A3");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:A3"));
        expect(getClipboardVisibleZones(model).length).toBe(1);
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
        expect(getCellContent(model, "F8")).toBe("a3");
        expect(getCellContent(model, "F9")).toBe("");
      });

      test("paste zones without gap", () => {
        // gap between 1st selection and 2nd selection is one row
        copy(model, "A1:B1", "A3:B3");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:B1"));
        expect(getClipboardVisibleZones(model)[1]).toEqual(toZone("A3:B3"));
        expect(getClipboardVisibleZones(model).length).toBe(2);
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a3");
        expect(getCellContent(model, "G6")).toBe("b1");
        expect(getCellContent(model, "G7")).toBe("b3");
      });

      test("paste zones selected from different orders does not influence the final result", () => {
        copy(model, "A1", "A2");
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");

        copy(model, "A2", "A1");
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
      });
    });

    describe("if zones have same top and same bottom", () => {
      test("copy all zones", () => {
        copy(model, "A1:A2", "B1:B2");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:A2"));
        expect(getClipboardVisibleZones(model)[1]).toEqual(toZone("B1:B2"));
        expect(getClipboardVisibleZones(model).length).toBe(2);
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
        expect(getCellContent(model, "G6")).toBe("b1");
        expect(getCellContent(model, "G7")).toBe("b2");
      });

      test("Copy cells only once", () => {
        copy(model, "A1:C1", "A1:B1", "B1:C1", "A1", "B1", "C1");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:C1"));
        expect(getClipboardVisibleZones(model).length).toBe(1);
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "G6")).toBe("b1");
        expect(getCellContent(model, "H6")).toBe("c1");
        expect(getCellContent(model, "I6")).toBe("");
      });

      test("paste zones without gap", () => {
        // gap between 1st selection and 2nd selection is one column
        copy(model, "A1:A2", "C1:C2");
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
        expect(getCellContent(model, "G6")).toBe("c1");
        expect(getCellContent(model, "G7")).toBe("c2");
      });

      test("paste zones selected from different orders does not influence the final result", () => {
        copy(model, "A1", "B1");
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "G6")).toBe("b1");

        copy(model, "A1", "B1");
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "G6")).toBe("b1");
      });
    });

    describe("copy/paste the last zone if zones don't have [same top and same bottom] or [same left and same right]", () => {
      test("test with dissociated zones", () => {
        copy(model, "A1:A2", "B2:B3");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("B2:B3"));
        expect(getClipboardVisibleZones(model).length).toBe(1);
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("b2");
        expect(getCellContent(model, "F7")).toBe("b3");
      });

      test("test with overlapped zones", () => {
        copy(model, "A1:B2", "B2:B3");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("B2:B3"));
        expect(getClipboardVisibleZones(model).length).toBe(1);
        paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("b2");
        expect(getCellContent(model, "F7")).toBe("b3");
      });
    });

    test("can paste zones in a larger selection", () => {
      copy(model, "A1", "C1");
      paste(model, "E1:I1");
      expect(getCellContent(model, "E1")).toBe("a1");
      expect(getCellContent(model, "F1")).toBe("c1");
      expect(getCellContent(model, "G1")).toBe("a1");
      expect(getCellContent(model, "H1")).toBe("c1");
      expect(getCellContent(model, "I1")).toBe("");
    });

    test("is not allowed if paste in several selection", () => {
      copy(model, "A1", "C1");
      const result = paste(model, "A2, B2");
      expect(result).toBeCancelledBecause(CommandResult.WrongPasteSelection);
    });
  });
  test("can copy and paste a cell with STRING content", () => {
    const model = new Model();
    setCellContent(model, "B2", '="test"');

    expect(getCellText(model, "B2")).toEqual('="test"');
    expect(getEvaluatedCell(model, "B2").value).toEqual("test");

    copy(model, "B2");
    paste(model, "D2");
    expect(getCellText(model, "B2")).toEqual('="test"');
    expect(getEvaluatedCell(model, "B2").value).toEqual("test");
    expect(getCellText(model, "D2")).toEqual('="test"');
    expect(getEvaluatedCell(model, "D2").value).toEqual("test");
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can undo a paste operation", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");

    copy(model, "B2");
    paste(model, "D2");
    expect(getCell(model, "D2")).toBeDefined();
    undo(model);
    expect(getCell(model, "D2")).toBeUndefined();
  });

  test("can paste-format a cell with style", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    setStyle(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    copy(model, "B2");
    paste(model, "C2", "onlyFormat");
    expect(getCellContent(model, "C2")).toBe("");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("can copy and paste format", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setStyle(model, "B2", { bold: true });
    selectCell(model, "B2");
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    copy(model, "B2");
    paste(model, "C2", "onlyFormat");
    expect(getCellContent(model, "C2")).toBe("");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("paste format does not remove content", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "C2", "c2");
    setStyle(model, "B2", { bold: true });
    selectCell(model, "B2");
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    copy(model, "B2");
    paste(model, "C2", "onlyFormat");

    expect(getCellContent(model, "C2")).toBe("c2");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("can undo a paste format", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setStyle(model, "B2", { bold: true });
    selectCell(model, "B2");
    copy(model, "B2");
    paste(model, "C2", "onlyFormat");

    expect(getCellContent(model, "C2")).toBe("");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });

    undo(model);
    expect(getCell(model, "C2")).toBeUndefined();
  });

  test("can copy and paste as value", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    copy(model, "B2");
    paste(model, "C2", "asValue");
    expect(getCellContent(model, "C2")).toBe("b2");
  });

  test("can copy a cell with a style and paste as value", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setStyle(model, "B2", { bold: true });
    selectCell(model, "B2");
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    copy(model, "B2");
    paste(model, "C2", "asValue");

    expect(getEvaluatedCell(model, "C2").value).toBe("b2");
    expect(getCell(model, "C2")!.style).not.toBeDefined();
  });

  test("can copy a cell with a border and paste as value", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    setZoneBorders(model, { position: "bottom" });
    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });

    copy(model, "B2");
    paste(model, "C2", "asValue");

    expect(getEvaluatedCell(model, "C2").value).toBe("b2");
    expect(getBorder(model, "C2")).toBeNull();
  });

  test("can copy a cell with a conditional format and paste as value", () => {
    const model = new Model({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "C1", "1");
    setCellContent(model, "C2", "2");
    const sheetId = model.getters.getActiveSheetId();
    let result = model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1,A2"),
      sheetId,
    });

    expect(result).toBeSuccessfullyDispatched();
    copy(model, "A1");
    paste(model, "C1", "asValue");
    copy(model, "A2");
    paste(model, "C2", "asValue");
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2")).toEqual({});
    expect(getStyle(model, "C1")).toEqual({});
    expect(getStyle(model, "C2")).toEqual({});
  });

  test("paste as value does not remove style", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "C3", "c3");
    selectCell(model, "C3");
    setStyle(model, "C3", { bold: true });
    expect(getCell(model, "C3")!.style).toEqual({ bold: true });

    copy(model, "B2");
    paste(model, "C3", "asValue");

    expect(getCellContent(model, "C3")).toBe("b2");
    expect(getCell(model, "C3")!.style).toEqual({ bold: true });
  });

  test("paste as value does not remove border", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    setCellContent(model, "C3", "c3");
    selectCell(model, "C3");
    setZoneBorders(model, { position: "bottom" });
    expect(getBorder(model, "C3")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C4")).toEqual({ top: DEFAULT_BORDER_DESC });

    copy(model, "B2");
    paste(model, "C3", "asValue");

    expect(getCellContent(model, "C3")).toBe("b2");
    expect(getBorder(model, "C3")).toEqual({ bottom: DEFAULT_BORDER_DESC });
  });

  test("paste as value does not remove number format", () => {
    const model = new Model();
    setCellContent(model, "B2", "0.451");
    setFormat(model, "B2", "0.00%");
    expect(getCellContent(model, "B2")).toBe("45.10%");

    setCellContent(model, "C3", "42");
    setFormat(model, "C3", "#,##0.00");
    expect(getCellContent(model, "C3")).toBe("42.00");

    copy(model, "B2");
    paste(model, "C3", "asValue");
    expect(getCellContent(model, "C3")).toBe("45.10%");
  });

  test("can copy a formula and paste as value", () => {
    const model = new Model();
    setCellContent(model, "A1", "=SUM(1+2)");
    setCellContent(model, "A2", "=EQ(42,42)");
    setCellContent(model, "A3", '=CONCAT("Ki","kou")');
    copy(model, "A1:A3");
    paste(model, "B1", "asValue");
    expect(getCellContent(model, "B1")).toBe("3");
    expect(getCellContent(model, "B2")).toBe("TRUE");
    expect(getCellContent(model, "B3")).toBe("Kikou");
  });

  test("can copy a formula and paste -> apply the format defined by user, if not apply the automatic evaluated format ", () => {
    const model = new Model();

    // formula without format
    setCellContent(model, "A1", "=SUM(1+2)");

    // formula with format seted on it
    setCellContent(model, "A2", "=SUM(1+2)");
    setCellFormat(model, "A2", "0%");

    // formula that return value with format
    setCellContent(model, "A3", "=DATE(2042,1,1)");

    // formula that return value with format and other format seted on it
    setCellContent(model, "A4", "=DATE(2042,1,1)");
    setCellFormat(model, "A4", "0%");

    // formula that return value with format infered from reference
    setCellContent(model, "A5", "3");
    setCellFormat(model, "A5", "0%");
    setCellContent(model, "A6", "=SUM(1+A5)");

    // formula that return value with format infered from reference and other format seted on it
    setCellContent(model, "A7", "3");
    setCellFormat(model, "A7", "0%");
    setCellContent(model, "A8", "=SUM(1+A7)");
    setCellFormat(model, "A8", "#,##0[$$]");

    copy(model, "A1:A8");
    paste(model, "B1");

    setCellFormat(model, "B5", "#,##0[$$]");
    setCellFormat(model, "B7", "0%");

    expect(getCellContent(model, "B1")).toBe("3");
    expect(getCellContent(model, "B2")).toBe("300%");
    expect(getCellContent(model, "B3")).toBe("1/1/2042");
    expect(getCellContent(model, "B4")).toBe("5186700%");
    expect(getCellContent(model, "B6")).toBe("4$");
    expect(getCellContent(model, "B8")).toBe("4$");
  });

  test("can copy a formula and paste format only --> apply the automatic evaluated format", () => {
    const model = new Model();

    // formula without format
    setCellContent(model, "A1", "=SUM(1+2)");

    // formula with format seted on it
    setCellContent(model, "A2", "=SUM(1+2)");
    setCellFormat(model, "A2", "0%");

    // formula that return value with format
    setCellContent(model, "A3", "=DATE(2042,1,1)");

    // formula that return value with format and other format seted on it
    setCellContent(model, "A4", "=DATE(2042,1,1)");
    setCellFormat(model, "A4", "0%");

    // formula that return value with format infered from reference
    setCellContent(model, "A5", "3");
    setCellFormat(model, "A5", "0%");
    setCellContent(model, "A6", "=SUM(1+A5)");

    // formula that return value with format infered from reference and other format seted on it
    setCellContent(model, "A7", "3");
    setCellFormat(model, "A7", "0%");
    setCellContent(model, "A8", "=SUM(1+A7)");
    setCellFormat(model, "A8", "#,##0[$$]");

    setCellContent(model, "B1", "42");
    setCellContent(model, "B2", "42");
    setCellContent(model, "B3", "42");
    setCellContent(model, "B4", "42");
    setCellContent(model, "B6", "42");
    setCellContent(model, "B8", "42");

    copy(model, "A1:A8");
    paste(model, "B1", "onlyFormat");

    expect(getCellContent(model, "B1")).toBe("42");
    expect(getCellContent(model, "B2")).toBe("4200%");
    expect(getCellContent(model, "B3")).toBe("2/10/1900");
    expect(getCellContent(model, "B4")).toBe("4200%");
    expect(getCellContent(model, "B6")).toBe("4200%");
    expect(getCellContent(model, "B8")).toBe("42$");
  });

  test("can undo a paste as value", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    setStyle(model, "B2", { bold: true });
    copy(model, "B2");
    paste(model, "C2", "asValue");

    expect(getCellContent(model, "C2")).toBe("b2");
    expect(getCell(model, "C2")!.style).not.toBeDefined();

    undo(model);
    expect(getCell(model, "C2")).toBeUndefined();
  });

  test("cut and paste as value is not allowed", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    cut(model, "B2");
    const result = paste(model, "C3", "asValue");
    expect(result).toBeCancelledBecause(CommandResult.WrongPasteOption);
  });

  test("cut and paste format only is not allowed", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    cut(model, "B2");
    const result = paste(model, "C3", "onlyFormat");
    expect(result).toBeCancelledBecause(CommandResult.WrongPasteOption);
  });

  describe("copy/paste a formula with references", () => {
    test("update the references", () => {
      const model = new Model();
      setCellContent(model, "A1", "=SUM(C1:C2)");
      copy(model, "A1");
      paste(model, "B2");
      expect(getCellText(model, "B2")).toBe("=SUM(D2:D3)");
    });

    /* $C2:E$1 <=> $C$1:E2
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
      ["=SUM($C1:D$1)", "=SUM($C$1:E2)"], //excel and g-sheet compatibility ($C2:E$1 <=> $C$1:E2)
    ])("does not update fixed references", (value, expected) => {
      const model = new Model();
      setCellContent(model, "A1", value);
      copy(model, "A1");
      paste(model, "B2");
      expect(getCellText(model, "B2")).toBe(expected);
    });

    test("update cross-sheet reference", () => {
      const model = new Model();
      createSheet(model, { sheetId: "42" });
      setCellContent(model, "B2", "=Sheet2!B2");
      copy(model, "B2");
      paste(model, "B3");
      expect(getCellText(model, "B3")).toBe("=Sheet2!B3");
    });

    test("update cross-sheet reference with a space in the name", () => {
      const model = new Model();
      createSheetWithName(model, { sheetId: "42" }, "Sheet 2");
      setCellContent(model, "B2", "='Sheet 2'!B2");
      copy(model, "B2");
      paste(model, "B3");
      expect(getCellText(model, "B3")).toBe("='Sheet 2'!B3");
    });

    test("update cross-sheet reference in a smaller sheet", () => {
      const model = new Model();
      createSheet(model, { sheetId: "42", rows: 2, cols: 2 });
      setCellContent(model, "A1", "=Sheet2!A1:A2");
      copy(model, "A1");
      paste(model, "A2");
      expect(getCellText(model, "A2")).toBe("=Sheet2!A2:A3");
    });

    test("update cross-sheet reference to a range", () => {
      const model = new Model();
      createSheet(model, { sheetId: "42" });
      setCellContent(model, "A1", "=SUM(Sheet2!A2:A5)");
      copy(model, "A1");
      paste(model, "B1");
      expect(getCellText(model, "B1")).toBe("=SUM(Sheet2!B2:B5)");
    });
  });

  test("cut/paste a formula with references does not update references in the formula", () => {
    const model = new Model();
    setCellContent(model, "A1", "=SUM(C1:C2)");
    cut(model, "A1");
    paste(model, "B2");
    expect(getCellText(model, "B2")).toBe("=SUM(C1:C2)");
  });

  test("cut/paste a formula with references in another sheet updates the sheet references in the formula", () => {
    const model = new Model();
    createSheet(model, { sheetId: "sh2", name: "Sheet2" });
    setCellContent(model, "A1", "=SUM(C1:C2)");
    setCellContent(model, "B1", "=Sheet2!A1 + A2");
    cut(model, "A1:B1");

    activateSheet(model, "sh2");
    paste(model, "A1");
    expect(getCellText(model, "A1")).toBe("=SUM(Sheet1!C1:C2)");
    expect(getCellText(model, "B1")).toBe("=A1 + Sheet1!A2");
  });

  test("copy/paste a zone present in formulas references does not update references", () => {
    const model = new Model();
    setCellContent(model, "A1", "=B2");
    copy(model, "B2");
    paste(model, "C3");
    expect(getCellText(model, "A1")).toBe("=B2");
  });

  describe("cut/paste a zone present in formulas references", () => {
    test("update references", () => {
      const model = new Model();
      setCellContent(model, "A1", "=B2");
      cut(model, "B2");
      paste(model, "C3");
      expect(getCellText(model, "A1")).toBe("=C3");
    });

    test("update references to a range", () => {
      const model = new Model();
      setCellContent(model, "A1", "=SUM(B2:C3)");
      cut(model, "B2:C3");
      paste(model, "D4");
      expect(getCellText(model, "A1")).toBe("=SUM(D4:E5)");
    });

    test("update fixed references", () => {
      const model = new Model();
      setCellContent(model, "A1", "=$B$2");
      cut(model, "B2");
      paste(model, "C3");
      expect(getCellText(model, "A1")).toBe("=$C$3");
    });

    test("update cross-sheet reference", () => {
      const model = new Model();
      createSheet(model, { sheetId: "Sheet2" });
      setCellContent(model, "A1", "=Sheet2!$B$2");

      activateSheet(model, "Sheet2");
      cut(model, "B2");

      createSheet(model, { activate: true, sheetId: "Sheet3" });
      paste(model, "C3");

      activateSheet(model, "Sheet1");
      expect(getCellText(model, "A1")).toBe("=Sheet3!$C$3");
    });

    test("update references even if the formula is present in the cutting zone", () => {
      const model = new Model();
      setCellContent(model, "A1", "=B1");
      setCellContent(model, "B1", "b1");
      cut(model, "A1:B1");
      paste(model, "A2");

      expect(getCellText(model, "A1")).toBe("");
      expect(getCellText(model, "B1")).toBe("");
      expect(getCellText(model, "A2")).toBe("=B2");
      expect(getCellText(model, "B2")).toBe("b1");
    });

    test("does not update reference if it isn't fully included in the zone", () => {
      const model = new Model();
      setCellContent(model, "A1", "=SUM(B1:C1)+B1");
      cut(model, "B1");
      paste(model, "B2");
      expect(getCellText(model, "A1")).toBe("=SUM(B1:C1)+B2");
    });

    test("does not update reference if it isn't fully included in the zone even if the formula is present in the cutting zone", () => {
      const model = new Model();
      setCellContent(model, "A1", "=SUM(B1:C1)+B1");
      setCellContent(model, "B1", "b1");
      cut(model, "A1:B1");
      paste(model, "A2");

      expect(getCellText(model, "A1")).toBe("");
      expect(getCellText(model, "B1")).toBe("");
      expect(getCellText(model, "A2")).toBe("=SUM(B1:C1)+B2");
      expect(getCellText(model, "B2")).toBe("b1");
    });
  });

  test.each([
    ["=SUM(1:2)", "=SUM(2:3)"],
    ["=$C1:1", "=$C2:2"],
    ["=SUM($A:D$2)", "=SUM($A$2:E)"],
  ])("can copy and paste formula with full cols/rows", (value, expected) => {
    const model = new Model();
    setCellContent(model, "A1", value);
    copy(model, "A1");
    model.dispatch("PASTE", { target: target("B2") });
    expect(getCellText(model, "B2")).toBe(expected);
  });

  test("can copy format from empty cell to another cell to clear format", () => {
    const model = new Model();

    // write something in B2 and set its format
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    setStyle(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    // select A1 and copy format
    copy(model, "A1");

    // select B2 and paste format
    paste(model, "B2", "onlyFormat");

    expect(getCellContent(model, "B2")).toBe("b2");
    expect(getCell(model, "B2")!.style).not.toBeDefined();
  });

  test("can copy and paste a conditional formatted cell", () => {
    const model = new Model({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "C1", "1");
    setCellContent(model, "C2", "2");
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      sheetId,
      ranges: toRangesData(sheetId, "A1,A2"),
    });
    copy(model, "A1");
    paste(model, "C1");
    copy(model, "A2");
    paste(model, "C2");
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2")).toEqual({});
    expect(getStyle(model, "C1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "C2")).toEqual({});
  });
  test("can cut and paste a conditional formatted cell", () => {
    const model = new Model({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "C1", "1");
    setCellContent(model, "C2", "2");
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1,A2"),
      sheetId,
    });
    cut(model, "A1");
    paste(model, "C1");
    cut(model, "A2");
    paste(model, "C2");
    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "A2")).toEqual({});
    expect(getStyle(model, "C1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "C2")).toEqual({});
  });

  test("can copy and paste a conditional formatted zone", () => {
    const model = new Model({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1,A2"),
      sheetId,
    });
    copy(model, "A1:A2");
    paste(model, "B1");
    paste(model, "C1");
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2")).toEqual({});
    expect(getStyle(model, "B1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "B2")).toEqual({});
    expect(getStyle(model, "C1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "C2")).toEqual({});
    setCellContent(model, "C1", "2");
    setCellContent(model, "C2", "1");
    expect(getStyle(model, "C1")).toEqual({});
    expect(getStyle(model, "C2")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("can cut and paste a conditional formatted zone", () => {
    const model = new Model({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1,A2"),
      sheetId,
    });
    cut(model, "A1:A2");
    paste(model, "B1");
    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "A2")).toEqual({});
    expect(getStyle(model, "B1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "B2")).toEqual({});
    setCellContent(model, "B1", "2");
    setCellContent(model, "B2", "1");
    expect(getStyle(model, "B1")).toEqual({});
    expect(getStyle(model, "B2")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("can copy and paste a conditional formatted cell to another page", () => {
    const model = new Model({
      sheets: [
        { id: "s1", colNumber: 5, rowNumber: 5 },
        { id: "s2", colNumber: 5, rowNumber: 5 },
      ],
    });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
      ranges: toRangesData(sheetId, "A1,A2"),
      sheetId,
    });
    copy(model, "A1:A2");
    activateSheet(model, "s2");
    paste(model, "A1");
    expect(getStyle(model, "A1", "s2")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2", "s2")).toEqual({});
    setCellContent(model, "A1", "2");
    setCellContent(model, "A2", "1");
    expect(getStyle(model, "A1", "s2")).toEqual({});
    expect(getStyle(model, "A2", "s2")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("can cut and paste a conditional formatted zone to another page", () => {
    const model = new Model({ sheets: [{ id: "sheet1" }, { id: "sheet2" }] });
    const cf = createEqualCF("1", { fillColor: "#FF0000" }, "id");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf,
      ranges: toRangesData("sheet1", "A1:A2"),
      sheetId: "sheet1",
    });

    cut(model, "A1:A2");
    activateSheet(model, "sheet2");
    paste(model, "A1");

    expect(model.getters.getConditionalFormats("sheet2")).toMatchObject([
      { ranges: ["A1:A2"], rule: cf.rule },
    ]);
    expect(model.getters.getConditionalFormats("sheet1")).toEqual([]);
  });

  test("copy paste CF in another sheet => change CF => copy paste again doesn't overwrite the previously pasted CF", () => {
    const model = new Model();
    createSheet(model, {});
    const sheet1Id = model.getters.getSheetIds()[0];
    const sheet2Id = model.getters.getSheetIds()[1];

    const cf = createEqualCF("2", { fillColor: "#00FF00" }, "cfId");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf,
      ranges: toRangesData(sheet1Id, "A1"),
      sheetId: sheet1Id,
    });

    copy(model, "A1");
    activateSheet(model, sheet2Id);
    model.dispatch("PASTE", { target: target("A1") });
    expect(model.getters.getConditionalFormats(sheet2Id)).toMatchObject([
      { ranges: ["A1"], rule: { style: { fillColor: "#00FF00" } } },
    ]);

    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { fillColor: "#FF0000" }, "cfId"),
      ranges: toRangesData(sheet1Id, "A1"),
      sheetId: sheet1Id,
    });
    activateSheet(model, sheet1Id);
    copy(model, "A1");
    activateSheet(model, sheet2Id);
    model.dispatch("PASTE", { target: target("B2") });
    expect(model.getters.getConditionalFormats(sheet2Id)).toMatchObject([
      { ranges: ["A1"], rule: { style: { fillColor: "#00FF00" } } },
      { ranges: ["B2"], rule: { style: { fillColor: "#FF0000" } } },
    ]);
  });

  test("can copy and paste a cell which contains a cross-sheet reference", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    setCellContent(model, "B2", "=Sheet2!B2");

    copy(model, "B2");
    paste(model, "B3");
    expect(getCellText(model, "B3")).toBe("=Sheet2!B3");
  });

  test("can copy and paste a cell which contains a cross-sheet reference with a space in the name", () => {
    const model = new Model();
    createSheetWithName(model, { sheetId: "42" }, "Sheet 2");
    setCellContent(model, "B2", "='Sheet 2'!B2");

    copy(model, "B2");
    paste(model, "B3");
    expect(getCellText(model, "B3")).toBe("='Sheet 2'!B3");
  });

  test("can copy and paste a cell which contains a cross-sheet reference in a smaller sheet", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42", rows: 2, cols: 2 });
    setCellContent(model, "A1", "=Sheet2!A1:A2");

    copy(model, "A1");
    paste(model, "A2");
    expect(getCellText(model, "A2")).toBe("=Sheet2!A2:A3");
  });

  test("can copy and paste a cell which contains a cross-sheet reference to a range", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    setCellContent(model, "A1", "=SUM(Sheet2!A2:A5)");

    copy(model, "A1");
    paste(model, "B1");
    expect(getCellText(model, "B1")).toBe("=SUM(Sheet2!B2:B5)");
  });

  test.each([
    ["=A1", "=#REF"],
    ["=SUM(A1:B1)", "=SUM(#REF)"],
  ])("Copy invalid ranges due to row deletion", (initialFormula, expectedInvalidFormula) => {
    const model = new Model();
    setCellContent(model, "A3", initialFormula);
    deleteRows(model, [0]);
    expect(getCell(model, "A2")!.content).toBe(expectedInvalidFormula);

    copy(model, "A2");
    paste(model, "C5");
    expect(getCell(model, "C5")!.content).toBe(expectedInvalidFormula);
  });

  test.each([
    ["=A1", "=#REF"],
    ["=SUM(A1:A2)", "=SUM(#REF)"],
  ])("Copy invalid ranges due to column deletion", (initialFormula, expectedInvalidFormula) => {
    const model = new Model();
    setCellContent(model, "C1", initialFormula);
    deleteColumns(model, ["A"]);
    expect(getCell(model, "B1")!.content).toBe(expectedInvalidFormula);

    copy(model, "B1");
    paste(model, "C3");
    expect(getCell(model, "C3")!.content).toBe(expectedInvalidFormula);
  });

  test.each([
    ["=A1", "=#REF"],
    ["=SUM(A1:B1)", "=SUM(#REF)"],
  ])("Cut invalid ranges due to row deletion", (initialFormula, expectedInvalidFormula) => {
    const model = new Model();
    setCellContent(model, "A3", initialFormula);
    deleteRows(model, [0]);
    expect(getCell(model, "A2")!.content).toBe(expectedInvalidFormula);

    cut(model, "A2");
    paste(model, "C5");
    expect(getCell(model, "C5")!.content).toBe(expectedInvalidFormula);
  });

  test.each([
    ["=A1", "=#REF"],
    ["=SUM(A1:A2)", "=SUM(#REF)"],
  ])("Cut invalid ranges due to column deletion", (initialFormula, expectedInvalidFormula) => {
    const model = new Model();
    setCellContent(model, "C1", initialFormula);
    deleteColumns(model, ["A"]);
    expect(getCell(model, "B1")!.content).toBe(expectedInvalidFormula);

    cut(model, "B1");
    paste(model, "C3");
    expect(getCell(model, "C3")!.content).toBe(expectedInvalidFormula);
  });
});

describe("clipboard: pasting outside of sheet", () => {
  test("can copy and paste a full column", () => {
    const model = new Model();
    setCellContent(model, "A1", "txt");
    const activeSheetId = model.getters.getActiveSheetId();
    const currentRowNumber = model.getters.getNumberRows(activeSheetId);

    copy(model, zoneToXc(model.getters.getColsZone(activeSheetId, 0, 0)));
    paste(model, "B2");
    expect(model.getters.getNumberRows(activeSheetId)).toBe(currentRowNumber + 1);
    expect(getCellContent(model, "B2")).toBe("txt");
    expect(model.getters.getSelectedZones()).toEqual([toZone("B2:B101")]);
  });

  test("can copy and paste a full row", () => {
    const model = new Model();
    setCellContent(model, "A1", "txt");

    const activeSheetId = model.getters.getActiveSheetId();
    const currentColNumber = model.getters.getNumberCols(activeSheetId);

    copy(model, zoneToXc(model.getters.getRowsZone(activeSheetId, 0, 0)));
    paste(model, "B2");
    expect(model.getters.getNumberCols(activeSheetId)).toBe(currentColNumber + 1);
    expect(getCellContent(model, "B2")).toBe("txt");
    expect(model.getters.getSelectedZones()).toEqual([toZone("B2:AA2")]);
  });

  test("fill down on cell(s) of edge row should do nothing", async () => {
    const model = new Model();
    setCellContent(model, "B1", "b1");
    selectCell(model, "B1");
    copyPasteAboveCells(model);
    expect(getCellContent(model, "B1")).toBe("b1");

    setCellContent(model, "C1", "c1");
    setSelection(model, ["B1:C1"]);
    copyPasteAboveCells(model);
    expect(getCellContent(model, "B1")).toBe("b1");
    expect(getCellContent(model, "C1")).toBe("c1");
  });

  test("fill right on cell(s) of edge column should do nothing", async () => {
    const model = new Model();
    setCellContent(model, "A2", "a2");
    selectCell(model, "A2");
    copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "A2")).toBe("a2");

    setCellContent(model, "A3", "a3");
    setSelection(model, ["A2:A3"]);
    copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "A2")).toBe("a2");
    expect(getCellContent(model, "A3")).toBe("a3");
  });

  test("fill down selection with single row -> for each cell, replicates the cell above it", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    copyPasteAboveCells(model);
    expect(getCell(model, "B2")).toBe(undefined);

    setCellContent(model, "B1", "b1");
    setStyle(model, "B1", { bold: true, fillColor: "red" });
    setCellContent(model, "B2", "b2");
    selectCell(model, "B2");
    copyPasteAboveCells(model);
    expect(getCellContent(model, "B2")).toBe("b1");
    expect(getStyle(model, "B2")).toEqual({ bold: true, fillColor: "red" });

    setCellContent(model, "C1", "c1");
    setCellContent(model, "D1", "d1");
    setSelection(model, ["B2:D2"]);
    copyPasteAboveCells(model);
    expect(getCellContent(model, "B2")).toBe("b1");
    expect(getStyle(model, "B2")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "C2")).toBe("c1");
    expect(getCellContent(model, "D2")).toBe("d1");
  });

  test("fill right selection with single column -> for each cell, replicates the cell on its left", async () => {
    const model = new Model();
    setCellContent(model, "B1", "b1");
    selectCell(model, "B1");
    copyPasteCellsOnLeft(model);
    expect(getCell(model, "B1")).toBe(undefined);

    setCellContent(model, "A1", "a1");
    setStyle(model, "A1", { bold: true, fillColor: "red" });
    setCellContent(model, "B1", "b1");
    selectCell(model, "B1");
    copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "B1")).toBe("a1");
    expect(getStyle(model, "B1")).toEqual({ bold: true, fillColor: "red" });

    setCellContent(model, "A2", "a2");
    setCellContent(model, "A3", "a3");
    setSelection(model, ["B1:B3"]);
    copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "B1")).toBe("a1");
    expect(getStyle(model, "B1")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "B2")).toBe("a2");
    expect(getCellContent(model, "B3")).toBe("a3");
  });

  test("fill down selection with multiple rows -> copies first row and pastes in each subsequent row", async () => {
    const model = new Model();
    setCellContent(model, "B3", "b3");
    setSelection(model, ["B2:B3"]);
    copyPasteAboveCells(model);
    expect(getCell(model, "B2")).toBe(undefined);
    expect(getCell(model, "B3")).toBe(undefined);

    setCellContent(model, "B1", "b1");
    setCellContent(model, "B2", "b2");
    setStyle(model, "B2", { bold: true, fillColor: "red" });
    setCellContent(model, "C2", "c2");
    setSelection(model, ["B2:C3"]);
    copyPasteAboveCells(model);
    expect(getCellContent(model, "B2")).toBe("b2");
    expect(getStyle(model, "B2")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "B3")).toBe("b2");
    expect(getStyle(model, "B3")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "C2")).toBe("c2");
    expect(getCellContent(model, "C3")).toBe("c2");
  });

  test("CopyPasteAboveCell and copyPasteCellsOnLeft do not change the clipboard state", () => {
    const model = new Model();
    setCellContent(model, "B3", "b3");
    cut(model, "B3");
    setSelection(model, ["A1:B2"]);
    copyPasteAboveCells(model);

    expect(model.getters.isCutOperation()).toBe(true);
    paste(model, "A2");
    expect(getCellContent(model, "A2")).toBe("b3");

    setCellContent(model, "B3", "b3");
    cut(model, "B3");
    setSelection(model, ["A1:B2"]);
    copyPasteCellsOnLeft(model);

    expect(model.getters.isCutOperation()).toBe(true);
    paste(model, "A2");
    expect(getCellContent(model, "A2")).toBe("b3");
  });

  test("Delete Cell and Insert Cell do not invalidate the clipboard", () => {
    const model = new Model();
    setCellContent(model, "B3", "b3");
    copy(model, "B3");

    deleteCells(model, "A1", "up");
    expect(model.getters.isCutOperation()).toBe(false);
    paste(model, "A2");
    expect(getCellContent(model, "A2")).toBe("b3");

    insertCells(model, "A1", "down");
    expect(model.getters.isCutOperation()).toBe(false);
    paste(model, "A5");
    expect(getCellContent(model, "A5")).toBe("b3");
  });

  test("fill right selection with multiple columns -> copies first column and pastes in each subsequent column, ", async () => {
    const model = new Model();
    setCellContent(model, "C1", "c1");
    setSelection(model, ["B1:C1"]);
    copyPasteCellsOnLeft(model);
    expect(getCell(model, "B1")).toBe(undefined);
    expect(getCell(model, "C1")).toBe(undefined);

    setCellContent(model, "A1", "a1");
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B1", "b1");
    setStyle(model, "B1", { bold: true, fillColor: "red" });
    setSelection(model, ["B1:C2"]);
    copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "B1")).toBe("b1");
    expect(getStyle(model, "B1")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "B2")).toBe("b2");
    expect(getCellContent(model, "C1")).toBe("b1");
    expect(getStyle(model, "C1")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "C2")).toBe("b2");
  });

  test("Copy a formula which lead to #REF", () => {
    const model = new Model();
    setCellContent(model, "B3", "=A1");
    copy(model, "B3");
    paste(model, "B2");
    expect(getCellContent(model, "B2", "#BAD_EXPR"));
    expect(getCellError(model, "B2")).toEqual("Invalid reference");
  });

  test("Can cut & paste a formula", () => {
    const model = new Model();
    setCellContent(model, "A1", "=1");
    cut(model, "A1");
    paste(model, "B1");
    expect(getCellContent(model, "A1")).toBe("");
    expect(getCellText(model, "B1")).toBe("=1");
  });

  test("Cut & paste a formula update offsets only if the range is in the zone", () => {
    const model = new Model();
    setCellContent(model, "B1", "2");
    setCellContent(model, "B2", "=B1");
    setCellContent(model, "B3", "=B2");
    cut(model, "B2:B3");
    paste(model, "C2");
    expect(getCellText(model, "C2")).toBe("=B1");
    expect(getCellText(model, "C3")).toBe("=C2");
  });

  test("can paste multiple cells from os to outside of sheet", () => {
    const model = new Model();
    createSheet(model, { activate: true, sheetId: "2", rows: 2, cols: 2 });
    pasteFromOSClipboard(model, "B2", "A\nque\tcoucou\nBOB");
    expect(getCellContent(model, "B2")).toBe("A");
    expect(getCellContent(model, "B3")).toBe("que");
    expect(getCellContent(model, "C3")).toBe("coucou");
    expect(getCellContent(model, "B4")).toBe("BOB");

    createSheet(model, {
      activate: true,
      sheetId: "3",
      rows: 2,
      cols: 2,
    });
    pasteFromOSClipboard(model, "B2", "A\nque\tcoucou\tPatrick");
    expect(getCellContent(model, "B2")).toBe("A");
    expect(getCellContent(model, "B3")).toBe("que");
    expect(getCellContent(model, "C3")).toBe("coucou");
    expect(getCellContent(model, "D3")).toBe("Patrick");
  });

  test("Can paste localized formula from the OS", () => {
    const model = new Model();
    updateLocale(model, {
      ...DEFAULT_LOCALE,
      decimalSeparator: ",",
      formulaArgSeparator: ";",
      thousandsSeparator: " ",
    });
    pasteFromOSClipboard(model, "A1", "=SUM(5 ; 3,14)");
    expect(getCell(model, "A1")?.content).toBe("=SUM(5 , 3.14)");
    expect(getEvaluatedCell(model, "A1").value).toBe(8.14);
  });

  test("Can copy parts of the spread values", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");
    setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
    copy(model, "C1:D1");
    paste(model, "C2");
    expect(getEvaluatedCell(model, "C2").value).toBe(2);
    expect(getEvaluatedCell(model, "D2").value).toBe(3);
  });

  test("Cutting parts of the spread values will make a copy of the values", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    setCellContent(model, "A3", "3");
    setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
    cut(model, "C1:D1");
    paste(model, "C2");
    expect(getEvaluatedCell(model, "B1").value).toBe(1);
    expect(getEvaluatedCell(model, "C1").value).toBe(2);
    expect(getEvaluatedCell(model, "C2").value).toBe(2);
    expect(getEvaluatedCell(model, "D1").value).toBe(3);
    expect(getEvaluatedCell(model, "D2").value).toBe(3);
  });

  test("can copy and paste format only from spread value", () => {
    const model = new Model();

    // formula without format
    setCellContent(model, "A1", "=SUM(1+2)");

    // formula with format set on it
    setCellContent(model, "A2", "=SUM(1+2)");
    setCellFormat(model, "A2", "0%");

    // formula that return value with format
    setCellContent(model, "A3", "=DATE(2042,1,1)");

    // formula that return value with format and other format seted on it
    setCellContent(model, "A4", "=DATE(2042,1,1)");
    setCellFormat(model, "A4", "0%");

    // formula that return value with format inferred from reference
    setCellContent(model, "A5", "3");
    setCellFormat(model, "A5", "0%");
    setCellContent(model, "A6", "=SUM(1+A5)");

    // formula that return value with format inferred from reference and other format seted on it
    setCellContent(model, "A7", "3");
    setCellFormat(model, "A7", "0%");
    setCellContent(model, "A8", "=SUM(1+A7)");
    setCellFormat(model, "A8", "#,##0[$$]");

    setCellContent(model, "B1", "=TRANSPOSE(A1:A8)");

    for (const cell of ["C2", "D2", "E2", "F2", "G2", "H2", "I2"]) {
      setCellContent(model, cell, "42");
    }

    copy(model, "C1:I1");
    paste(model, "C2", "onlyFormat");

    expect(getCellContent(model, "C2")).toBe("4200%");
    expect(getCellContent(model, "D2")).toBe("2/10/1900");
    expect(getCellContent(model, "E2")).toBe("4200%");
    expect(getCellContent(model, "F2")).toBe("4200%");
    expect(getCellContent(model, "G2")).toBe("4200%");
    expect(getCellContent(model, "H2")).toBe("4200%");
    expect(getCellContent(model, "I2")).toBe("42$");
  });

  describe("add col/row can invalidate the clipboard of cut", () => {
    test("adding a column before a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");

      cut(model, "A1:B1");
      addColumns(model, "before", "A", 1);
      paste(model, "A2");
      expect(getCellContent(model, "B1")).toBe("1");
      expect(getCellContent(model, "C1")).toBe("2");
      expect(getCellContent(model, "A2")).toBe("");
      expect(getCellContent(model, "B2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
    });

    test("adding a column after a cut zone is not invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");

      cut(model, "A1:B1");
      addColumns(model, "after", "B", 1);
      paste(model, "A2");
      expect(getCellContent(model, "A1")).toBe("");
      expect(getCellContent(model, "B1")).toBe("");
      expect(getCellContent(model, "A2")).toBe("1");
      expect(getCellContent(model, "B2")).toBe("2");
    });

    test("adding a column inside a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");

      cut(model, "A1:B1");
      addColumns(model, "after", "A", 1);
      paste(model, "A2");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "C1")).toBe("2");
      expect(getCellContent(model, "A2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
    });

    test("adding multipe columns inside a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");

      cut(model, "A1:B1");
      addColumns(model, "after", "A", 5);
      paste(model, "A2");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "G1")).toBe("2");
      expect(getCellContent(model, "A2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
    });

    test("adding a row before a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");

      cut(model, "A1:A2");
      addRows(model, "before", 0, 1);
      paste(model, "C1");
      expect(getCellContent(model, "A2")).toBe("1");
      expect(getCellContent(model, "A3")).toBe("2");
      expect(getCellContent(model, "C1")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
      expect(getCellContent(model, "C3")).toBe("");
    });

    test("adding a row after a cut zone is not invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");

      cut(model, "A1:A2");
      addRows(model, "after", 2, 1);
      paste(model, "C1");
      expect(getCellContent(model, "A1")).toBe("");
      expect(getCellContent(model, "A2")).toBe("");
      expect(getCellContent(model, "C1")).toBe("1");
      expect(getCellContent(model, "C2")).toBe("2");
    });

    test("adding a row inside a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");

      cut(model, "A1:A2");
      addRows(model, "after", 0, 1);
      paste(model, "C1");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "A3")).toBe("2");
      expect(getCellContent(model, "C1")).toBe("");
      expect(getCellContent(model, "C3")).toBe("");
    });

    test("adding multiple rows inside a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");

      cut(model, "A1:A2");
      addRows(model, "after", 0, 5);
      paste(model, "C1");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "A7")).toBe("2");
      expect(getCellContent(model, "C1")).toBe("");
      expect(getCellContent(model, "C3")).toBe("");
    });

    test("Adding rows in another sheet does not invalidate the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      cut(model, "A1:A2");

      createSheet(model, { activate: true });
      addRows(model, "after", 0, 5);

      paste(model, "A1");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "A2")).toBe("2");
    });
  });

  describe("remove col/row can invalidate the clipboard of cut", () => {
    test("removing a column before a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "B2", "1");
      setCellContent(model, "C2", "2");

      cut(model, "B2:C2");
      deleteColumns(model, ["A"]);
      paste(model, "D1");
      expect(getCellContent(model, "A2")).toBe("1");
      expect(getCellContent(model, "B2")).toBe("2");
      expect(getCellContent(model, "D1")).toBe("");
      expect(getCellContent(model, "E1")).toBe("");
    });

    test("removing a column after a cut zone is not invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "B2", "1");
      setCellContent(model, "C2", "2");

      cut(model, "B2:C2");
      deleteColumns(model, ["D"]);
      paste(model, "D1");
      expect(getCellContent(model, "B2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
      expect(getCellContent(model, "D1")).toBe("1");
      expect(getCellContent(model, "E1")).toBe("2");
    });

    test("removing a column inside a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "B2", "1");
      setCellContent(model, "C2", "2");

      cut(model, "B2:C2");
      deleteColumns(model, ["C"]);
      paste(model, "D1");
      expect(getCellContent(model, "B2")).toBe("1");
      expect(getCellContent(model, "D1")).toBe("");
    });

    test("removing a row before a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "B2", "1");
      setCellContent(model, "C2", "2");

      cut(model, "B2:C2");
      deleteRows(model, [0]);
      paste(model, "D1");
      expect(getCellContent(model, "B1")).toBe("1");
      expect(getCellContent(model, "C1")).toBe("2");
      expect(getCellContent(model, "D1")).toBe("");
      expect(getCellContent(model, "E1")).toBe("");
    });

    test("removing a row after a cut zone is not invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "B2", "1");
      setCellContent(model, "C2", "2");

      cut(model, "B2:C2");
      deleteRows(model, [3]);
      paste(model, "D1");
      expect(getCellContent(model, "B2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
      expect(getCellContent(model, "D1")).toBe("1");
      expect(getCellContent(model, "E1")).toBe("2");
    });

    test("removing a row inside a cut zone is invalidating the clipboard", () => {
      const model = new Model();
      setCellContent(model, "B2", "1");
      setCellContent(model, "B3", "2");

      cut(model, "B2:B3");
      deleteRows(model, [2]);
      paste(model, "D1");
      expect(getCellContent(model, "B2")).toBe("1");
      expect(getCellContent(model, "D1")).toBe("");
    });

    test("Removing rows in another sheet does not invalidate the clipboard", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      cut(model, "A1:A2");

      createSheet(model, { activate: true });
      deleteRows(model, [1]);

      paste(model, "A1");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "A2")).toBe("2");
    });
  });
});

test("Can use clipboard handlers to paste in a sheet other than the active sheet", () => {
  model = new Model();
  const sheetId = model.getters.getActiveSheetId();
  createSheet(model, { sheetId: "sh2" });

  setCellContent(model, "A1", "1");
  const cf = createEqualCF("1", { fillColor: "#FF0000" }, "1");
  model.dispatch("ADD_CONDITIONAL_FORMAT", { cf, ranges: toRangesData(sheetId, "A1"), sheetId });
  createTable(model, "A1");

  const handlers = clipboardHandlersRegistries.cellHandlers
    .getAll()
    .map((handler) => new handler(model.getters, model.dispatch));

  let copiedData = {};
  const clipboardData = getClipboardDataPositions(sheetId, [toZone("A1")]);
  for (const handler of handlers) {
    copiedData = { ...copiedData, ...handler.copy(clipboardData) };
  }

  const pasteTarget: ClipboardPasteTarget = { sheetId: "sh2", zones: target("A1") };
  for (const handler of handlers) {
    handler.paste(pasteTarget, copiedData, { isCutOperation: false });
  }

  expect(getCellContent(model, "A1", "sh2")).toBe("1");
  expect(model.getters.getConditionalFormats(sheetId)).toMatchObject([
    { ranges: ["A1"], rule: cf.rule },
  ]);
  expect(model.getters.getTables(sheetId)).toMatchObject([{ range: { zone: toZone("A1") } }]);
});
