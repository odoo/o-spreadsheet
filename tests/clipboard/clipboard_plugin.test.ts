import { DEFAULT_BORDER_DESC, LINK_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import {
  getClipboardDataPositions,
  getOSheetClipboardIdFromHTML,
  parseOSClipboardContent,
} from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { urlRepresentation } from "@odoo/o-spreadsheet-engine/helpers/links";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { featurePluginRegistry } from "@odoo/o-spreadsheet-engine/plugins";
import {
  ClipboardPlugin,
  MAX_FILE_SIZE,
} from "@odoo/o-spreadsheet-engine/plugins/ui_stateful/clipboard";
import { clipboardHandlersRegistries } from "@odoo/o-spreadsheet-engine/registries/clipboardHandlersRegistries";
import { XMLString } from "@odoo/o-spreadsheet-engine/types/xlsx";
import { parseXML, xmlEscape } from "@odoo/o-spreadsheet-engine/xlsx/helpers/xml_helpers";
import { UIPlugin } from "../../src";
import { markdownLink, toCartesian, toZone, zoneToXc } from "../../src/helpers";
import {
  ClipboardMIMEType,
  ClipboardPasteTarget,
  Command,
  CommandResult,
  DEFAULT_LOCALE,
  DEFAULT_LOCALES,
} from "../../src/types/index";
import { FileStore as MockFileStore } from "../__mocks__/mock_file_store";
import { MockClipboardData } from "../test_helpers/clipboard";
import {
  activateSheet,
  addCellToSelection,
  addColumns,
  addEqualCf,
  addRows,
  cleanClipBoardHighlight,
  copy,
  copyPasteAboveCells,
  copyPasteCellsOnLeft,
  copyPasteCellsOnZone,
  createDynamicTable,
  createImage,
  createSheet,
  createSheetWithName,
  createTable,
  createTableWithFilter,
  cut,
  deleteCells,
  deleteColumns,
  deleteRows,
  deleteSheet,
  hideColumns,
  hideRows,
  insertCells,
  merge,
  paste,
  pasteFromOSClipboard,
  removeCF,
  selectCell,
  selectFigure,
  setAnchorCorner,
  setCellContent,
  setCellFormat,
  setFormat,
  setFormatting,
  setFormulaVisibility,
  setSelection,
  setViewportOffset,
  setZoneBorders,
  undo,
  unMerge,
  updateFilter,
  updateLocale,
} from "../test_helpers/commands_helpers";
import {
  getBorder,
  getCell,
  getCellContent,
  getCellError,
  getCellRawContent,
  getCellText,
  getClipboardVisibleZones,
  getEvaluatedCell,
  getEvaluatedGrid,
  getStyle,
} from "../test_helpers/getters_helpers";
import {
  addTestPlugin,
  createModel,
  createModelFromGrid,
  getGrid,
  getPlugin,
  target,
} from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

let model: Model;

describe("clipboard", () => {
  test("can copy and paste a cell", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");

    expect(getCell(model, "B2")).toMatchObject({
      content: "b2",
    });

    await copy(model, "B2");
    await paste(model, "D2");
    expect(getCell(model, "B2")).toMatchObject({
      content: "b2",
    });
    expect(getCell(model, "D2")).toMatchObject({
      content: "b2",
    });
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can cut and paste a cell", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    expect(getCell(model, "B2")).toMatchObject({
      content: "b2",
    });

    await cut(model, "B2");
    expect(getCell(model, "B2")).toMatchObject({
      content: "b2",
    });
    expect(model.getters.isCutOperation()).toBe(true);
    await paste(model, "D2");
    expect(model.getters.isCutOperation()).toBe(false);

    expect(getCell(model, "B2")).toBeUndefined();
    expect(getCell(model, "D2")).toMatchObject({
      content: "b2",
    });

    expect(getClipboardVisibleZones(model).length).toBe(0);

    // select D3 and paste. it should do nothing
    await paste(model, "D3");

    expect(getCell(model, "D3")).toBeUndefined();
  });

  test("can clean the clipboard visible zones (copy)", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await copy(model, "B2");
    expect(getClipboardVisibleZones(model).length).toBe(1);
    await cleanClipBoardHighlight(model);
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can clean the clipboard visible zones (cut)", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await cut(model, "B2");
    expect(getClipboardVisibleZones(model).length).toBe(1);
    await cleanClipBoardHighlight(model);
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("cut command will cut the selection if no target were given", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setSelection(model, ["B2"]);
    await cut(model);
    await paste(model, "D2");
    expect(getCellRawContent(model, "D2")).toBe("b2");
  });

  test("paste without copied value", async () => {
    const model = await createModel();
    const result = await paste(model, "D2");
    expect(result).toBeCancelledBecause(CommandResult.EmptyClipboard);
  });

  test("can cut and paste a cell in different sheets", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "a1");
    await cut(model, "A1");
    const to = model.getters.getActiveSheetId();
    await createSheet(model, { sheetId: "42", activate: true });
    await setCellContent(model, "A1", "a1Sheet2");
    await paste(model, "B2");
    expect(getCell(model, "A1")).toMatchObject({
      content: "a1Sheet2",
    });
    expect(getCell(model, "B2")).toMatchObject({
      content: "a1",
    });
    await activateSheet(model, to);
    expect(model.getters.getEvaluatedCells(to)).toEqual([]);

    expect(getClipboardVisibleZones(model).length).toBe(0);

    // select D3 and paste. it should do nothing
    await paste(model, "D3");

    expect(getCell(model, "D3")).toBeUndefined();
  });

  test("can cut and paste a zone inside the cut zone", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "a1");
    await setCellContent(model, "A2", "a2");

    await cut(model, "A1:A2");
    expect(getGrid(model)).toEqual({ A1: "a1", A2: "a2" });

    await paste(model, "A2");
    expect(getGrid(model)).toEqual({ A2: "a1", A3: "a2" });
  });

  test("can copy a cell with style", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setFormatting(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    await copy(model, "B2");
    await paste(model, "C2");

    expect(getCell(model, "B2")!.style).toEqual({ bold: true });
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("copying external content & paste-format on a cell will not paste content", async () => {
    const model = await createModel();
    const clipboardData = new MockClipboardData();
    clipboardData.setData(ClipboardMIMEType.PlainText, "Excalibur");

    const content = clipboardData.getData(ClipboardMIMEType.PlainText);
    await pasteFromOSClipboard(model, "C2", { text: content });
    expect(getCellContent(model, "C2")).toBe(content);
    await pasteFromOSClipboard(model, "C3", { text: content }, "onlyFormat");
    expect(getCellContent(model, "C3")).toBe("");
  });

  test("cannot paste multiple times after cut", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setFormatting(model, "B2", { bold: true });

    await cut(model, "B2");
    await paste(model, "C2");
    expect(getCellContent(model, "C2")).toBe("b2");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });

    await paste(model, "E5");
    expect(getCell(model, "E5")).toBe(undefined);
  });

  test("Cut clipboard should be invalidated when sheet is deleted", async () => {
    const model = await createModel();
    const sheet1Id = model.getters.getActiveSheetId();
    const sheet2Id = "sheet2";
    await createSheet(model, { sheetId: sheet2Id });

    await setCellContent(model, "A1", "Apple", sheet1Id);
    await setFormatting(model, "A1", { bold: true });
    await cut(model, "A1");

    await activateSheet(model, sheet2Id);
    await deleteSheet(model, sheet1Id);
    await paste(model, "A2");
    expect(getCell(model, "A2", sheet2Id)).toBe(undefined);
  });

  test("can paste even if sheet containing copy zone has been deleted", async () => {
    const model = await createModel();
    const sheet1Id = model.getters.getActiveSheetId();
    const sheet2Id = "sheet2";
    await createSheet(model, { sheetId: sheet2Id });

    await setCellContent(model, "A1", "Apple", sheet1Id);
    await setFormatting(model, "A1", { bold: true });
    await copy(model, "A1");

    await activateSheet(model, sheet2Id);
    await deleteSheet(model, sheet1Id);
    await paste(model, "A2");
    expect(getCellContent(model, "A2", sheet2Id)).toBe("Apple");
    expect(getCell(model, "A2", sheet2Id)!.style).toEqual({ bold: true });
  });

  test("can copy into a cell with style", async () => {
    const model = await createModel();
    // set value and style in B2
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await setFormatting(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    // set value in A1, select and copy it
    await setCellContent(model, "A1", "a1");
    await selectCell(model, "A1");
    await copy(model, "A1");

    // select B2 again and paste
    await paste(model, "B2");

    expect(getEvaluatedCell(model, "B2").value).toBe("a1");
    expect(getCell(model, "B2")!.style).not.toBeDefined();
  });

  test("can copy from an empty cell into a cell with style", async () => {
    const model = await createModel();
    // set value and style in B2
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await setFormatting(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    // set value in A1, select and copy it
    await selectCell(model, "A1");
    await copy(model, "A1");

    await paste(model, "B2");

    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("can copy a cell with borders", async () => {
    const model = await createModel();
    await selectCell(model, "B2");
    await setZoneBorders(model, { position: "bottom" });
    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });

    await copy(model, "B2");
    await paste(model, "C2");

    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C2")).toEqual({ bottom: DEFAULT_BORDER_DESC });
  });

  test("paste cell does not overwrite existing borders", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    await setZoneBorders(model, { position: "all" }, ["A1"]);
    await copy(model, "B2");
    await paste(model, "A1");
    expect(model.getters.getCellBorder({ sheetId, col: 0, row: 0 })).toEqual({
      top: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      left: DEFAULT_BORDER_DESC,
      right: DEFAULT_BORDER_DESC,
    });
  });

  test("can copy a cell with a format", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "0.451");
    await selectCell(model, "B2");
    await setFormat(model, "B2", "0.00%");
    expect(getCellContent(model, "B2")).toBe("45.10%");

    await copy(model, "B2");
    await paste(model, "C2");

    expect(getCellContent(model, "C2")).toBe("45.10%");
  });

  test("can copy and paste merged content", async () => {
    const model = await createModel({
      sheets: [{ id: "s1", colNumber: 5, rowNumber: 5, merges: ["B1:C2"] }],
    });
    await copy(model, "B1");
    await paste(model, "B4");
    expect(model.getters.getMerges("s1")).toMatchObject([toZone("B1:C2"), toZone("B4:C5")]);
  });

  test("can cut and paste merged content", async () => {
    const model = await createModel({
      sheets: [{ id: "s2", colNumber: 5, rowNumber: 5, merges: ["B1:C2"] }],
    });
    await cut(model, "B1:C2");
    await paste(model, "B4");
    expect(model.getters.getMerges("s2")).toHaveLength(1);
    expect(model.getters.getMerges("s2")).toMatchObject([toZone("B4:C5")]);
  });

  test("can cut and paste merged content in another sheet", async () => {
    const model = await createModel({
      sheets: [{ id: "s1", colNumber: 5, rowNumber: 5, merges: ["B1:C2"] }, { id: "s2" }],
    });
    await cut(model, "B1:C2");
    await activateSheet(model, "s2");
    await paste(model, "B4");
    expect(model.getters.getMerges("s1")).toEqual([]);
    expect(model.getters.getMerges("s2")).toMatchObject([toZone("B4:C5")]);
  });

  test("Pasting merge on content will remove the content", async () => {
    const model = await createModel({
      sheets: [
        {
          id: "s1",
          colNumber: 5,
          rowNumber: 5,
          cells: { A1: "merge", C1: "a", D2: "a" },
          merges: ["A1:B2"],
        },
      ],
    });
    await copy(model, "A1");
    await paste(model, "C1");
    expect(model.getters.isInMerge({ sheetId: "s1", ...toCartesian("C1") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: "s1", ...toCartesian("D2") })).toBe(true);
    expect(getCellContent(model, "C1")).toBe("merge");
    expect(getCellContent(model, "D2")).toBe("");
  });

  test("copy/paste a merge from one page to another", async () => {
    const model = await createModel({
      sheets: [
        { id: "s1", colNumber: 5, rowNumber: 5, merges: ["B2:C3"] },
        { id: "s2", colNumber: 5, rowNumber: 5 },
      ],
    });
    const sheet2 = "s2";
    await copy(model, "B2");
    await activateSheet(model, sheet2);
    await paste(model, "A1");
    expect(model.getters.isInMerge({ sheetId: sheet2, ...toCartesian("A1") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: sheet2, ...toCartesian("A2") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: sheet2, ...toCartesian("B1") })).toBe(true);
    expect(model.getters.isInMerge({ sheetId: sheet2, ...toCartesian("B2") })).toBe(true);
  });

  test("copy/paste a formula that has no sheet specific reference to another", async () => {
    const model = await createModel({
      sheets: [
        { id: "s1", colNumber: 5, rowNumber: 5, cells: { A1: "=A2" } },
        { id: "s2", colNumber: 5, rowNumber: 5 },
      ],
    });

    expect(getCellText(model, "A1", "s1")).toBe("=A2");

    await copy(model, "A1");
    await activateSheet(model, "s2");
    await paste(model, "A1");

    expect(getCellText(model, "A1", "s1")).toBe("=A2");
    expect(getCellText(model, "A1", "s2")).toBe("=A2");
  });

  test("Pasting content that will destroy a merge will fail", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    await merge(model, "B2:C3");
    await copy(model, "B2");
    const result = await paste(model, "A1");
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
    expect(model.getters.getMerges(sheetId).map(zoneToXc)).toEqual(["B2:C3"]);
  });

  test("Can paste a single cell on a merge", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "thingies");
    await merge(model, "B1:B2");
    await copy(model, "A1");
    await paste(model, "B1:B2");
    expect(getCellContent(model, "B1")).toEqual("thingies");
  });

  test("copy zones with multiple compatible merges => paste => it should paste with all merges", async () => {
    const model = await createModel({
      sheets: [{ id: "s1", merges: ["A1:A3", "C1:C3"] }],
    });
    await copy(model, "A1:C3");
    await paste(model, "E1");
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getMerges(sheetId).map(zoneToXc)).toEqual([
      "A1:A3",
      "C1:C3",
      "E1:E3",
      "G1:G3",
    ]);
  });

  test("copy zones with multiple compatible merges with CTRL+CLICK => paste => it should paste with all merges", async () => {
    const model = await createModel({
      sheets: [{ id: "s1", merges: ["A1:A3", "C1:C3"] }],
    });
    await copy(model, "A1", "C1");
    await paste(model, "E1");
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getMerges(sheetId).map(zoneToXc)).toEqual([
      "A1:A3",
      "C1:C3",
      "E1:E3",
      "F1:F3",
    ]);
  });

  test("copy zones with one merge => unmerge origin cell => paste => it should paste with original merge", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();

    await merge(model, "A1:C3");
    await copy(model, "A1");

    await unMerge(model, "A1:C3");
    await paste(model, "E1");

    expect(model.getters.getMerges(sheetId).map(zoneToXc)).toEqual(["E1:G3"]);
  });

  test("copy zones with multiple compatible merges => unmerge origin zones => paste => it should paste with all merges", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();

    await merge(model, "A1:A3");
    await merge(model, "C1:C3");
    await copy(model, "A1:C3");

    await unMerge(model, "A1:A3");
    await unMerge(model, "C1:C3");
    await paste(model, "E1");

    expect(model.getters.getMerges(sheetId).map(zoneToXc)).toEqual(["E1:E3", "G1:G3"]);
  });

  test("copy zones with multiple compatible merges => delete origin sheet => paste => it should paste with all merges", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();

    await merge(model, "A1:A3");
    await merge(model, "C1:C3");
    await copy(model, "A1:C3");

    const newSheetId = "Sheet2";
    await createSheet(model, { sheetId: newSheetId });
    await activateSheet(model, newSheetId);
    await deleteSheet(model, sheetId);

    await paste(model, "E1");

    expect(model.getters.getMerges(newSheetId).map(zoneToXc)).toEqual(["E1:E3", "G1:G3"]);
  });

  test("cutting a cell with style remove the cell", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await setFormatting(model, "B2", { bold: true });
    await cut(model, "B2");
    await paste(model, "C2");

    expect(getCell(model, "C2")).toMatchObject({
      style: { bold: true },
      content: "b2",
    });
    expect(getCell(model, "B2")).toBeUndefined();
  });

  test("Clipboard text content export formatted string", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "abc");
    await selectCell(model, "B2");
    await copy(model, "B2");
    expect(model.getters.getClipboardTextContent()).toBe("abc");

    await setCellContent(model, "B2", "= 1 + 2");
    await selectCell(model, "B2");
    await copy(model, "B2");
    expect(model.getters.getClipboardTextContent()).toBe("3");
  });

  describe("Copied cells HTML", () => {
    let model: Model;
    beforeEach(async () => {
      model = await createModel();
    });

    test("Copied HTML table snapshot", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "B1", "2");
      await setCellContent(model, "A2", "3");
      await copy(model, "A1:B2");
      const osClipboardContent = await model.getters.getClipboardTextAndImageContent();
      const htmlContent = osClipboardContent[ClipboardMIMEType.Html]!;
      const cbPlugin = getPlugin(model, ClipboardPlugin);
      const clipboardId = model.getters.getClipboardId();
      const clipboardData = JSON.stringify(cbPlugin["getSheetData"]());
      const expectedHtmlContent = `<div data-osheet-clipboard-id='${clipboardId}' data-osheet-clipboard='${xmlEscape(
        clipboardData
      )}'><table border="1" style="border-collapse:collapse"><tr><td style="">1</td><td style="">2</td></tr><tr><td style="">3</td><td style=""></td></tr></table></div>`;
      expect(htmlContent).toBe(expectedHtmlContent);
    });

    test("Copied group of cells are represented as a valid HTML table in the clipboard", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "B1", "2");
      await setCellContent(model, "A2", "3");
      await copy(model, "A1:B2");
      const osClipboardContent = await model.getters.getClipboardTextAndImageContent();
      const htmlContent = osClipboardContent[ClipboardMIMEType.Html]!;
      const parsedHTML = parseXML(new XMLString(htmlContent), "text/html");

      expect(parsedHTML.body.firstElementChild?.tagName).toBe("DIV");
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
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "3");
      await copy(model, "A1:A2");
      const osClipboardContent = await model.getters.getClipboardTextAndImageContent();
      const htmlContent = osClipboardContent[ClipboardMIMEType.Html]!;

      expect(htmlContent).toContain('style="border-collapse:collapse"');
      expect(htmlContent).toContain('border="1"');
    });

    test("Copied cells have their style in the HTML", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "3");
      await setFormatting(model, "A1", { bold: true });
      await addEqualCf(model, "A1", { fillColor: "#123456" }, "1");
      await copy(model, "A1:A2");
      const osClipboardContent = await model.getters.getClipboardTextAndImageContent();
      const htmlContent = osClipboardContent[ClipboardMIMEType.Html]!;
      const firstCellStyle = htmlContent
        .replace(/\n/g, "")
        .match(/<td style="(.*?)">.*?<\/td>/)![1];

      expect(firstCellStyle).toContain("font-weight:bold;");
      expect(firstCellStyle).toContain("background:#123456;");
    });

    test("Copied cells have their content escaped", async () => {
      const cellContent = "<div>1</div>";
      await setCellContent(model, "A1", cellContent);
      await setCellContent(model, "A2", "3");
      await copy(model, "A1:A2");
      const osClipboardContent = await model.getters.getClipboardTextAndImageContent();
      const htmlContent = osClipboardContent[ClipboardMIMEType.Html]!;

      expect(htmlContent).toContain(xmlEscape(cellContent));
    });

    test("Copied single cells are not in a html table", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await copy(model, "A1");
      const cbPlugin = getPlugin(model, ClipboardPlugin);
      const clipboardId = model.getters.getClipboardId();
      const clipboardData = JSON.stringify(cbPlugin["getSheetData"]());
      const osClipboardContent = await model.getters.getClipboardTextAndImageContent();
      expect(osClipboardContent[ClipboardMIMEType.Html]).toBe(
        `<div data-osheet-clipboard-id='${clipboardId}' data-osheet-clipboard='${xmlEscape(
          clipboardData
        )}'>1</div>`
      );
    });
  });

  test("can copy a rectangular selection", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setCellContent(model, "B3", "b3");
    await setCellContent(model, "C2", "c2");
    await setCellContent(model, "C3", "c3");

    await copy(model, "B2:C3");

    expect(getCell(model, "D1")).toBeUndefined();
    expect(getCell(model, "D2")).toBeUndefined();
    expect(getCell(model, "E1")).toBeUndefined();
    expect(getCell(model, "E2")).toBeUndefined();

    await paste(model, "D1");

    expect(getCellContent(model, "D1")).toBe("b2");
    expect(getCellContent(model, "D2")).toBe("b3");
    expect(getCellContent(model, "E1")).toBe("c2");
    expect(getCellContent(model, "E2")).toBe("c3");
  });

  test("empty clipboard: getClipboardTextAndImageContent returns a tab", async () => {
    const model = await createModel();
    expect(model.getters.getClipboardTextContent()).toBe("\t");
  });

  test("Clipboard Text exports multiple cells", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setCellContent(model, "B3", "b3");
    await setCellContent(model, "C2", "c2");
    await setCellContent(model, "C3", "c3");
    await copy(model, "B2:C3");
    expect(model.getters.getClipboardTextContent()).toBe("b2\tc2\nb3\tc3");
  });

  test("can paste multiple cells from os clipboard", async () => {
    const model = await createModel();
    await pasteFromOSClipboard(model, "C1", { text: "a\t1\nb\t2" });

    expect(getCellContent(model, "C1")).toBe("a");
    expect(getCellContent(model, "C2")).toBe("b");
    expect(getCellContent(model, "D1")).toBe("1");
    expect(getCellContent(model, "D2")).toBe("2");
  });

  test("Pasting content from os that will destroy a merge will fail", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    await merge(model, "B2:C3");
    const result = await pasteFromOSClipboard(model, "B2", {
      text: "a\t1\nb\t2",
    });
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
    expect(model.getters.getMerges(sheetId).map(zoneToXc)).toEqual(["B2:C3"]);
  });

  test("pasting from OS will not change the viewport", async () => {
    const model = await createModel();
    const viewport = model.getters.getActiveMainViewport();
    await pasteFromOSClipboard(model, "C60", { text: "a\t1\nb\t2" });
    expect(model.getters.getActiveMainViewport()).toEqual(viewport);
  });

  test("pasting numbers from windows clipboard => interpreted as number", async () => {
    const model = await createModel();
    await pasteFromOSClipboard(model, "C1", { text: "1\r\n2\r\n3" });

    expect(getCellContent(model, "C1")).toBe("1");
    expect(getEvaluatedCell(model, "C1").value).toBe(1);
    expect(getCellContent(model, "C2")).toBe("2");
    expect(getEvaluatedCell(model, "C2").value).toBe(2);
    expect(getCellContent(model, "C3")).toBe("3");
    expect(getEvaluatedCell(model, "C3").value).toBe(3);
  });

  test("incompatible multiple selections: only last one is actually copied", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "a1");
    await setCellContent(model, "A2", "a2");
    await setCellContent(model, "C1", "c1");
    await copy(model, "A1:A2", "C1");

    expect(getClipboardVisibleZones(model).length).toBe(1);

    await selectCell(model, "E1");
    await paste(model, "E1");
    expect(getCellContent(model, "E1")).toBe("c1");
    expect(getCell(model, "E2")).toBeUndefined();
  });

  test("compatible multiple selections: each column is copied", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "a1");
    await setCellContent(model, "A2", "a2");
    await setCellContent(model, "C1", "c1");
    await setCellContent(model, "C2", "c2");
    await copy(model, "A1:A2", " C1:C2");

    expect(getClipboardVisibleZones(model).length).toBe(2);

    await paste(model, "E1");
    expect(getCellContent(model, "E1")).toBe("a1");
    expect(getCellContent(model, "E2")).toBe("a2");
    expect(getCellContent(model, "F1")).toBe("c1");
    expect(getCellContent(model, "F2")).toBe("c2");
  });

  test("Viewport won't move after pasting", async () => {
    const model = await createModel();
    await copy(model, "A1:B2");

    await setSelection(model, ["C60:D70"]);
    await setViewportOffset(model, 0, 0);
    const viewport = model.getters.getActiveMainViewport();

    await paste(model, "C60:D70");
    expect(model.getters.getActiveMainViewport()).toEqual(viewport);
  });

  describe("copy/paste a zone in a larger selection will duplicate the zone on the selection as long as it does not exceed it", () => {
    test("paste a value (zone with hight=1 and width=1)", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await copy(model, "A1");
      await paste(model, "C2:D3");
      expect(getCellContent(model, "C2")).toBe("1");
      expect(getCellContent(model, "C3")).toBe("1");
      expect(getCellContent(model, "D2")).toBe("1");
      expect(getCellContent(model, "D3")).toBe("1");
    });

    test("paste a zone with hight zone > 1", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "a1");
      await setCellContent(model, "A2", "a2");
      await copy(model, "A1:A2");
      await paste(model, "A3:A7");
      expect(getCellContent(model, "A3")).toBe("a1");
      expect(getCellContent(model, "A4")).toBe("a2");
      expect(getCellContent(model, "A5")).toBe("a1");
      expect(getCellContent(model, "A6")).toBe("a2");
      expect(getCellContent(model, "A7")).toBe("");
    });

    test("paste a zone with width zone > 1", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "a1");
      await setCellContent(model, "B1", "b1");
      await copy(model, "A1:B1");
      await paste(model, "C1:G1");
      expect(getCellContent(model, "C1")).toBe("a1");
      expect(getCellContent(model, "D1")).toBe("b1");
      expect(getCellContent(model, "E1")).toBe("a1");
      expect(getCellContent(model, "F1")).toBe("b1");
      expect(getCellContent(model, "G1")).toBe("");
    });

    test("selection is updated to contain exactly the new pasted zone", async () => {
      const model = await createModel();
      await copy(model, "A1:B2");

      // select C3:G7
      await selectCell(model, "C3");
      await setAnchorCorner(model, "G7");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 2, left: 2, bottom: 6, right: 6 });

      await paste(model, "C3:G7");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 2, left: 2, bottom: 5, right: 5 });
    });
  });

  describe("cut/paste a zone in a larger selection will paste the zone only once", () => {
    test("paste a value (zone with hight=1 and width=1)", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await cut(model, "A1");
      await paste(model, "C2:D3");
      expect(getCellContent(model, "C2")).toBe("1");
      expect(getCellContent(model, "C3")).toBe("");
      expect(getCellContent(model, "D2")).toBe("");
      expect(getCellContent(model, "D3")).toBe("");
    });

    test("with hight zone > 1", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "a1");
      await setCellContent(model, "A2", "a2");
      await cut(model, "A1:A2");
      await paste(model, "A3:A7");
      expect(getCellContent(model, "A3")).toBe("a1");
      expect(getCellContent(model, "A4")).toBe("a2");
      expect(getCellContent(model, "A5")).toBe("");
      expect(getCellContent(model, "A6")).toBe("");
      expect(getCellContent(model, "A7")).toBe("");
    });

    test("with width zone > 1", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "a1");
      await setCellContent(model, "B1", "b1");
      await cut(model, "A1:B1");
      await paste(model, "C1:G1");
      expect(getCellContent(model, "C1")).toBe("a1");
      expect(getCellContent(model, "D1")).toBe("b1");
      expect(getCellContent(model, "E1")).toBe("");
      expect(getCellContent(model, "F1")).toBe("");
      expect(getCellContent(model, "G1")).toBe("");
    });

    test("selection is updated to contain exactly the cut and pasted zone", async () => {
      const model = await createModel();
      await cut(model, "A1:B2");

      // select C3:G7
      await selectCell(model, "C3");
      await setAnchorCorner(model, "G7");

      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 2, left: 2, bottom: 6, right: 6 });

      await paste(model, "C3:G7");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 2, left: 2, bottom: 3, right: 3 });
    });
  });

  describe("copy/paste a zone in several selection will duplicate the zone on each selection", () => {
    test("paste a value (zone with hight=1 and width=1)", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "33");
      await copy(model, "A1");
      await paste(model, "C1, E1");
      expect(getCellContent(model, "C1")).toBe("33");
      expect(getCellContent(model, "E1")).toBe("33");
    });

    test("selection is updated to contain exactly the new pasted zones", async () => {
      const model = await createModel();
      await copy(model, "A1");

      // select C1 and E1
      await selectCell(model, "C1");
      await addCellToSelection(model, "E1");

      await paste(model, "C1, E1");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 0, right: 2 });
      expect(model.getters.getSelectedZones()[1]).toEqual({ top: 0, left: 4, bottom: 0, right: 4 });
    });

    test("paste a zone with more than one value is not allowed", async () => {
      const model = await createModel();
      await copy(model, "A1:B2");
      const result = await paste(model, "C1, E1");
      expect(result).toBeCancelledBecause(CommandResult.WrongPasteSelection);
    });
  });

  describe("cut/paste a zone in several selection will paste the zone only once", () => {
    test("paste a value (zone with hight=1 and width=1)", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "33");
      await cut(model, "A1");
      await paste(model, "E1, C1");
      expect(getCellContent(model, "E1")).toBe("33");
      expect(getCellContent(model, "C1")).toBe("");
    });

    test("selection is updated to contain exactly the new pasted zones", async () => {
      const model = await createModel();
      await cut(model, "A1");

      // select C1 and E1
      await selectCell(model, "C1");
      await addCellToSelection(model, "E1");

      await paste(model, "C1, E1");
      expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 2, bottom: 0, right: 2 });
      expect(model.getters.getSelectedZones().length).toBe(1);
    });

    test("paste a zone with more than one value is not allowed", async () => {
      const model = await createModel();
      await cut(model, "A1:B2");
      const result = await paste(model, "C1, E1");
      expect(result).toBeCancelledBecause(CommandResult.WrongPasteSelection);
    });
  });

  describe("cut/paste several zones", () => {
    test("cutting is not allowed if multiple selection", async () => {
      const model = await createModel();
      const result = await cut(model, "A1", "A2");
      expect(result).toBeCancelledBecause(CommandResult.WrongCutSelection);
    });
  });

  describe("copy/paste several zones", () => {
    beforeEach(async () => {
      model = await createModel();
      await setCellContent(model, "A1", "a1");
      await setCellContent(model, "A2", "a2");
      await setCellContent(model, "A3", "a3");
      await setCellContent(model, "B1", "b1");
      await setCellContent(model, "B2", "b2");
      await setCellContent(model, "B3", "b3");
      await setCellContent(model, "C1", "c1");
      await setCellContent(model, "C2", "c2");
      await setCellContent(model, "C3", "c3");
    });

    describe("if they have same left and same right", () => {
      test("copy all zones", async () => {
        await copy(model, "A1:B1", " A2:B2");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:B1"));
        expect(getClipboardVisibleZones(model)[1]).toEqual(toZone("A2:B2"));
        expect(getClipboardVisibleZones(model).length).toBe(2);
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
        expect(getCellContent(model, "G6")).toBe("b1");
        expect(getCellContent(model, "G7")).toBe("b2");
      });

      test("Copy cells only once", async () => {
        await copy(model, "A1:A3", "A1:A2", "A2:A3", "A1", "A2", "A3");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:A3"));
        expect(getClipboardVisibleZones(model).length).toBe(1);
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
        expect(getCellContent(model, "F8")).toBe("a3");
        expect(getCellContent(model, "F9")).toBe("");
      });

      test("paste zones without gap", async () => {
        // gap between 1st selection and 2nd selection is one row
        await copy(model, "A1:B1", "A3:B3");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:B1"));
        expect(getClipboardVisibleZones(model)[1]).toEqual(toZone("A3:B3"));
        expect(getClipboardVisibleZones(model).length).toBe(2);
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a3");
        expect(getCellContent(model, "G6")).toBe("b1");
        expect(getCellContent(model, "G7")).toBe("b3");
      });

      test("paste zones selected from different orders does not influence the final result", async () => {
        await copy(model, "A1", "A2");
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");

        await copy(model, "A2", "A1");
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
      });
    });

    describe("if zones have same top and same bottom", () => {
      test("copy all zones", async () => {
        await copy(model, "A1:A2", "B1:B2");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:A2"));
        expect(getClipboardVisibleZones(model)[1]).toEqual(toZone("B1:B2"));
        expect(getClipboardVisibleZones(model).length).toBe(2);
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
        expect(getCellContent(model, "G6")).toBe("b1");
        expect(getCellContent(model, "G7")).toBe("b2");
      });

      test("Copy cells only once", async () => {
        await copy(model, "A1:C1", "A1:B1", "B1:C1", "A1", "B1", "C1");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("A1:C1"));
        expect(getClipboardVisibleZones(model).length).toBe(1);
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "G6")).toBe("b1");
        expect(getCellContent(model, "H6")).toBe("c1");
        expect(getCellContent(model, "I6")).toBe("");
      });

      test("paste zones without gap", async () => {
        // gap between 1st selection and 2nd selection is one column
        await copy(model, "A1:A2", "C1:C2");
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "F7")).toBe("a2");
        expect(getCellContent(model, "G6")).toBe("c1");
        expect(getCellContent(model, "G7")).toBe("c2");
      });

      test("paste zones selected from different orders does not influence the final result", async () => {
        await copy(model, "A1", "B1");
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "G6")).toBe("b1");

        await copy(model, "A1", "B1");
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("a1");
        expect(getCellContent(model, "G6")).toBe("b1");
      });
    });

    describe("copy/paste the last zone if zones don't have [same top and same bottom] or [same left and same right]", () => {
      test("test with dissociated zones", async () => {
        await copy(model, "A1:A2", "B2:B3");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("B2:B3"));
        expect(getClipboardVisibleZones(model).length).toBe(1);
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("b2");
        expect(getCellContent(model, "F7")).toBe("b3");
      });

      test("test with overlapped zones", async () => {
        await copy(model, "A1:B2", "B2:B3");
        expect(getClipboardVisibleZones(model)[0]).toEqual(toZone("B2:B3"));
        expect(getClipboardVisibleZones(model).length).toBe(1);
        await paste(model, "F6");
        expect(getCellContent(model, "F6")).toBe("b2");
        expect(getCellContent(model, "F7")).toBe("b3");
      });
    });

    test("can paste zones in a larger selection", async () => {
      await copy(model, "A1", "C1");
      await paste(model, "E1:I1");
      expect(getCellContent(model, "E1")).toBe("a1");
      expect(getCellContent(model, "F1")).toBe("c1");
      expect(getCellContent(model, "G1")).toBe("a1");
      expect(getCellContent(model, "H1")).toBe("c1");
      expect(getCellContent(model, "I1")).toBe("");
    });

    test("is not allowed if paste in several selection", async () => {
      await copy(model, "A1", "C1");
      const result = await paste(model, "A2, B2");
      expect(result).toBeCancelledBecause(CommandResult.WrongPasteSelection);
    });
  });
  test("can copy and paste a cell with STRING content", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", '="test"');

    expect(getCellText(model, "B2")).toEqual('="test"');
    expect(getEvaluatedCell(model, "B2").value).toEqual("test");

    await copy(model, "B2");
    await paste(model, "D2");
    expect(getCellText(model, "B2")).toEqual('="test"');
    expect(getEvaluatedCell(model, "B2").value).toEqual("test");
    expect(getCellText(model, "D2")).toEqual('="test"');
    expect(getEvaluatedCell(model, "D2").value).toEqual("test");
    expect(getClipboardVisibleZones(model).length).toBe(0);
  });

  test("can undo a paste operation", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");

    await copy(model, "B2");
    await paste(model, "D2");
    expect(getCell(model, "D2")).toBeDefined();
    await undo(model);
    expect(getCell(model, "D2")).toBeUndefined();
  });

  test("can paste-format a cell with style", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await setFormatting(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    await copy(model, "B2");
    await paste(model, "C2", "onlyFormat");
    expect(getCellContent(model, "C2")).toBe("");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("can copy and paste format", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setFormatting(model, "B2", { bold: true });
    await selectCell(model, "B2");
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    await copy(model, "B2");
    await paste(model, "C2", "onlyFormat");
    expect(getCellContent(model, "C2")).toBe("");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("paste format does not remove content", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setCellContent(model, "C2", "c2");
    await setFormatting(model, "B2", { bold: true });
    await selectCell(model, "B2");
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    await copy(model, "B2");
    await paste(model, "C2", "onlyFormat");

    expect(getCellContent(model, "C2")).toBe("c2");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });
  });

  test("can undo a paste format", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setFormatting(model, "B2", { bold: true });
    await selectCell(model, "B2");
    await copy(model, "B2");
    await paste(model, "C2", "onlyFormat");

    expect(getCellContent(model, "C2")).toBe("");
    expect(getCell(model, "C2")!.style).toEqual({ bold: true });

    await undo(model);
    expect(getCell(model, "C2")).toBeUndefined();
  });

  test("can copy and paste as value", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await copy(model, "B2");
    await paste(model, "C2", "asValue");
    expect(getCellContent(model, "C2")).toBe("b2");
  });

  test("can copy a cell with a style and paste as value", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setFormatting(model, "B2", { bold: true });
    await selectCell(model, "B2");
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    await copy(model, "B2");
    await paste(model, "C2", "asValue");

    expect(getEvaluatedCell(model, "C2").value).toBe("b2");
    expect(getCell(model, "C2")!.style).not.toBeDefined();
  });

  test("can copy a cell with a border and paste as value", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await setZoneBorders(model, { position: "bottom" });
    expect(getBorder(model, "B2")).toEqual({ bottom: DEFAULT_BORDER_DESC });

    await copy(model, "B2");
    await paste(model, "C2", "asValue");

    expect(getEvaluatedCell(model, "C2").value).toBe("b2");
    expect(getBorder(model, "C2")).toBeNull();
  });

  test("can copy a cell with a conditional format and paste as value", async () => {
    const model = await createModel({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "C1", "1");
    await setCellContent(model, "C2", "2");
    const result = await addEqualCf(model, "A1,A2", { fillColor: "#FF0000" }, "1");
    expect(result).toBeSuccessfullyDispatched();
    await copy(model, "A1");
    await paste(model, "C1", "asValue");
    await copy(model, "A2");
    await paste(model, "C2", "asValue");
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2")).toEqual({});
    expect(getStyle(model, "C1")).toEqual({});
    expect(getStyle(model, "C2")).toEqual({});
  });

  test("paste as value does not remove style", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setCellContent(model, "C3", "c3");
    await selectCell(model, "C3");
    await setFormatting(model, "C3", { bold: true });
    expect(getCell(model, "C3")!.style).toEqual({ bold: true });

    await copy(model, "B2");
    await paste(model, "C3", "asValue");

    expect(getCellContent(model, "C3")).toBe("b2");
    expect(getCell(model, "C3")!.style).toEqual({ bold: true });
  });

  test("paste as value does not remove border", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await setCellContent(model, "C3", "c3");
    await setZoneBorders(model, { position: "bottom" }, ["C3"]);
    expect(getBorder(model, "C3")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C4")).toBeNull();
    await copy(model, "B2");
    await paste(model, "C3", "asValue");

    expect(getCellContent(model, "C3")).toBe("b2");
    expect(getBorder(model, "C3")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getBorder(model, "C4")).toBeNull();
  });

  test("paste as value does remove number format", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "0.451");
    await setFormat(model, "B2", "0.00%");
    expect(getCellContent(model, "B2")).toBe("45.10%");

    await setCellContent(model, "C3", "42");
    await setFormat(model, "C3", "#,##0.00");
    expect(getCellContent(model, "C3")).toBe("42.00");

    await copy(model, "B2");
    await paste(model, "C3", "asValue");
    expect(getCellContent(model, "C3")).toBe("0.45");
  });

  test("paste as value works with both no core format and empty string core format", async () => {
    const model = await createModel();
    await setCellContent(model, "D4", "=DATE(2024,6,5)");

    await copy(model, "D4");
    await paste(model, "E4", "asValue");
    expect(getCell(model, "E4")).toMatchObject({ content: "45448", format: undefined });

    await setFormat(model, "D4", ""); // An empty string format is equivalent to no format
    expect(getCellContent(model, "D4")).toBe("6/5/2024");

    await copy(model, "D4");
    await paste(model, "E5", "asValue");
    expect(getCell(model, "E5")).toMatchObject({ content: "45448", format: undefined });
  });

  test.each([
    ["1", "0.00%", "100.00%"],
    ["46023", "m/d/yyyy", "1/1/2026"],
  ])(
    "can copy a cell with a format and paste as value",
    async (originalContent, format, formatedContent) => {
      const model = await createModel();
      await setCellContent(model, "B2", originalContent);
      await setFormat(model, "B2", format);
      expect(getCellContent(model, "B2")).toBe(formatedContent);
      expect(getCell(model, "B2")!.format).toEqual(format);

      await copy(model, "B2");
      await paste(model, "C2", "asValue");

      expect(getCellContent(model, "C2")).toBe(originalContent);
      expect(getCell(model, "C2")!.format).not.toBeDefined();
    }
  );

  test("copy as value : the cell take the format of the target cell", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "46023");
    await setFormat(model, "B2", "0.00%");
    expect(getCellContent(model, "B2")).toBe("4602300.00%");
    expect(getCell(model, "B2")!.format).toEqual("0.00%");

    await setFormat(model, "C2", "m/d/yyyy");
    await copy(model, "B2");
    await paste(model, "C2", "asValue");

    expect(getCellContent(model, "C2")).toBe("1/1/2026");
    expect(getCell(model, "C2")!.format).toEqual("m/d/yyyy");
  });

  test("can copy a formula and paste as value", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "=SUM(1+2)");
    await setCellContent(model, "A2", "=EQ(42,42)");
    await setCellContent(model, "A3", '=CONCAT("Ki","kou")');
    await copy(model, "A1:A3");
    await paste(model, "B1", "asValue");
    expect(getCellContent(model, "B1")).toBe("3");
    expect(getCellContent(model, "B2")).toBe("TRUE");
    expect(getCellContent(model, "B3")).toBe("Kikou");
  });

  test("Can paste localized content as value", async () => {
    const model = await createModel();
    await updateLocale(model, DEFAULT_LOCALES[1]);
    await setCellContent(model, "A1", "5.4");
    await setCellContent(model, "A2", "=SUM(4.5)");
    await copy(model, "A1:A2");
    await paste(model, "B1", "asValue");
    expect(getCellRawContent(model, "B1")).toBe("5.4");
    expect(getCellRawContent(model, "B2")).toBe("4.5");
  });

  test("can copy a formula and paste -> apply the format defined by user, if not apply the automatic evaluated format ", async () => {
    const model = await createModel();

    // formula without format
    await setCellContent(model, "A1", "=SUM(1+2)");

    // formula with format seted on it
    await setCellContent(model, "A2", "=SUM(1+2)");
    await setCellFormat(model, "A2", "0%");

    // formula that return value with format
    await setCellContent(model, "A3", "=DATE(2042,1,1)");

    // formula that return value with format and other format seted on it
    await setCellContent(model, "A4", "=DATE(2042,1,1)");
    await setCellFormat(model, "A4", "0%");

    // formula that return value with format infered from reference
    await setCellContent(model, "A5", "3");
    await setCellFormat(model, "A5", "0%");
    await setCellContent(model, "A6", "=SUM(1+A5)");

    // formula that return value with format infered from reference and other format seted on it
    await setCellContent(model, "A7", "3");
    await setCellFormat(model, "A7", "0%");
    await setCellContent(model, "A8", "=SUM(1+A7)");
    await setCellFormat(model, "A8", "#,##0[$$]");

    await copy(model, "A1:A8");
    await paste(model, "B1");

    await setCellFormat(model, "B5", "#,##0[$$]");
    await setCellFormat(model, "B7", "0%");

    expect(getCellContent(model, "B1")).toBe("3");
    expect(getCellContent(model, "B2")).toBe("300%");
    expect(getCellContent(model, "B3")).toBe("1/1/2042");
    expect(getCellContent(model, "B4")).toBe("5186700%");
    expect(getCellContent(model, "B6")).toBe("4$");
    expect(getCellContent(model, "B8")).toBe("4$");
  });

  test("can copy a formula and paste format only --> apply the automatic evaluated format", async () => {
    const model = await createModel();

    // formula without format
    await setCellContent(model, "A1", "=SUM(1+2)");

    // formula with format seted on it
    await setCellContent(model, "A2", "=SUM(1+2)");
    await setCellFormat(model, "A2", "0%");

    // formula that return value with format
    await setCellContent(model, "A3", "=DATE(2042,1,1)");

    // formula that return value with format and other format seted on it
    await setCellContent(model, "A4", "=DATE(2042,1,1)");
    await setCellFormat(model, "A4", "0%");

    // formula that return value with format infered from reference
    await setCellContent(model, "A5", "3");
    await setCellFormat(model, "A5", "0%");
    await setCellContent(model, "A6", "=SUM(1+A5)");

    // formula that return value with format infered from reference and other format seted on it
    await setCellContent(model, "A7", "3");
    await setCellFormat(model, "A7", "0%");
    await setCellContent(model, "A8", "=SUM(1+A7)");
    await setCellFormat(model, "A8", "#,##0[$$]");

    await setCellContent(model, "B1", "42");
    await setCellContent(model, "B2", "42");
    await setCellContent(model, "B3", "42");
    await setCellContent(model, "B4", "42");
    await setCellContent(model, "B6", "42");
    await setCellContent(model, "B8", "42");

    await copy(model, "A1:A8");
    await paste(model, "B1", "onlyFormat");

    expect(getCellContent(model, "B1")).toBe("42");
    expect(getCellContent(model, "B2")).toBe("4200%");
    expect(getCellContent(model, "B3")).toBe("2/10/1900");
    expect(getCellContent(model, "B4")).toBe("4200%");
    expect(getCellContent(model, "B6")).toBe("4200%");
    expect(getCellContent(model, "B8")).toBe("42$");
  });

  test("can undo a paste as value", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await setFormatting(model, "B2", { bold: true });
    await copy(model, "B2");
    await paste(model, "C2", "asValue");

    expect(getCellContent(model, "C2")).toBe("b2");
    expect(getCell(model, "C2")!.style).not.toBeDefined();

    await undo(model);
    expect(getCell(model, "C2")).toBeUndefined();
  });

  test("cut and paste as value is not allowed", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await cut(model, "B2");
    const result = await paste(model, "C3", "asValue");
    expect(result).toBeCancelledBecause(CommandResult.WrongPasteOption);
  });

  test("cut and paste format only is not allowed", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await cut(model, "B2");
    const result = await paste(model, "C3", "onlyFormat");
    expect(result).toBeCancelledBecause(CommandResult.WrongPasteOption);
  });

  describe("copy/paste a formula with references", () => {
    test("update the references", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "=SUM(C1:C2)");
      await copy(model, "A1");
      await paste(model, "B2");
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
    ])("does not update fixed references", async (value, expected) => {
      const model = await createModel();
      await setCellContent(model, "A1", value);
      await copy(model, "A1");
      await paste(model, "B2");
      expect(getCellText(model, "B2")).toBe(expected);
    });

    test("update cross-sheet reference", async () => {
      const model = await createModel();
      await createSheet(model, { sheetId: "42" });
      await setCellContent(model, "B2", "=Sheet2!B2");
      await copy(model, "B2");
      await paste(model, "B3");
      expect(getCellText(model, "B3")).toBe("=Sheet2!B3");
    });

    test("update cross-sheet reference with a space in the name", async () => {
      const model = await createModel();
      await createSheetWithName(model, { sheetId: "42" }, "Sheet 2");
      await setCellContent(model, "B2", "='Sheet 2'!B2");
      await copy(model, "B2");
      await paste(model, "B3");
      expect(getCellText(model, "B3")).toBe("='Sheet 2'!B3");
    });

    test("update cross-sheet reference in a smaller sheet", async () => {
      const model = await createModel();
      await createSheet(model, { sheetId: "42", rows: 2, cols: 2 });
      await setCellContent(model, "A1", "=Sheet2!A1:A2");
      await copy(model, "A1");
      await paste(model, "A2");
      expect(getCellText(model, "A2")).toBe("=Sheet2!A2:A3");
    });

    test("update cross-sheet reference to a range", async () => {
      const model = await createModel();
      await createSheet(model, { sheetId: "42" });
      await setCellContent(model, "A1", "=SUM(Sheet2!A2:A5)");
      await copy(model, "A1");
      await paste(model, "B1");
      expect(getCellText(model, "B1")).toBe("=SUM(Sheet2!B2:B5)");
    });
  });

  test("can cut and paste an invalid formula", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "=(+)");
    await setCellContent(model, "A2", "=C1{C2");
    await cut(model, "A1:A2");
    await paste(model, "C1");
    expect(getCellText(model, "C1")).toBe("=(+)");
    expect(getCellText(model, "C2")).toBe("=C1{C2");
    expect(getCellText(model, "A1")).toBe("");
    expect(getCellText(model, "A2")).toBe("");
  });

  test("cut/paste a formula with references does not update references in the formula", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "=SUM(C1:C2)");
    await cut(model, "A1");
    await paste(model, "B2");
    expect(getCellText(model, "B2")).toBe("=SUM(C1:C2)");
  });

  test("cut/paste a formula with references in another sheet updates the sheet references in the formula", async () => {
    const model = await createModel();
    await createSheet(model, { sheetId: "sh2", name: "Sheet2" });
    await setCellContent(model, "A1", "=SUM(C1:C2)");
    await setCellContent(model, "B1", "=Sheet2!A1 + A2");
    await cut(model, "A1:B1");

    await activateSheet(model, "sh2");
    await paste(model, "A1");
    expect(getCellText(model, "A1")).toBe("=SUM(Sheet1!C1:C2)");
    expect(getCellText(model, "B1")).toBe("=A1+Sheet1!A2");
  });

  test("copy/paste a zone present in formulas references does not update references", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "=B2");
    await copy(model, "B2");
    await paste(model, "C3");
    expect(getCellText(model, "A1")).toBe("=B2");
  });

  describe("cut/paste a zone present in formulas references", () => {
    test("update references", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "=B2");
      await cut(model, "B2");
      await paste(model, "C3");
      expect(getCellText(model, "A1")).toBe("=C3");
    });

    test("update references to a range", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "=SUM(B2:C3)");
      await cut(model, "B2:C3");
      await paste(model, "D4");
      expect(getCellText(model, "A1")).toBe("=SUM(D4:E5)");
    });

    test("update fixed references", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "=$B$2");
      await cut(model, "B2");
      await paste(model, "C3");
      expect(getCellText(model, "A1")).toBe("=$C$3");
    });

    test("update cross-sheet reference", async () => {
      const model = await createModel();
      await createSheet(model, { sheetId: "Sheet2" });
      await setCellContent(model, "A1", "=Sheet2!$B$2");

      await activateSheet(model, "Sheet2");
      await cut(model, "B2");

      await createSheet(model, { activate: true, sheetId: "Sheet3" });
      await paste(model, "C3");

      await activateSheet(model, "Sheet1");
      expect(getCellText(model, "A1")).toBe("=Sheet3!$C$3");
    });

    test("update references even if the formula is present in the cutting zone", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "=B1");
      await setCellContent(model, "B1", "b1");
      await cut(model, "A1:B1");
      await paste(model, "A2");

      expect(getCellText(model, "A1")).toBe("");
      expect(getCellText(model, "B1")).toBe("");
      expect(getCellText(model, "A2")).toBe("=B2");
      expect(getCellText(model, "B2")).toBe("b1");
    });

    test("does not update reference if it isn't fully included in the zone", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "=SUM(B1:C1)+B1");
      await cut(model, "B1");
      await paste(model, "B2");
      expect(getCellText(model, "A1")).toBe("=SUM(B1:C1)+B2");
    });

    test("does not update reference if it isn't fully included in the zone even if the formula is present in the cutting zone", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "=SUM(B1:C1)+B1");
      await setCellContent(model, "B1", "b1");
      await cut(model, "A1:B1");
      await paste(model, "A2");

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
  ])("can copy and paste formula with full cols/rows", async (value, expected) => {
    const model = await createModel();
    await setCellContent(model, "A1", value);
    await copy(model, "A1");
    await paste(model, "B2");
    expect(getCellText(model, "B2")).toBe(expected);
  });

  test("can copy format from empty cell to another cell to clear format", async () => {
    const model = await createModel();

    // write something in B2 and set its format
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await setFormatting(model, "B2", { bold: true });
    expect(getCell(model, "B2")!.style).toEqual({ bold: true });

    // select A1 and copy format
    await copy(model, "A1");

    // select B2 and paste format
    await paste(model, "B2", "onlyFormat");

    expect(getCellContent(model, "B2")).toBe("b2");
    expect(getCell(model, "B2")!.style).not.toBeDefined();
  });

  test("can copy and paste a conditional formatted cell", async () => {
    const model = await createModel({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "C1", "1");
    await setCellContent(model, "C2", "2");
    await addEqualCf(model, "A1,A2", { fillColor: "#FF0000" }, "1");
    await copy(model, "A1");
    await paste(model, "C1");
    await copy(model, "A2");
    await paste(model, "C2");
    expect(getStyle(model, "A1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2")).toEqual({});
    expect(getStyle(model, "C1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "C2")).toEqual({});
  });
  test("can cut and paste a conditional formatted cell", async () => {
    const model = await createModel({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "C1", "1");
    await setCellContent(model, "C2", "2");
    await addEqualCf(model, "A1,A2", { fillColor: "#FF0000" }, "1");
    await cut(model, "A1");
    await paste(model, "C1");
    await cut(model, "A2");
    await paste(model, "C2");
    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "A2")).toEqual({});
    expect(getStyle(model, "C1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "C2")).toEqual({});
  });

  test("can cut and paste a conditional format in another sheet", async () => {
    const model = await createModel();
    const sheet1Id = model.getters.getActiveSheetId();
    await createSheet(model, { sheetId: "sheet2Id" });
    await addEqualCf(model, "A1:A2", { fillColor: "#FF0000" }, "1");
    await cut(model, "A1:A2");
    await activateSheet(model, "sheet2Id");
    await paste(model, "C1");
    expect(model.getters.getConditionalFormats(sheet1Id)).toEqual([]);
    expect(model.getters.getConditionalFormats("sheet2Id")).toMatchObject([
      { ranges: ["C1:C2"], rule: { type: "CellIsRule", style: { fillColor: "#FF0000" } } },
    ]);
  });

  test("copy cells with CF => remove origin CF => paste => it should paste with original CF", async () => {
    const model = await createModel();
    await addEqualCf(model, "A1:A3", { fillColor: "#00FF00" }, "1", "cfId");
    await copy(model, "A1:A3");
    await removeCF(model, "cfId");
    await paste(model, "D1");
    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toMatchObject([
      { ranges: ["D1:D3"], rule: { style: { fillColor: "#00FF00" } } },
    ]);
  });

  test("copy cells with multiple independent CF => remove all copied CF => paste => it should paste with all original CF in the correct positions", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    await addEqualCf(model, "A1:A3", { fillColor: "#00FF00" }, "1", "cf1");
    await addEqualCf(model, "C1:C3", { fillColor: "#0000FF" }, "1", "cf2");
    await copy(model, "A1:C3");
    await removeCF(model, "cf1");
    await removeCF(model, "cf2");
    await paste(model, "E1");
    expect(model.getters.getConditionalFormats(sheetId)).toMatchObject([
      { ranges: ["E1:E3"], rule: { style: { fillColor: "#00FF00" } } },
      { ranges: ["G1:G3"], rule: { style: { fillColor: "#0000FF" } } },
    ]);
  });

  test("copy cells with multiple independent CF => remove origin sheet => paste => it should paste with all original CF in the correct positions", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    await addEqualCf(model, "A1:A3", { fillColor: "#00FF00" }, "1", "cf1");
    await addEqualCf(model, "C1:C3", { fillColor: "#0000FF" }, "1", "cf2");
    await copy(model, "A1:C3");
    const newSheetId = "Sheet2";
    await createSheet(model, { sheetId: newSheetId, activate: true });
    await deleteSheet(model, sheetId);
    await paste(model, "E1");
    expect(model.getters.getConditionalFormats(newSheetId)).toMatchObject([
      { ranges: ["E1:E3"], rule: { style: { fillColor: "#00FF00" } } },
      { ranges: ["G1:G3"], rule: { style: { fillColor: "#0000FF" } } },
    ]);
  });

  test("can copy and paste a conditional formatted zone", async () => {
    const model = await createModel({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await addEqualCf(model, "A1,A2", { fillColor: "#FF0000" }, "1");
    await copy(model, "A1:A2");
    await paste(model, "B1");
    await paste(model, "C1");
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
    await setCellContent(model, "C1", "2");
    await setCellContent(model, "C2", "1");
    expect(getStyle(model, "C1")).toEqual({});
    expect(getStyle(model, "C2")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("can cut and paste a conditional formatted zone", async () => {
    const model = await createModel({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await addEqualCf(model, "A1,A2", { fillColor: "#FF0000" }, "1");
    await cut(model, "A1:A2");
    await paste(model, "B1");
    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "A2")).toEqual({});
    expect(getStyle(model, "B1")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "B2")).toEqual({});
    await setCellContent(model, "B1", "2");
    await setCellContent(model, "B2", "1");
    expect(getStyle(model, "B1")).toEqual({});
    expect(getStyle(model, "B2")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("can copy and paste a conditional formatted cell to another page", async () => {
    const model = await createModel({
      sheets: [
        { id: "s1", colNumber: 5, rowNumber: 5 },
        { id: "s2", colNumber: 5, rowNumber: 5 },
      ],
    });
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await addEqualCf(model, "A1,A2", { fillColor: "#FF0000" }, "1");
    await copy(model, "A1:A2");
    await activateSheet(model, "s2");
    await paste(model, "A1");
    expect(getStyle(model, "A1", "s2")).toEqual({
      fillColor: "#FF0000",
    });
    expect(getStyle(model, "A2", "s2")).toEqual({});
    await setCellContent(model, "A1", "2");
    await setCellContent(model, "A2", "1");
    expect(getStyle(model, "A1", "s2")).toEqual({});
    expect(getStyle(model, "A2", "s2")).toEqual({
      fillColor: "#FF0000",
    });
  });

  test("can cut and paste a conditional formatted zone to another page", async () => {
    const model = await createModel({ sheets: [{ id: "sheet1" }, { id: "sheet2" }] });
    await addEqualCf(model, "A1:A2", { fillColor: "#FF0000" }, "1");
    await cut(model, "A1:A2");
    await activateSheet(model, "sheet2");
    await paste(model, "A1");
    expect(model.getters.getConditionalFormats("sheet2")).toMatchObject([
      { ranges: ["A1:A2"], rule: { style: { fillColor: "#FF0000" } } },
    ]);
    expect(model.getters.getConditionalFormats("sheet1")).toEqual([]);
  });

  test("copy paste CF in another sheet => change CF => copy paste again does not overwrite the previously pasted CF", async () => {
    const model = await createModel();
    await createSheet(model, {});
    const sheet1Id = model.getters.getSheetIds()[0];
    const sheet2Id = model.getters.getSheetIds()[1];

    await addEqualCf(model, "A1", { fillColor: "#00FF00" }, "2", "cfId");
    await copy(model, "A1");
    await activateSheet(model, sheet2Id);
    await paste(model, "A1");
    expect(model.getters.getConditionalFormats(sheet2Id)).toMatchObject([
      { ranges: ["A1"], rule: { style: { fillColor: "#00FF00" } } },
    ]);

    await addEqualCf(model, "A1", { fillColor: "#FF0000" }, "2", "cfId", sheet1Id);
    await activateSheet(model, sheet1Id);
    await copy(model, "A1");
    await activateSheet(model, sheet2Id);
    await paste(model, "B2");
    expect(model.getters.getConditionalFormats(sheet2Id)).toMatchObject([
      { ranges: ["A1"], rule: { style: { fillColor: "#00FF00" } } },
      { ranges: ["B2"], rule: { style: { fillColor: "#FF0000" } } },
    ]);
  });

  test("copy/paste a CF zone only dispatch a singled ADD_CONDITIONAL_FORMAT", async () => {
    const commands: Command[] = [];
    class MyUIPlugin extends UIPlugin {
      handle = (cmd: Command) => commands.push(cmd);
    }
    addTestPlugin(featurePluginRegistry, MyUIPlugin);

    const model = await createModel({ sheets: [{ colNumber: 5, rowNumber: 5 }] });
    const sheetId = model.getters.getActiveSheetId();
    await addEqualCf(model, "A1,A2", { fillColor: "#FF0000" }, "1");

    await copy(model, "A1:A2");
    await paste(model, "B1");

    expect(model.getters.getConditionalFormats(sheetId)).toMatchObject([{ ranges: ["A1:B2"] }]);
    expect(commands.filter((c) => c.type === "ADD_CONDITIONAL_FORMAT")).toHaveLength(2);
  });

  test("can copy and paste a cell which contains a cross-sheet reference", async () => {
    const model = await createModel();
    await createSheet(model, { sheetId: "42" });
    await setCellContent(model, "B2", "=Sheet2!B2");

    await copy(model, "B2");
    await paste(model, "B3");
    expect(getCellText(model, "B3")).toBe("=Sheet2!B3");
  });

  test("can copy and paste a cell which contains a cross-sheet reference with a space in the name", async () => {
    const model = await createModel();
    await createSheetWithName(model, { sheetId: "42" }, "Sheet 2");
    await setCellContent(model, "B2", "='Sheet 2'!B2");

    await copy(model, "B2");
    await paste(model, "B3");
    expect(getCellText(model, "B3")).toBe("='Sheet 2'!B3");
  });

  test("can copy and paste a cell which contains a cross-sheet reference in a smaller sheet", async () => {
    const model = await createModel();
    await createSheet(model, { sheetId: "42", rows: 2, cols: 2 });
    await setCellContent(model, "A1", "=Sheet2!A1:A2");

    await copy(model, "A1");
    await paste(model, "A2");
    expect(getCellText(model, "A2")).toBe("=Sheet2!A2:A3");
  });

  test("can copy and paste a cell which contains a cross-sheet reference to a range", async () => {
    const model = await createModel();
    await createSheet(model, { sheetId: "42" });
    await setCellContent(model, "A1", "=SUM(Sheet2!A2:A5)");

    await copy(model, "A1");
    await paste(model, "B1");
    expect(getCellText(model, "B1")).toBe("=SUM(Sheet2!B2:B5)");
  });

  test.each([
    ["=A1", "=#REF"],
    ["=SUM(A1:B1)", "=SUM(#REF)"],
  ])("Copy invalid ranges due to row deletion", async (initialFormula, expectedInvalidFormula) => {
    const model = await createModel();
    await setCellContent(model, "A3", initialFormula);
    await deleteRows(model, [0]);
    expect(getCellRawContent(model, "A2")).toBe(expectedInvalidFormula);

    await copy(model, "A2");
    await paste(model, "C5");
    expect(getCellRawContent(model, "C5")).toBe(expectedInvalidFormula);
  });

  test.each([
    ["=A1", "=#REF"],
    ["=SUM(A1:A2)", "=SUM(#REF)"],
  ])(
    "Copy invalid ranges due to column deletion",
    async (initialFormula, expectedInvalidFormula) => {
      const model = await createModel();
      await setCellContent(model, "C1", initialFormula);
      await deleteColumns(model, ["A"]);
      expect(getCellRawContent(model, "B1")).toBe(expectedInvalidFormula);

      await copy(model, "B1");
      await paste(model, "C3");
      expect(getCellRawContent(model, "C3")).toBe(expectedInvalidFormula);
    }
  );

  test.each([
    ["=A1", "=#REF"],
    ["=SUM(A1:B1)", "=SUM(#REF)"],
  ])("Cut invalid ranges due to row deletion", async (initialFormula, expectedInvalidFormula) => {
    const model = await createModel();
    await setCellContent(model, "A3", initialFormula);
    await deleteRows(model, [0]);
    expect(getCellRawContent(model, "A2")).toBe(expectedInvalidFormula);

    await cut(model, "A2");
    await paste(model, "C5");
    expect(getCellRawContent(model, "C5")).toBe(expectedInvalidFormula);
  });

  test.each([
    ["=A1", "=#REF"],
    ["=SUM(A1:A2)", "=SUM(#REF)"],
  ])(
    "Cut invalid ranges due to column deletion",
    async (initialFormula, expectedInvalidFormula) => {
      const model = await createModel();
      await setCellContent(model, "C1", initialFormula);
      await deleteColumns(model, ["A"]);
      expect(getCellRawContent(model, "B1")).toBe(expectedInvalidFormula);

      await cut(model, "B1");
      await paste(model, "C3");
      expect(getCellRawContent(model, "C3")).toBe(expectedInvalidFormula);
    }
  );

  test("filtered rows are ignored when copying range", async () => {
    //prettier-ignore
    const model = await createModelFromGrid({
      B2: "b2", C2: "c2", D2: "d2",
      B3: "b3", C3: "c3", D3: "d3",
      B4: "b4", C4: "c4", D4: "d4",
    });

    await createTableWithFilter(model, "B2:D4");
    await updateFilter(model, "C3", ["c3"]);
    await copy(model, "B2:D4");
    await paste(model, "B5");

    expect(getEvaluatedGrid(model, "B5:D7")).toEqual([
      ["b2", "c2", "d2"],
      ["b4", "c4", "d4"],
      ["", "", ""],
    ]);
  });

  test("filtered rows are ignored when cutting range", async () => {
    //prettier-ignore
    const model = await createModelFromGrid({
      B2: "b2", C2: "c2", D2: "d2",
      B3: "b3", C3: "c3", D3: "d3",
      B4: "b4", C4: "c4", D4: "d4",
    });

    await createTableWithFilter(model, "B2:D4");
    await updateFilter(model, "C3", ["c3"]);
    await cut(model, "B2:D4");
    await paste(model, "B5");

    expect(getEvaluatedGrid(model, "B5:D7")).toEqual([
      ["b2", "c2", "d2"],
      ["b3", "c3", "d3"],
      ["b4", "c4", "d4"],
    ]);
  });

  test("hidden rows/columns are taken into account when copypasting range", async () => {
    //prettier-ignore
    const model = await createModelFromGrid({
      B2: "b2", C2: "c2", D2: "d2",
      B3: "b3", C3: "c3", D3: "d3",
      B4: "b4", C4: "c4", D4: "d4",
    });

    await hideRows(model, [2]);
    await hideColumns(model, ["C"]);
    await copy(model, "B2:D4");
    await paste(model, "E1");

    expect(getEvaluatedGrid(model, "E1:G3")).toEqual([
      ["b2", "c2", "d2"],
      ["b3", "c3", "d3"],
      ["b4", "c4", "d4"],
    ]);
  });

  test("hidden rows/columns are taken into account when cutpasting range", async () => {
    //prettier-ignore
    const model = await createModelFromGrid({
      B2: "b2", C2: "c2", D2: "d2",
      B3: "b3", C3: "c3", D3: "d3",
      B4: "b4", C4: "c4", D4: "d4",
    });

    await hideRows(model, [2]);
    await hideColumns(model, ["C"]);
    await cut(model, "B2:D4");
    await paste(model, "E1");

    expect(getEvaluatedGrid(model, "E1:G3")).toEqual([
      ["b2", "c2", "d2"],
      ["b3", "c3", "d3"],
      ["b4", "c4", "d4"],
    ]);
  });

  test("copying a spread pivot cell results in the fixed pivot formula", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30"
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    // copy 1 cell
    await copy(model, "D1"); // copy the header Total
    await paste(model, "G4");
    expect(getEvaluatedCell(model, "G4").value).toBe("Total");
    expect(getCellRawContent(model, "G4")).toBe("=PIVOT.HEADER(1)");

    // copy part of pivot
    await copy(model, "C1:D4");
    await paste(model, "G4");
    await setFormulaVisibility(model, true);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "G4:H7")).toEqual([
      ["",                                      "=PIVOT.HEADER(1)"],
      ["",                                      '=PIVOT.HEADER(1,"measure","Price:sum")'],
      ['=PIVOT.HEADER(1,"Customer","Alice")',   '=PIVOT.VALUE(1,"Price:sum","Customer","Alice")'],
      ['=PIVOT.HEADER(1,"Customer","Bob")',     '=PIVOT.VALUE(1,"Price:sum","Customer","Bob")'],
    ]);
  });

  test("Copying (or cutting) entire pivot does not results in fixed pivot formula", async () => {
    // prettier-ignore
    const grid = {
        A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
        A2: "Alice",    B2: "10",
        A3: "Bob",      B3: "30"
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    await copy(model, "C1:D5");
    await paste(model, "G4");
    expect(getCellRawContent(model, "G4")).toBe("=PIVOT(1)");
    expect(getCell(model, "G5")).toBeUndefined();

    await cut(model, "C1:D5");
    await paste(model, "G20");
    expect(getCellRawContent(model, "G20")).toBe("=PIVOT(1)");
    expect(getCell(model, "G21")).toBeUndefined();
  });

  test("copy spread pivot cells format", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30"
    };
    const model = await createModelFromGrid(grid);

    await setFormat(model, "B2:B3", "#,##0[$$]");

    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    await setFormat(model, "D5", "#,##0.0");
    await copy(model, "D4:D5");
    await paste(model, "G4");

    // automatic format on G4
    expect(getCellRawContent(model, "G4")).toBe('=PIVOT.VALUE(1,"Price:sum","Customer","Bob")');
    expect(getCell(model, "G4")?.format).toBeUndefined();
    expect(getEvaluatedCell(model, "G4").format).toBe("#,##0[$$]");

    // forced format copied from D5
    expect(getCellRawContent(model, "G5")).toBe('=PIVOT.VALUE(1,"Price:sum")');
    expect(getCell(model, "G5")?.format).toBe("#,##0.0");
    expect(getEvaluatedCell(model, "G5").format).toBe("#,##0.0");
  });

  test("copy spread pivot from a referenced id", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "1",
      A2: "Alice",    B2: "10",    C2: "=PIVOT(C1)",
      A3: "Bob",      B3: "30"
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    await copy(model, "D4");
    await paste(model, "G4");
    expect(getCellRawContent(model, "G4")).toBe('=PIVOT.VALUE(1,"Price:sum","Customer","Alice")');
  });

  test("copying a spread pivot cell with (Undefined)", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "",         B3: "20"
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ fieldName: "Price", aggregator: "sum", id: "Price:sum" }],
    });

    await copy(model, "C1:D4");
    await paste(model, "G4");
    await setFormulaVisibility(model, true);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "G4:H7")).toEqual([
      ["",                                      "=PIVOT.HEADER(1)"],
      ["",                                      '=PIVOT.HEADER(1,"measure","Price:sum")'],
      ['=PIVOT.HEADER(1,"Customer","Alice")',   '=PIVOT.VALUE(1,"Price:sum","Customer","Alice")'],
      ['=PIVOT.HEADER(1,"Customer","null")',    '=PIVOT.VALUE(1,"Price:sum","Customer","null")'],
    ]);
  });

  test("copying only the cell with a spread pivot formula doesn't fix the pivot", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30"
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    await copy(model, "C1");
    await paste(model, "G4");
    expect(getCellRawContent(model, "G4")).toBe("=PIVOT(1)");
  });

  test("fixed pivot formulas are copied like standard cells", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "1",
      A2: "Alice",    B2: "10",    C2: '=PIVOT.VALUE(C1,"Price","Customer","Bob")',
      A3: "Bob",      B3: "30"
    };

    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    await copy(model, "C2");
    await paste(model, "G4");
    expect(getCellRawContent(model, "G4")).toBe('=PIVOT.VALUE(G3,"Price","Customer","Bob")');
  });
});

describe("clipboard: pasting outside of sheet", () => {
  test("can copy and paste a full column", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "txt");
    const activeSheetId = model.getters.getActiveSheetId();
    const currentRowNumber = model.getters.getNumberRows(activeSheetId);

    await copy(model, zoneToXc(model.getters.getColsZone(activeSheetId, 0, 0)));
    await paste(model, "B2");
    expect(model.getters.getNumberRows(activeSheetId)).toBe(currentRowNumber + 1);
    expect(getCellContent(model, "B2")).toBe("txt");
    expect(model.getters.getSelectedZones()).toEqual([toZone("B2:B101")]);
  });

  test("can copy and paste a full row", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "txt");

    const activeSheetId = model.getters.getActiveSheetId();
    const currentColNumber = model.getters.getNumberCols(activeSheetId);

    await copy(model, zoneToXc(model.getters.getRowsZone(activeSheetId, 0, 0)));
    await paste(model, "B2");
    expect(model.getters.getNumberCols(activeSheetId)).toBe(currentColNumber + 1);
    expect(getCellContent(model, "B2")).toBe("txt");
    expect(model.getters.getSelectedZones()).toEqual([toZone("B2:AA2")]);
  });

  test("fill down on cell(s) of edge row should do nothing", async () => {
    const model = await createModel();
    await setCellContent(model, "B1", "b1");
    await selectCell(model, "B1");
    await copyPasteAboveCells(model);
    expect(getCellContent(model, "B1")).toBe("b1");

    await setCellContent(model, "C1", "c1");
    await setSelection(model, ["B1:C1"]);
    await copyPasteAboveCells(model);
    expect(getCellContent(model, "B1")).toBe("b1");
    expect(getCellContent(model, "C1")).toBe("c1");
  });

  test("fill right on cell(s) of edge column should do nothing", async () => {
    const model = await createModel();
    await setCellContent(model, "A2", "a2");
    await selectCell(model, "A2");
    await copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "A2")).toBe("a2");

    await setCellContent(model, "A3", "a3");
    await setSelection(model, ["A2:A3"]);
    await copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "A2")).toBe("a2");
    expect(getCellContent(model, "A3")).toBe("a3");
  });

  test("fill down selection with single row -> for each cell, replicates the cell above it", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await copyPasteAboveCells(model);
    expect(getCell(model, "B2")).toBe(undefined);

    await setCellContent(model, "B1", "b1");
    await setFormatting(model, "B1", { bold: true, fillColor: "red" });
    await setCellContent(model, "B2", "b2");
    await selectCell(model, "B2");
    await copyPasteAboveCells(model);
    expect(getCellContent(model, "B2")).toBe("b1");
    expect(getStyle(model, "B2")).toEqual({ bold: true, fillColor: "red" });

    await setCellContent(model, "C1", "c1");
    await setCellContent(model, "D1", "d1");
    await setSelection(model, ["B2:D2"]);
    await copyPasteAboveCells(model);
    expect(getCellContent(model, "B2")).toBe("b1");
    expect(getStyle(model, "B2")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "C2")).toBe("c1");
    expect(getCellContent(model, "D2")).toBe("d1");
  });

  test("do not fill down if filling down would unmerge cells", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "a1");
    await merge(model, "A2:A3");
    await setSelection(model, ["A1:A3"]);
    const result = await copyPasteAboveCells(model);
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
  });

  test("do not fill right if filling right would unmerge cells", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "a1");
    await merge(model, "B1:C1");
    await setSelection(model, ["A1:C1"]);
    const result = await copyPasteCellsOnLeft(model);
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
  });

  test("do not fill if filling would unmerge cells", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "a1");
    await merge(model, "A2:A3");
    await setSelection(model, ["A1:A3"]);
    const result = await copyPasteCellsOnZone(model);
    expect(result).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
  });

  test("fill right selection with single column -> for each cell, replicates the cell on its left", async () => {
    const model = await createModel();
    await setCellContent(model, "B1", "b1");
    await selectCell(model, "B1");
    await copyPasteCellsOnLeft(model);
    expect(getCell(model, "B1")).toBe(undefined);

    await setCellContent(model, "A1", "a1");
    await setFormatting(model, "A1", { bold: true, fillColor: "red" });
    await setCellContent(model, "B1", "b1");
    await selectCell(model, "B1");
    await copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "B1")).toBe("a1");
    expect(getStyle(model, "B1")).toEqual({ bold: true, fillColor: "red" });

    await setCellContent(model, "A2", "a2");
    await setCellContent(model, "A3", "a3");
    await setSelection(model, ["B1:B3"]);
    await copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "B1")).toBe("a1");
    expect(getStyle(model, "B1")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "B2")).toBe("a2");
    expect(getCellContent(model, "B3")).toBe("a3");
  });

  test("fill down selection with multiple rows -> copies first row and pastes in each subsequent row", async () => {
    const model = await createModel();
    await setCellContent(model, "B3", "b3");
    await setSelection(model, ["B2:B3"]);
    await copyPasteAboveCells(model);
    expect(getCell(model, "B2")).toBe(undefined);
    expect(getCell(model, "B3")).toBe(undefined);

    await setCellContent(model, "B1", "b1");
    await setCellContent(model, "B2", "b2");
    await setFormatting(model, "B2", { bold: true, fillColor: "red" });
    await setCellContent(model, "C2", "c2");
    await setSelection(model, ["B2:C3"]);
    await copyPasteAboveCells(model);
    expect(getCellContent(model, "B2")).toBe("b2");
    expect(getStyle(model, "B2")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "B3")).toBe("b2");
    expect(getStyle(model, "B3")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "C2")).toBe("c2");
    expect(getCellContent(model, "C3")).toBe("c2");
  });

  test("CopyPasteAboveCell and copyPasteCellsOnLeft do not change the clipboard state", async () => {
    const model = await createModel();
    await setCellContent(model, "B3", "b3");
    await cut(model, "B3");
    await setSelection(model, ["A1:B2"]);
    await copyPasteAboveCells(model);

    expect(model.getters.isCutOperation()).toBe(true);
    await paste(model, "A2");
    expect(getCellContent(model, "A2")).toBe("b3");

    await setCellContent(model, "B3", "b3");
    await cut(model, "B3");
    await setSelection(model, ["A1:B2"]);
    await copyPasteCellsOnLeft(model);

    expect(model.getters.isCutOperation()).toBe(true);
    await paste(model, "A2");
    expect(getCellContent(model, "A2")).toBe("b3");
  });

  test("Delete Cell and Insert Cell do not invalidate the clipboard", async () => {
    const model = await createModel();
    await setCellContent(model, "B3", "b3");
    await copy(model, "B3");

    await deleteCells(model, "A1", "up");
    expect(model.getters.isCutOperation()).toBe(false);
    await paste(model, "A2");
    expect(getCellContent(model, "A2")).toBe("b3");

    await insertCells(model, "A1", "down");
    expect(model.getters.isCutOperation()).toBe(false);
    await paste(model, "A5");
    expect(getCellContent(model, "A5")).toBe("b3");
  });

  test("Can insert and delete cells inside an array formula", async () => {
    const model = await createModelFromGrid({ A1: "=MUNIT(2)" });
    await createDynamicTable(model, "A1");

    await insertCells(model, "B1", "down");
    expect(getCellRawContent(model, "A1")).toBe("=MUNIT(2)");
    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCell(model, "B2")).toBe(undefined);

    await deleteCells(model, "A2", "left");
    expect(getCellRawContent(model, "A1")).toBe("=MUNIT(2)");
    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCell(model, "A2")).toBe(undefined);
  });

  test("fill right selection with multiple columns -> copies first column and pastes in each subsequent column, ", async () => {
    const model = await createModel();
    await setCellContent(model, "C1", "c1");
    await setSelection(model, ["B1:C1"]);
    await copyPasteCellsOnLeft(model);
    expect(getCell(model, "B1")).toBe(undefined);
    expect(getCell(model, "C1")).toBe(undefined);

    await setCellContent(model, "A1", "a1");
    await setCellContent(model, "B2", "b2");
    await setCellContent(model, "B1", "b1");
    await setFormatting(model, "B1", { bold: true, fillColor: "red" });
    await setSelection(model, ["B1:C2"]);
    await copyPasteCellsOnLeft(model);
    expect(getCellContent(model, "B1")).toBe("b1");
    expect(getStyle(model, "B1")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "B2")).toBe("b2");
    expect(getCellContent(model, "C1")).toBe("b1");
    expect(getStyle(model, "C1")).toEqual({ bold: true, fillColor: "red" });
    expect(getCellContent(model, "C2")).toBe("b2");
  });

  test("Copy a formula which lead to #REF", async () => {
    const model = await createModel();
    await setCellContent(model, "B3", "=A1");
    await copy(model, "B3");
    await paste(model, "B2");
    expect(getCellContent(model, "B2", "#BAD_EXPR"));
    expect(getCellError(model, "B2")).toEqual("Invalid reference");
  });

  test("Can cut & paste a formula", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "=1");
    await cut(model, "A1");
    await paste(model, "B1");
    expect(getCellContent(model, "A1")).toBe("");
    expect(getCellText(model, "B1")).toBe("=1");
  });

  test("Cut & paste a formula update offsets only if the range is in the zone", async () => {
    const model = await createModel();
    await setCellContent(model, "B1", "2");
    await setCellContent(model, "B2", "=B1");
    await setCellContent(model, "B3", "=B2");
    await cut(model, "B2:B3");
    await paste(model, "C2");
    expect(getCellText(model, "C2")).toBe("=B1");
    expect(getCellText(model, "C3")).toBe("=C2");
  });

  test("can paste multiple cells from os to outside of sheet", async () => {
    const model = await createModel();
    await createSheet(model, { activate: true, sheetId: "2", rows: 2, cols: 2 });
    await pasteFromOSClipboard(model, "B2", { text: "A\nque\tcoucou\nBOB" });
    expect(getCellContent(model, "B2")).toBe("A");
    expect(getCellContent(model, "B3")).toBe("que");
    expect(getCellContent(model, "C3")).toBe("coucou");
    expect(getCellContent(model, "B4")).toBe("BOB");

    await createSheet(model, {
      activate: true,
      sheetId: "3",
      rows: 2,
      cols: 2,
    });
    await pasteFromOSClipboard(model, "B2", { text: "A\nque\tcoucou\tPatrick" });
    expect(getCellContent(model, "B2")).toBe("A");
    expect(getCellContent(model, "B3")).toBe("que");
    expect(getCellContent(model, "C3")).toBe("coucou");
    expect(getCellContent(model, "D3")).toBe("Patrick");
  });

  test("Can paste localized formula from the OS", async () => {
    const model = await createModel();
    await updateLocale(model, {
      ...DEFAULT_LOCALE,
      decimalSeparator: ",",
      formulaArgSeparator: ";",
      thousandsSeparator: " ",
    });
    await pasteFromOSClipboard(model, "A1", { text: "=SUM(5 ; 3,14)" });
    expect(getCellRawContent(model, "A1")).toBe("=SUM(5,3.14)");
    expect(getEvaluatedCell(model, "A1").value).toBe(8.14);
  });

  test("Pasted images from OS are inserted at the paste position with a limited size", async () => {
    const model = await createModel();
    const width = 2000;
    const height = 2000;
    await pasteFromOSClipboard(model, "B2", {
      imageData: {
        path: "data:image/png;base64,",
        size: { width, height },
      },
    });
    const sheetId = model.getters.getActiveSheetId();
    expect(getCellContent(model, "B2")).toBe("");
    const figures = model.getters.getFigures(sheetId);
    expect(figures).toHaveLength(1);
    const sheetViewDimension = model.getters.getSheetViewDimension();
    expect(figures[0]).toMatchObject({
      tag: "image",
      width: sheetViewDimension.width,
      height: sheetViewDimension.height,
      col: 1,
      row: 1,
    });
  });

  test("Copying an imge too big in the clipboard notifies the user", async () => {
    class FileStore extends MockFileStore {
      async getFile(fileUrl) {
        return new File(["x".repeat(MAX_FILE_SIZE + 1)], "mock", { type: "image/jpeg" });
      }
    }
    const spyNotifyUI = jest.fn();
    const model = await createModel({}, { external: { fileStore: new FileStore() } });
    model.on("notify-ui", this, spyNotifyUI);

    await createImage(model, { figureId: "test" });
    await selectFigure(model, "test");
    await copy(model);
    await model.getters.getClipboardTextAndImageContent();
    expect(spyNotifyUI).toHaveBeenCalledWith({
      sticky: false,
      text: "The file you are trying to copy is too large (>5MB).\nIt will not be added to your OS clipboard.\nYou can download it directly instead.",
      type: "warning",
    });
  });

  test("Can copy parts of the spread values", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "A3", "3");
    await setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
    await copy(model, "C1:D1");
    await paste(model, "C2");
    expect(getEvaluatedCell(model, "C2").value).toBe(2);
    expect(getEvaluatedCell(model, "D2").value).toBe(3);
  });

  test("Cutting parts of the spread values will make a copy of the values", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "A3", "3");
    await setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
    await cut(model, "C1:D1");
    await paste(model, "C2");
    expect(getEvaluatedCell(model, "B1").value).toBe(1);
    expect(getEvaluatedCell(model, "C1").value).toBe(2);
    expect(getEvaluatedCell(model, "C2").value).toBe(2);
    expect(getEvaluatedCell(model, "D1").value).toBe(3);
    expect(getEvaluatedCell(model, "D2").value).toBe(3);
  });

  test("can copy and paste format only from spread value", async () => {
    const model = await createModel();

    // formula without format
    await setCellContent(model, "A1", "=SUM(1+2)");

    // formula with format set on it
    await setCellContent(model, "A2", "=SUM(1+2)");
    await setCellFormat(model, "A2", "0%");

    // formula that return value with format
    await setCellContent(model, "A3", "=DATE(2042,1,1)");

    // formula that return value with format and other format seted on it
    await setCellContent(model, "A4", "=DATE(2042,1,1)");
    await setCellFormat(model, "A4", "0%");

    // formula that return value with format inferred from reference
    await setCellContent(model, "A5", "3");
    await setCellFormat(model, "A5", "0%");
    await setCellContent(model, "A6", "=SUM(1+A5)");

    // formula that return value with format inferred from reference and other format seted on it
    await setCellContent(model, "A7", "3");
    await setCellFormat(model, "A7", "0%");
    await setCellContent(model, "A8", "=SUM(1+A7)");
    await setCellFormat(model, "A8", "#,##0[$$]");

    await setCellContent(model, "B1", "=TRANSPOSE(A1:A8)");

    for (const cell of ["C2", "D2", "E2", "F2", "G2", "H2", "I2"]) {
      await setCellContent(model, cell, "42");
    }

    await copy(model, "C1:I1");
    await paste(model, "C2", "onlyFormat");

    expect(getCellContent(model, "C2")).toBe("4200%");
    expect(getCellContent(model, "D2")).toBe("2/10/1900");
    expect(getCellContent(model, "E2")).toBe("4200%");
    expect(getCellContent(model, "F2")).toBe("4200%");
    expect(getCellContent(model, "G2")).toBe("4200%");
    expect(getCellContent(model, "H2")).toBe("4200%");
    expect(getCellContent(model, "I2")).toBe("42$");
  });

  describe("add col/row can invalidate the clipboard of cut", () => {
    test("adding a column before a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "B1", "2");

      await cut(model, "A1:B1");
      await addColumns(model, "before", "A", 1);
      await paste(model, "A2");
      expect(getCellContent(model, "B1")).toBe("1");
      expect(getCellContent(model, "C1")).toBe("2");
      expect(getCellContent(model, "A2")).toBe("");
      expect(getCellContent(model, "B2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
    });

    test("adding a column after a cut zone is not invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "B1", "2");

      await cut(model, "A1:B1");
      await addColumns(model, "after", "B", 1);
      await paste(model, "A2");
      expect(getCellContent(model, "A1")).toBe("");
      expect(getCellContent(model, "B1")).toBe("");
      expect(getCellContent(model, "A2")).toBe("1");
      expect(getCellContent(model, "B2")).toBe("2");
    });

    test("adding a column inside a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "B1", "2");

      await cut(model, "A1:B1");
      await addColumns(model, "after", "A", 1);
      await paste(model, "A2");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "C1")).toBe("2");
      expect(getCellContent(model, "A2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
    });

    test("adding multipe columns inside a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "B1", "2");

      await cut(model, "A1:B1");
      await addColumns(model, "after", "A", 5);
      await paste(model, "A2");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "G1")).toBe("2");
      expect(getCellContent(model, "A2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
    });

    test("adding a row before a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");

      await cut(model, "A1:A2");
      await addRows(model, "before", 0, 1);
      await paste(model, "C1");
      expect(getCellContent(model, "A2")).toBe("1");
      expect(getCellContent(model, "A3")).toBe("2");
      expect(getCellContent(model, "C1")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
      expect(getCellContent(model, "C3")).toBe("");
    });

    test("adding a row after a cut zone is not invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");

      await cut(model, "A1:A2");
      await addRows(model, "after", 2, 1);
      await paste(model, "C1");
      expect(getCellContent(model, "A1")).toBe("");
      expect(getCellContent(model, "A2")).toBe("");
      expect(getCellContent(model, "C1")).toBe("1");
      expect(getCellContent(model, "C2")).toBe("2");
    });

    test("adding a row inside a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");

      await cut(model, "A1:A2");
      await addRows(model, "after", 0, 1);
      await paste(model, "C1");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "A3")).toBe("2");
      expect(getCellContent(model, "C1")).toBe("");
      expect(getCellContent(model, "C3")).toBe("");
    });

    test("adding multiple rows inside a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");

      await cut(model, "A1:A2");
      await addRows(model, "after", 0, 5);
      await paste(model, "C1");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "A7")).toBe("2");
      expect(getCellContent(model, "C1")).toBe("");
      expect(getCellContent(model, "C3")).toBe("");
    });

    test("Adding rows in another sheet does not invalidate the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");
      await cut(model, "A1:A2");

      await createSheet(model, { activate: true });
      await addRows(model, "after", 0, 5);

      await paste(model, "A1");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "A2")).toBe("2");
    });
  });

  describe("remove col/row can invalidate the clipboard of cut", () => {
    test("removing a column before a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "B2", "1");
      await setCellContent(model, "C2", "2");

      await cut(model, "B2:C2");
      await deleteColumns(model, ["A"]);
      await paste(model, "D1");
      expect(getCellContent(model, "A2")).toBe("1");
      expect(getCellContent(model, "B2")).toBe("2");
      expect(getCellContent(model, "D1")).toBe("");
      expect(getCellContent(model, "E1")).toBe("");
    });

    test("removing a column after a cut zone is not invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "B2", "1");
      await setCellContent(model, "C2", "2");

      await cut(model, "B2:C2");
      await deleteColumns(model, ["D"]);
      await paste(model, "D1");
      expect(getCellContent(model, "B2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
      expect(getCellContent(model, "D1")).toBe("1");
      expect(getCellContent(model, "E1")).toBe("2");
    });

    test("removing a column inside a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "B2", "1");
      await setCellContent(model, "C2", "2");

      await cut(model, "B2:C2");
      await deleteColumns(model, ["C"]);
      await paste(model, "D1");
      expect(getCellContent(model, "B2")).toBe("1");
      expect(getCellContent(model, "D1")).toBe("");
    });

    test("removing a row before a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "B2", "1");
      await setCellContent(model, "C2", "2");

      await cut(model, "B2:C2");
      await deleteRows(model, [0]);
      await paste(model, "D1");
      expect(getCellContent(model, "B1")).toBe("1");
      expect(getCellContent(model, "C1")).toBe("2");
      expect(getCellContent(model, "D1")).toBe("");
      expect(getCellContent(model, "E1")).toBe("");
    });

    test("removing a row after a cut zone is not invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "B2", "1");
      await setCellContent(model, "C2", "2");

      await cut(model, "B2:C2");
      await deleteRows(model, [3]);
      await paste(model, "D1");
      expect(getCellContent(model, "B2")).toBe("");
      expect(getCellContent(model, "C2")).toBe("");
      expect(getCellContent(model, "D1")).toBe("1");
      expect(getCellContent(model, "E1")).toBe("2");
    });

    test("removing a row inside a cut zone is invalidating the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "B2", "1");
      await setCellContent(model, "B3", "2");

      await cut(model, "B2:B3");
      await deleteRows(model, [2]);
      await paste(model, "D1");
      expect(getCellContent(model, "B2")).toBe("1");
      expect(getCellContent(model, "D1")).toBe("");
    });

    test("Removing rows in another sheet does not invalidate the clipboard", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");
      await cut(model, "A1:A2");

      await createSheet(model, { activate: true });
      await deleteRows(model, [1]);

      await paste(model, "A1");
      expect(getCellContent(model, "A1")).toBe("1");
      expect(getCellContent(model, "A2")).toBe("2");
    });
  });
});

describe("cross spreadsheet copy/paste", () => {
  test("should copy/paste a cell with basic formatting", async () => {
    const modelA = await createModel();
    const modelB = await createModel();
    const cellStyle = { bold: true, fillColor: "#00FF00", fontSize: 20 };

    await setCellContent(modelA, "B2", "b2");
    await setFormatting(modelA, "B2", cellStyle);

    expect(getCell(modelA, "B2")).toMatchObject({
      content: "b2",
      style: cellStyle,
    });

    await copy(modelA, "B2");
    const clipboardContent = await modelA.getters.getClipboardTextAndImageContent();

    expect(clipboardContent["text/plain"]).toBe("b2");
    const osClipboardContent = parseOSClipboardContent(clipboardContent);
    await pasteFromOSClipboard(modelB, "D2", osClipboardContent);

    expect(getCellRawContent(modelA, "B2")).toBe("b2");
    expect(getCellRawContent(modelB, "D2")).toBe("b2");
    expect(getStyle(modelA, "B2")).toEqual(cellStyle);
    expect(getStyle(modelB, "D2")).toEqual(cellStyle);
  });

  test("should copy/paste a cell with a border", async () => {
    const modelA = await createModel();
    const modelB = await createModel();

    await selectCell(modelA, "B2");
    await setZoneBorders(modelA, { position: "top" });

    expect(getBorder(modelA, "B2")).toEqual({ top: DEFAULT_BORDER_DESC });

    await copy(modelA, "B2");
    const clipboardContent = await modelA.getters.getClipboardTextAndImageContent();
    const osClipboardContent = await parseOSClipboardContent(clipboardContent);
    await pasteFromOSClipboard(modelB, "D2", osClipboardContent);

    expect(getBorder(modelA, "B2")).toEqual({ top: DEFAULT_BORDER_DESC });
    expect(getBorder(modelB, "D2")).toEqual({ top: DEFAULT_BORDER_DESC });
  });

  test("should copy/paste a cell with a formula", async () => {
    const modelA = await createModel();
    const modelB = await createModel();

    await setCellContent(modelA, "A1", "=SUM(1,2)");
    await setCellContent(modelA, "A2", "=SUM(1,2)");
    await setCellFormat(modelA, "A2", "0%");
    await setCellContent(modelA, "A3", "=DATE(2024,1,1)");
    await setCellContent(modelA, "A4", "=DATE(2024,1,1)");
    await setCellFormat(modelA, "A4", "m/d/yyyy hh:mm:ss a");
    await setCellContent(modelA, "A5", "=SOMME(1,2)");

    await copy(modelA, "A1:A5");
    const clipboardContent = await modelA.getters.getClipboardTextAndImageContent();
    const osClipboardContent = await parseOSClipboardContent(clipboardContent);
    await pasteFromOSClipboard(modelB, "D1", osClipboardContent);

    expect(getCellRawContent(modelB, "D1")).toBe("=SUM(1,2)");
    expect(getCellRawContent(modelB, "D2")).toBe("=SUM(1,2)");
    expect(getCellRawContent(modelB, "D3")).toBe("=DATE(2024,1,1)");
    expect(getCellRawContent(modelB, "D4")).toBe("=DATE(2024,1,1)");
    expect(getCellRawContent(modelB, "D5")).toBe("=SOMME(1,2)");
  });

  test("should copy/paste a cell with a markdown link", async () => {
    const modelA = await createModel();
    const modelB = await createModel();
    const url = "https://www.odoo.com";
    const urlLabel = "Odoo Website";

    await setCellContent(modelA, "A1", markdownLink(urlLabel, url));
    await copy(modelA, "A1");
    const clipboardContent = await modelA.getters.getClipboardTextAndImageContent();
    const osClipboardContent = await parseOSClipboardContent(clipboardContent);
    await pasteFromOSClipboard(modelB, "D1", osClipboardContent);

    const cell = getEvaluatedCell(modelB, "D1");
    expect(cell.link?.label).toBe(urlLabel);
    expect(cell.link?.url).toBe(url);
    expect(urlRepresentation(cell.link!, modelB.getters)).toBe(url);
    expect(getCellRawContent(modelB, "D1")).toBe("[Odoo Website](https://www.odoo.com)");
    expect(getStyle(modelB, "D1")).toEqual({ textColor: LINK_COLOR });
    expect(getCellText(modelB, "D1")).toBe("Odoo Website");
  });

  test("should copy/paste a table", async () => {
    const modelA = await createModel();
    const modelB = await createModel();

    await createTable(modelA, "A1:B2");
    const tableA = modelA.getters.getCoreTables(modelA.getters.getActiveSheetId())[0];

    expect(tableA).toMatchObject({ range: { zone: toZone("A1:B2") }, type: "static" });

    await copy(modelA, "A1:B2");
    const clipboardContent = await modelA.getters.getClipboardTextAndImageContent();
    const osClipboardContent = await parseOSClipboardContent(clipboardContent);
    await pasteFromOSClipboard(modelB, "D1", osClipboardContent);

    const tableB = modelB.getters.getCoreTables(modelA.getters.getActiveSheetId())[0];

    expect(tableB).toMatchObject({ range: { zone: toZone("D1:E2") }, type: "static" });
    expect(tableB.config).toEqual(tableA.config);
  });

  test("should copy/paste a cell with the cell content and format copied last from an external spreadsheet", async () => {
    const modelA = await createModel();
    const modelB = await createModel();
    const cellStyle = { bold: true, fillColor: "#00FF00", fontSize: 20 };

    await setCellContent(modelA, "A1", "a1");
    await setFormatting(modelA, "A1", cellStyle);
    await setCellContent(modelB, "C1", "c1");
    await setFormatting(modelB, "C1", cellStyle);

    expect(getCell(modelA, "A1")).toMatchObject({
      content: "a1",
      style: cellStyle,
    });

    expect(getCell(modelB, "C1")).toMatchObject({
      content: "c1",
      style: cellStyle,
    });

    await copy(modelB, "C1");
    await copy(modelA, "A1");
    const clipboardContent = await modelA.getters.getClipboardTextAndImageContent();
    expect(clipboardContent["text/plain"]).toBe("a1");
    const osClipboardContent = await parseOSClipboardContent(clipboardContent);
    await pasteFromOSClipboard(modelB, "B1", osClipboardContent);
    expect(getCell(modelA, "A1")).toMatchObject({
      content: "a1",
    });
    expect(getCell(modelB, "B1")).toMatchObject({
      content: "a1",
    });
    expect(getStyle(modelA, "A1")).toMatchObject(cellStyle);
    expect(getStyle(modelB, "B1")).toMatchObject(cellStyle);
  });

  test("should copy/paste a formula cell with dependencies", async () => {
    const modelA = await createModel({ sheets: [{ id: "sheetA" }] });
    const modelB = await createModel({ sheets: [{ id: "sheetB" }] });

    await setCellContent(modelA, "C1", "=A1*B1");
    await setCellContent(modelA, "C2", "=A2*B2");
    await setCellContent(modelA, "C3", "=A3*B3");

    await copy(modelA, "A1:C3");
    const osClipboardContent = await parseOSClipboardContent(
      await modelA.getters.getClipboardTextAndImageContent()
    );
    await pasteFromOSClipboard(modelB, "E1", osClipboardContent);

    expect(getCellRawContent(modelB, "G1")).toBe("=E1*F1");
    expect(getCellRawContent(modelB, "G2")).toBe("=E2*F2");
    expect(getCellRawContent(modelB, "G3")).toBe("=E3*F3");
  });

  test("can copy/paste cells with escapable content", async () => {
    const modelA = await createModel();
    const modelB = await createModel();

    const escapableString = ` & " < > / \ '`;
    await setCellContent(modelA, "A1", escapableString);
    await copy(modelA, "A1");
    const clipboardContent = await modelA.getters.getClipboardTextAndImageContent();

    expect(clipboardContent["text/plain"]).toBe(escapableString);
    const osClipboardContent = await parseOSClipboardContent(clipboardContent);
    await pasteFromOSClipboard(modelB, "D2", osClipboardContent);
    expect(getCellRawContent(modelA, "A1")).toBe(escapableString);
    expect(getCellRawContent(modelB, "D2")).toBe(escapableString);
  });

  test("o-spreadsheet data from Excel clipboard is ignored", async () => {
    const modelA = await createModel();
    const modelB = await createModel();

    await setCellContent(modelA, "A1", "oldContent");
    await copy(modelA, "A1");
    const cbPlugin = getPlugin(model, ClipboardPlugin);
    const oldHTML = await cbPlugin["getHTMLContent"]();

    let content = parseOSClipboardContent({
      "text/html": `<html xmlns:o="urn:schemas-microsoft-com:office:office">${oldHTML}</body></html>`,
      "text/plain": "newContent",
    });
    await pasteFromOSClipboard(modelB, "D2", content);
    expect(getCellContent(modelB, "D2")).toBe("newContent");

    content = parseOSClipboardContent({
      "text/html": `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>${oldHTML}<div>randomContent</div></body></html>`,
      "text/plain": "newContent",
    });
    await pasteFromOSClipboard(modelB, "D2", content);
    expect(getCellContent(modelB, "D2")).toBe("newContent");
  });

  test("can extract o-spreadsheet clipboard id from HTML without parsing DOM", () => {
    const clipboardId = "1234-uuid";
    expect(
      getOSheetClipboardIdFromHTML(
        `<div data-osheet-clipboard-id='${clipboardId}' data-osheet-clipboard='{}'>x</div>`
      )
    ).toBe(clipboardId);
    expect(getOSheetClipboardIdFromHTML(`<div data-osheet-clipboard='{}'>x</div>`)).toBeUndefined();
  });
});

test("Can use clipboard handlers to paste in a sheet other than the active sheet", async () => {
  model = await createModel();
  const sheetId = model.getters.getActiveSheetId();
  await createSheet(model, { sheetId: "sh2" });

  await setCellContent(model, "A1", "1");
  await addEqualCf(model, "A1", { fillColor: "#FF0000" }, "1");
  await createTable(model, "A1");

  const handlers = clipboardHandlersRegistries.cellHandlers
    .getAll()
    .map((handler) => new handler(model.getters, model.dispatch));

  let copiedData = {};
  const clipboardData = getClipboardDataPositions(sheetId, [toZone("A1")]);
  for (const handler of handlers) {
    copiedData = { ...copiedData, ...handler.copy(clipboardData, false) };
  }

  const pasteTarget: ClipboardPasteTarget = { sheetId: "sh2", zones: target("A1") };
  for (const handler of handlers) {
    handler.paste(pasteTarget, copiedData, { isCutOperation: false });
  }

  expect(getCellContent(model, "A1", "sh2")).toBe("1");
  expect(model.getters.getConditionalFormats(sheetId)).toMatchObject([
    { ranges: ["A1"], rule: { style: { fillColor: "#FF0000" } } },
  ]);
  expect(model.getters.getTables(sheetId)).toMatchObject([{ range: { zone: toZone("A1") } }]);
});
