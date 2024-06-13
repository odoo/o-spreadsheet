import { Model } from "../../src";
import { FIGURE_BORDER_WIDTH } from "../../src/constants";
import { buildSheetLink, toZone } from "../../src/helpers";
import {
  Align,
  BorderDescr,
  ConditionalFormatRule,
  Style,
  VerticalAlign,
  Wrapping,
} from "../../src/types";
import { isXLSXExportXMLFile } from "../../src/xlsx/helpers/xlsx_helper";
import {
  createChart,
  createImage,
  createSheet,
  hideColumns,
  hideRows,
  hideSheet,
  merge,
  renameSheet,
  resizeColumns,
  resizeRows,
  setCellContent,
  setFormat,
  setStyle,
} from "../test_helpers/commands_helpers";
import { getBorder, getCell, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { toRangesData } from "../test_helpers/helpers";

/**
 * Testing to export a model to xlsx then import this xlsx
 *
 * Some side effects of exporting to xlsx then re-importing:
 *  - cols/row without a size will now have a explicitly defined size, close to the default size but not exactly the same (rounding error)
 *  - figure position : at export we add FIGURE_BORDER_WIDTH to the position of the chart, so the charts at 0,0 are nicely displayed
 *          in excel, without their border being hidden below the overlay. We cannot subtract -FIGURE_BORDER_WIDTH at import, as
 *          this could lead to negative coordinates. The position of the figures is thus slightly off when exporting the re-importing.
 *  - charts: datasetHaveTitles boolean is lost. The dataset ranges that will be exported (and re-imported )are the
 *          ranges without the dataset titles (the range minus the first cell of the range) when datasetHaveTitles was true.
 *
 * Some current bugs:
 *  - IconSet CF with icons from different iconsets is badly exported
 *  - trying to export to xlsx a figure alone (without a chart) crash. It's not possible to create an empty figure in practice, but still.
 */

/** */
function exportToXlsxThenImport(model: Model) {
  const exported = model.exportXLSX();
  const dataToImport = {};
  for (let file of exported.files) {
    if (isXLSXExportXMLFile(file)) {
      dataToImport[file.path] = file.content;
      continue;
    }
    dataToImport[file.path] = {
      imageSrc: file.imageSrc,
    };
  }
  const imported = new Model(dataToImport, undefined, undefined, undefined, false);
  return imported;
}

describe("Export data to xlsx then import it", () => {
  let model: Model;
  let sheetId;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Sheet Name", () => {
    renameSheet(model, sheetId, "Renamed");
    const importedModel = exportToXlsxThenImport(model);
    const newSheetId = importedModel.getters.getSheetIdByName("Renamed")!;
    expect(newSheetId).toBeTruthy();
  });

  test("Hidden sheet", () => {
    hideSheet(model, sheetId);
    const importedModel = exportToXlsxThenImport(model);
    expect(importedModel.getters.getSheet(sheetId)).toBeTruthy();
  });

  test("Column size", () => {
    resizeColumns(model, ["A"], 50);
    const importedModel = exportToXlsxThenImport(model);
    expect(importedModel.getters.getColDimensions(sheetId, 0).size).toBeBetween(49.5, 50.5);
  });

  test("row size", () => {
    resizeRows(model, [0], 50);
    const importedModel = exportToXlsxThenImport(model);
    expect(importedModel.getters.getRowDimensions(sheetId, 0).size).toEqual(50);
  });

  test("Hidden col/row", () => {
    hideColumns(model, ["A"]);
    hideRows(model, [0]);
    const importedModel = exportToXlsxThenImport(model);
    expect(importedModel.getters.isColHidden(sheetId, 0)).toBeTruthy();
    expect(importedModel.getters.isRowHidden(sheetId, 0)).toBeTruthy();
  });

  test("Cell content", () => {
    setCellContent(model, "A1", "0");
    setCellContent(model, "A2", "=A1");
    setCellContent(model, "A3", "text");
    const importedModel = exportToXlsxThenImport(model);
    expect(getCell(importedModel, "A1")!.content).toEqual("0");
    expect(getCell(importedModel, "A2")!.content).toEqual("=A1");
    expect(getCell(importedModel, "A3")!.content).toEqual("text");
  });

  test.each([
    { textColor: "#FFFF00" },
    { fontSize: 18 },
    { bold: true, underline: true, italic: true, strikethrough: true },
    { align: "right" as Align },
    { verticalAlign: "top" as VerticalAlign },
    { fillColor: "#151515" },
    { wrapping: "wrap" as Wrapping },
  ])("Cell style %s", (style: Style) => {
    setStyle(model, "A1", style);
    const importedModel = exportToXlsxThenImport(model);
    expect(getCell(importedModel, "A1")!.style).toMatchObject(style);
  });

  test("Cell border", () => {
    const descr: BorderDescr = { style: "thin", color: "#000000" };
    const border = { bottom: descr, top: descr, left: descr, right: descr };
    model.dispatch("SET_BORDER", {
      sheetId,
      col: 0,
      row: 0,
      border,
    });
    const importedModel = exportToXlsxThenImport(model);
    expect(getBorder(importedModel, "A1")).toEqual(border);
  });

  test.each(["0.00%", "#,##0.00", "m/d/yyyy", "m/d/yyyy hh:mm:ss", "#,##0.00 [$€]"])(
    "Cell format %s",
    (format: string) => {
      setFormat(model, "A1", format);
      const importedModel = exportToXlsxThenImport(model);
      expect(importedModel.getters.getEvaluatedCell({ sheetId, col: 0, row: 0 }).format).toEqual(
        format
      );
    }
  );

  test("merges", () => {
    merge(model, "A1:B5");
    const importedModel = exportToXlsxThenImport(model);
    expect(importedModel.getters.getMerges(sheetId)).toMatchObject([toZone("A1:B5")]);
  });

  test.each([
    {
      values: ["42"],
      operator: "Equal" as const,
      type: "CellIsRule" as const,
      style: {
        fillColor: "#FF9900",
      },
    },
    {
      type: "ColorScaleRule" as const,
      minimum: {
        type: "value" as const,
        color: 16777215,
      },
      maximum: {
        type: "value" as const,
        color: 16711680,
      },
    },
    {
      type: "IconSetRule" as const,
      upperInflectionPoint: {
        type: "percentage" as const,
        value: "66",
        operator: "gt" as const,
      },
      lowerInflectionPoint: {
        type: "percentage" as const,
        value: "33",
        operator: "gt" as const,
      },
      icons: {
        upper: "arrowGood",
        middle: "arrowNeutral",
        lower: "arrowBad",
      },
    },
  ])("Conditional formats %s", (rule: ConditionalFormatRule) => {
    const cf = {
      id: "1",
      rule,
    };
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf,
      ranges: toRangesData(sheetId, "A1:A3"),
      sheetId,
    });
    const importedModel = exportToXlsxThenImport(model);
    expect(importedModel.getters.getRulesByCell(sheetId, 0, 0).values().next().value).toMatchObject(
      cf
    );
  });

  test("figure", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
        labelRange: "Sheet1!A2:A4",
        type: "line",
      },
      "1"
    );
    const figure = model.getters.getFigures(sheetId)[0];
    const importedModel = exportToXlsxThenImport(model);
    const importedFigure = importedModel.getters.getFigures(sheetId)[0];
    expect(importedFigure.height).toEqual(figure.height);
    expect(importedFigure.width).toBeBetween(figure.width - 1, figure.width + 1);
    // See explanation at the top of the file for +FIGURE_BORDER_WIDTH
    expect(importedFigure.x).toEqual(figure.x + FIGURE_BORDER_WIDTH);
    expect(importedFigure.y).toEqual(figure.y + FIGURE_BORDER_WIDTH);
  });

  test.each([
    {
      title: { text: "demo chart" },
      dataSets: [{ dataRange: "Sheet1!B26:B35" }, { dataRange: "Sheet1!C26:C35" }],
      labelRange: "Sheet1!A27:A35",
      type: "line" as const,
      dataSetsHaveTitle: false,
      background: "#FFFFFF",
      legendPosition: "top" as const,
      stacked: false,
      labelsAsText: false,
    },
    {
      title: { text: "demo chart 2" },
      dataSets: [{ dataRange: "Sheet1!B27:B35" }, { dataRange: "Sheet1!C27:C35" }],
      labelRange: "Sheet1!A27:A35",
      type: "bar" as const,
      dataSetsHaveTitle: false,
      background: "#AAAAAA",
      legendPosition: "bottom" as const,
      stacked: true,
    },
    {
      title: { text: "pie demo chart" },
      dataSets: [{ dataRange: "Sheet1!B26:B35" }, { dataRange: "Sheet1!C26:C35" }],
      labelRange: "Sheet1!A27:A35",
      type: "pie" as const,
      dataSetsHaveTitle: false,
      background: "#FFFFFF",
      legendPosition: "right" as const,
      stacked: false,
    },
    {
      title: { text: "demo chart4" },
      dataSets: [{ dataRange: "Sheet1!B26:B35" }, { dataRange: "Sheet1!C26:C35" }],
      labelRange: "Sheet1!A27:A35",
      type: "line" as const,
      dataSetsHaveTitle: false,
      background: "#FFFFFF",
      legendPosition: "top" as const,
      stacked: true,
      labelsAsText: false,
    },
    {
      title: { text: "demo chart 5" },
      dataSets: [{ dataRange: "Sheet1!B27:B35" }, { dataRange: "Sheet1!C27:C35" }],
      labelRange: "Sheet1!A27:A35",
      type: "combo" as const,
      dataSetsHaveTitle: false,
      background: "#AAAAAA",
      legendPosition: "bottom" as const,
      stacked: true,
    },
    {
      title: { text: "demo chart6" },
      dataSets: [{ dataRange: "Sheet1!B26:B35" }, { dataRange: "Sheet1!C26:C35" }],
      labelRange: "Sheet1!A27:A35",
      type: "radar" as const,
      dataSetsHaveTitle: false,
      background: "#FFFFFF",
      legendPosition: "top" as const,
      labelsAsText: false,
    },
  ])("Charts %s", (chartDef: any) => {
    createChart(model, chartDef, "1");
    chartDef = model.getters.getChartDefinition("1");
    const importedModel = exportToXlsxThenImport(model);
    const newChartId = importedModel.getters.getChartIds(sheetId)[0];
    const newChart = importedModel.getters.getChartDefinition(newChartId);
    expect(newChart).toMatchObject(chartDef);
  });

  test("hyperlinks", () => {
    createSheet(model, { sheetId: "42", name: "she!et2" });
    const sheetLink = buildSheetLink("42");
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const importedModel = exportToXlsxThenImport(model);
    const cell = getEvaluatedCell(importedModel, "A1");
    const newSheetId = importedModel.getters.getSheetIdByName("she!et2");
    const sheetLink2 = buildSheetLink(newSheetId!);
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink2);
  });

  test("Image", () => {
    createImage(model, {
      figureId: "1",
      size: {
        width: 300,
        height: 400,
      },
    });
    const imageDefinition = model.getters.getImage("1");
    const importedModel = exportToXlsxThenImport(model);

    const newFigure = importedModel.getters.getFigures(sheetId)[0];
    const newImage = importedModel.getters.getImage(newFigure.id);
    expect(newImage.path).toEqual(imageDefinition.path);
    expect(newFigure.width).toBe(300);
    expect(newFigure.height).toBe(400);
  });
});
