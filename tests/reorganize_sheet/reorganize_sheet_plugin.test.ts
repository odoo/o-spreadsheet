import { CellPosition, CommandResult, Figure, Model, UID } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import {
  numberToLetters,
  positionToZone,
  range,
  toZone,
  unionPositionsToZone,
  zoneToXc,
} from "../../src/helpers";
import { REORGANIZE_CONSTANTS } from "../../src/plugins/ui_feature/reorganize_sheet";
import {
  createChart,
  createGaugeChart,
  createScorecardChart,
  createSheet,
  createTable,
  merge,
  resizeColumns,
  resizeRows,
  setBorders,
  setCellContent,
  setSelection,
  setStyle,
} from "../test_helpers/commands_helpers";
import { getBorder, getCell, getCellContent } from "../test_helpers/getters_helpers";
import { createEqualCF, getFigureIds, toRangesData } from "../test_helpers/helpers";
import { TEST_CHART_DATA } from "./../test_helpers/constants";

const constants = REORGANIZE_CONSTANTS;

let model: Model;
let sheetId: UID;

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
  createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
});

// During the cut paste, a figure with a new Id is created, so we can use the figure chart title to identify the figure instead
function getFigureWithTitle(sheetId: UID, title: string): Figure | undefined {
  const figures = model.getters.getFigures(sheetId);
  return figures.find((figure) => model.getters.getChartDefinition(figure.id).title.text === title);
}

describe("Send selection to sheet", () => {
  beforeEach(() => {
    createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
  });

  test("Can send the selection to another sheet as a table", () => {
    setCellContent(model, "A1", "A");
    setCellContent(model, "B2", "B");
    setSelection(model, ["A1:B2"]);

    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet2" });

    expect(model.getters.getActiveSheetId()).toEqual(sheetId);
    expect(getCellContent(model, "A1", sheetId)).toEqual("");
    expect(getCellContent(model, "B2", sheetId)).toEqual("");
    expect(getCellContent(model, "A1", "Sheet2")).toEqual("A");
    expect(getCellContent(model, "B2", "Sheet2")).toEqual("B");

    expect(zoneToXc(model.getters.getTables("Sheet2")[0].range.zone)).toEqual("A1:B2");
  });

  test("Range is inserted below existing cells", () => {
    setCellContent(model, "A1", "A");
    setCellContent(model, "A5", "content", "Sheet2");
    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet2" });

    expect(getCellContent(model, "A7", "Sheet2")).toEqual("A");
  });

  test("Range is inserted below existing figure", () => {
    createChart(
      model,
      {
        type: "bar",
        position: { x: 0, y: 0 },
        size: { width: 100, height: DEFAULT_CELL_HEIGHT * 2 },
      },
      "chartId",
      "Sheet2"
    );
    setCellContent(model, "A1", "A");
    setSelection(model, ["A1:B2"]);
    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet2" });

    expect(getCellContent(model, "A5", "Sheet2")).toEqual("A");
  });

  test("Range is inserted below existing table", () => {
    setCellContent(model, "A1", "A");
    createTable(model, "A1:B2", undefined, "static", "Sheet2");

    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet2" });
    expect(getCellContent(model, "A4", "Sheet2")).toEqual("A");
  });

  test("Range is inserted below existing merges", () => {
    setCellContent(model, "A1", "A");
    merge(model, "A1:B2", "Sheet2");

    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet2" });
    expect(getCellContent(model, "A4", "Sheet2")).toEqual("A");
  });

  test("Range is inserted below existing borders", () => {
    setCellContent(model, "A1", "A");
    setBorders(model, "B5", { top: { style: "thick", color: "#000000" } }, "Sheet2");

    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet2" });
    expect(getCellContent(model, "A7", "Sheet2")).toEqual("A");
  });

  test("If the range is a table, the table style is preserved", () => {
    createTable(model, "A1:B2", { styleId: "TableStyleLight9" });
    setSelection(model, ["A1:B2"]);
    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet2" });

    expect(model.getters.getTables("Sheet2")[0].config.styleId).toEqual("TableStyleLight9");
  });

  test("Formulas referencing a range are adapted", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "C1", "=A1");

    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet2" });
    expect(getCell(model, "C1")?.content).toEqual("=Sheet2!A1");
  });

  test("New rows are created if there is no space to insert below the bottomMost cell", () => {
    setCellContent(model, "A1", "A");
    setCellContent(model, "A10", "B");
    setCellContent(model, "A100", "content", "Sheet2");
    setSelection(model, ["A1:A10"]);

    expect(model.getters.getNumberRows("Sheet2")).toEqual(100);
    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet2" });
    expect(model.getters.getNumberRows("Sheet2")).toEqual(111);

    expect(getCellContent(model, "A102", "Sheet2")).toEqual("A");
    expect(getCellContent(model, "A111", "Sheet2")).toEqual("B");
  });

  test("New cols are created if there is no space in the target sheet", () => {
    createSheet(model, { sheetId: "Sheet3", cols: 5 });
    setCellContent(model, "A1", "A");
    setCellContent(model, "Z1", "Z");
    setSelection(model, ["A1:Z1"]);

    expect(model.getters.getNumberCols("Sheet3")).toEqual(5);
    model.dispatch("SEND_SELECTION_TO_SHEET", { sheetId: "Sheet3" });
    expect(model.getters.getNumberCols("Sheet3")).toEqual(26);

    expect(getCellContent(model, "A1", "Sheet3")).toEqual("A");
    expect(getCellContent(model, "Z1", "Sheet3")).toEqual("Z");
  });
});

describe("Send Figure to sheet", () => {
  beforeEach(() => {
    createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
  });

  test("Cannot send unknown figure to a sheet", () => {
    const result = model.dispatch("SEND_FIGURE_TO_SHEET", { sheetId, figureId: "doesNotExist" });
    expect(result).toBeCancelledBecause(CommandResult.FigureDoesNotExist);
  });

  test("Can send a figure to another sheet", () => {
    const definition = TEST_CHART_DATA.basicChart;
    createChart(model, definition, "figureId");
    model.dispatch("SEND_FIGURE_TO_SHEET", { sheetId: "Sheet2", figureId: "figureId" });

    expect(model.getters.getActiveSheetId()).toEqual(sheetId);
    expect(model.getters.getFigures(sheetId)).toHaveLength(0);
    const figureIds = getFigureIds(model, "Sheet2");
    expect(figureIds).toHaveLength(1);
    expect(model.getters.getChartDefinition(figureIds[0])).toMatchObject({
      ...definition,
      labelRange: "Sheet1!" + definition.labelRange,
      dataSets: definition.dataSets.map((dataSet) => ({
        dataRange: "Sheet1!" + dataSet.dataRange,
      })),
    });
  });

  test("Figure is inserted below existing figures in target sheet", () => {
    createChart(model, { type: "bar", size: { width: 200, height: 200 } }, "figureId", sheetId);
    createChart(
      model,
      {
        type: "bar",
        position: { x: 0, y: 0 },
        size: { width: 100, height: DEFAULT_CELL_HEIGHT * 2 },
      },
      "chartId",
      "Sheet2"
    );
    model.dispatch("SEND_FIGURE_TO_SHEET", { sheetId: "Sheet2", figureId: "figureId" });

    expect(model.getters.getFigures("Sheet2")[1]).toMatchObject({
      x: 0,
      y: DEFAULT_CELL_HEIGHT * 4,
      width: 200,
      height: 200,
    });
  });

  test("Figure is inserted below exiting cells in target sheet", () => {
    createChart(model, { type: "bar" }, "figureId", sheetId);
    setCellContent(model, "A3", "A", "Sheet2");
    model.dispatch("SEND_FIGURE_TO_SHEET", { sheetId: "Sheet2", figureId: "figureId" });

    expect(model.getters.getFigures("Sheet2")[0]).toMatchObject({ y: DEFAULT_CELL_HEIGHT * 4 });
  });

  test("New rows are created if there is no space to insert to figure", () => {
    createChart(
      model,
      { type: "bar", size: { height: 5 * DEFAULT_CELL_HEIGHT, width: 5 * DEFAULT_CELL_WIDTH } },
      "figureId",
      sheetId
    );
    setCellContent(model, "A100", "content", "Sheet2");

    expect(model.getters.getNumberRows("Sheet2")).toEqual(100);
    model.dispatch("SEND_FIGURE_TO_SHEET", { sheetId: "Sheet2", figureId: "figureId" });

    expect(model.getters.getNumberRows("Sheet2")).toEqual(106);
    expect(model.getters.getFigures("Sheet2")[0]).toMatchObject({ y: DEFAULT_CELL_HEIGHT * 101 });
  });
});

describe("Reorganize sheet", () => {
  function createCellCluster(xc: string, value: string) {
    const zone = toZone(xc);
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        setCellContent(model, zoneToXc(positionToZone({ col, row })), value);
      }
    }
  }

  function getCellsClusters(sheetId: UID) {
    const clusters: Record<string, CellPosition[]> = {};
    for (const position of model.getters.getEvaluatedCellsPositions(sheetId)) {
      const cell = model.getters.getEvaluatedCell(position);
      if (!clusters[cell.formattedValue]) {
        clusters[cell.formattedValue] = [];
      }
      clusters[cell.formattedValue].push(position);
    }

    const result: Record<string, string> = {};
    for (const clusterKey in clusters) {
      result[clusterKey] = zoneToXc(unionPositionsToZone(clusters[clusterKey]));
    }
    return result;
  }

  test("Can reorganize scorecards", () => {
    createScorecardChart(model, {});
    createScorecardChart(model, {});
    createScorecardChart(model, {});
    createScorecardChart(model, {});

    model.dispatch("REORGANIZE_SHEET");

    const figures = model.getters.getFigures(sheetId);

    const width = (constants.maxWidth - 3 * constants.scorecardMargin) / 4;
    const height = constants.figureHeight / 2;
    const margin = constants.scorecardMargin;
    expect(figures[0]).toMatchObject({ x: 0, y: 0, width, height });
    expect(figures[1]).toMatchObject({ x: width + margin, y: 0, width, height });
    expect(figures[2]).toMatchObject({ x: 2 * (width + margin), y: 0, width, height });
    expect(figures[3]).toMatchObject({ x: 3 * (width + margin), y: 0, width, height });
  });

  test("Scorecards are separated in lines if they are too many", () => {
    for (let i = 0; i < constants.scorecardsPerLine + 2; i++) {
      createScorecardChart(model, {});
    }
    model.dispatch("REORGANIZE_SHEET");

    const figures = model.getters.getFigures(sheetId);
    for (let i = 0; i < figures.length; i++) {
      if (i < constants.scorecardsPerLine) {
        expect(figures[i].y).toEqual(0);
      } else {
        expect(figures[i].y).toEqual(constants.figureHeight / 2 + constants.figureBottomMargin);
      }
    }
  });

  test("Can reorganize figures into two columns", () => {
    createChart(model, TEST_CHART_DATA.basicChart);
    createChart(model, TEST_CHART_DATA.basicChart);
    createChart(model, TEST_CHART_DATA.combo);
    createGaugeChart(model, TEST_CHART_DATA.gauge);

    model.dispatch("REORGANIZE_SHEET");

    const figures = model.getters.getFigures(sheetId);
    const rightColFigureX = constants.maxWidth - constants.smallFigureWidth;
    const height = constants.figureHeight;
    const width = constants.smallFigureWidth;
    const yMargin = constants.figureBottomMargin;
    expect(figures[0]).toMatchObject({ x: 0, y: 0, width, height });
    expect(figures[1]).toMatchObject({ x: rightColFigureX, y: 0, width, height });
    expect(figures[2]).toMatchObject({ x: 0, y: height + yMargin, width, height });
    expect(figures[3]).toMatchObject({ x: rightColFigureX, y: height + yMargin, width, height });
  });

  test("If there are an odd number fo figures, the last one will span the whole line", () => {
    createChart(model, TEST_CHART_DATA.basicChart);
    createChart(model, TEST_CHART_DATA.basicChart);
    createChart(model, TEST_CHART_DATA.basicChart);

    model.dispatch("REORGANIZE_SHEET");

    expect(model.getters.getFigures(sheetId)[2]).toMatchObject({ width: constants.maxWidth });
  });

  test("Figures with a lot of data will span the whole line", () => {
    createChart(model, { type: "bar", dataSets: [{ dataRange: "A1:A20" }] });
    createChart(model, TEST_CHART_DATA.basicChart);
    model.dispatch("REORGANIZE_SHEET");

    expect(model.getters.getFigures(sheetId)[0]).toMatchObject({
      width: constants.maxWidth,
    });
  });

  test("Scorecards are placed above other figures", () => {
    createScorecardChart(model, { title: { text: "scorecard1" } });
    createChart(model, { type: "line", title: { text: "chart1" } });
    createScorecardChart(model, { title: { text: "scorecard2" } });
    createChart(model, { type: "bar", title: { text: "chart2" } });
    model.dispatch("REORGANIZE_SHEET");

    const scorecardWidth = (constants.maxWidth - constants.scorecardMargin) / 2;
    expect(getFigureWithTitle(sheetId, "scorecard1")).toMatchObject({ x: 0, y: 0 });
    expect(getFigureWithTitle(sheetId, "scorecard2")).toMatchObject({
      x: scorecardWidth + constants.scorecardMargin,
      y: 0,
    });
    expect(getFigureWithTitle(sheetId, "chart1")).toMatchObject({
      x: 0,
      y: constants.figureHeight / 2 + constants.figureBottomMargin,
    });
    expect(getFigureWithTitle(sheetId, "chart2")).toMatchObject({
      x: constants.smallFigureWidth + constants.smallFigureMargin,
      y: constants.figureHeight / 2 + constants.figureBottomMargin,
    });
  });

  test("Can reorganize cell clusters", () => {
    createCellCluster("A1:B2", "cl1");
    createCellCluster("A4:B5", "cl2");
    createCellCluster("A7:B8", "cl3");
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellsClusters(sheetId)).toEqual({
      cl1: "A1:B2",
      cl2: "D1:E2",
      cl3: "G1:H2",
    });
  });

  test("Large clusters are placed first", () => {
    createCellCluster("A6:B7", "cl2");
    createCellCluster("A1:D4", "cl1");
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellsClusters(sheetId)).toEqual({
      cl1: "A1:D4",
      cl2: "F1:G2",
    });
  });

  test("Clusters are placed on multiple rows if there is not enough space", () => {
    resizeColumns(model, range(0, 20).map(numberToLetters), constants.maxWidth / 10); // 10 cells max per row (col J)

    createCellCluster("A1:D2", "cl1");
    createCellCluster("A4:I6", "cl2");
    createCellCluster("A8:E9", "cl3");
    createCellCluster("A11", "cl4");
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellsClusters(sheetId)).toEqual({
      cl2: "A1:I3",
      cl3: "A6:E7",
      cl1: "G6:J7",
      cl4: "A10",
    });
  });

  test("Formulas are adapted during reorganization", () => {
    createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
    setCellContent(model, "D5", "1");
    setCellContent(model, "A1", "=Sheet1!D5", "Sheet2");
    setCellContent(model, "C1", "=D5");
    model.dispatch("REORGANIZE_SHEET");

    expect(getCell(model, "A1")?.content).toEqual("=C1");
    expect(getCell(model, "C1")?.content).toEqual("1");
    expect(getCell(model, "A1", "Sheet2")?.content).toEqual("=Sheet1!C1");
  });

  test("Formula referencing an empty range do not become an error during reorganization", () => {
    createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
    setCellContent(model, "B1", "9");
    setCellContent(model, "C1", "=D5 + B1");
    setCellContent(model, "A1", "=Sheet1!D5 + Sheet1!B1", "Sheet2");

    model.dispatch("REORGANIZE_SHEET");
    expect(getCell(model, "A1")?.content).toEqual("9");
    expect(getCell(model, "B1")?.content).toEqual("=D5 + A1");
    expect(getCell(model, "A1", "Sheet2")?.content).toEqual("=Sheet1!D5 + Sheet1!A1");
  });

  test("Styles are kept during reorganization", () => {
    setCellContent(model, "C1", "1");
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#DC6CDF" }, "1"),
      ranges: toRangesData(sheetId, "C1"),
      sheetId,
    });
    setStyle(model, "C1", { bold: true });
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellContent(model, "A1")).toEqual("1");
    expect(getCell(model, "A1")?.style?.bold).toBeTruthy();
    expect(model.getters.getConditionalFormats(sheetId)).toMatchObject([{ ranges: ["A1"] }]);
  });

  test("Borders are kept during reorganization", () => {
    setCellContent(model, "C1", "1");
    setBorders(model, "C1", { top: { style: "thick", color: "#000000" } });
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellContent(model, "A1")).toEqual("1");
    expect(getBorder(model, "A1")).toEqual({ top: { style: "thick", color: "#000000" } });
  });

  test("Array formulas are included in clusters", () => {
    setCellContent(model, "A1", "=MUNIT(2)");
    setCellContent(model, "E10", "=MUNIT(3)");
    setCellContent(model, "H10", "textNextToArrayResult");

    model.dispatch("REORGANIZE_SHEET");
    expect(getCell(model, "A1")?.content).toEqual("=MUNIT(3)");
    expect(getCell(model, "D1")?.content).toEqual("textNextToArrayResult");
    expect(getCell(model, "F1")?.content).toEqual("=MUNIT(2)");
  });

  test("Merges are included in clusters", () => {
    merge(model, "B8:D10");
    setCellContent(model, "A8", "nextToMerge");
    merge(model, "E5:F6");
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellContent(model, "A1")).toEqual("nextToMerge");
    expect(model.getters.getMerges(sheetId)).toMatchObject([toZone("B1:D3"), toZone("F1:G2")]);
  });

  test("Tables are included in clusters", () => {
    createTable(model, "B8:D10");
    setCellContent(model, "A8", "nextToMerge");
    createTable(model, "E5:F6");
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellContent(model, "A1")).toEqual("nextToMerge");
    const tableZones = model.getters.getTables(sheetId).map((table) => zoneToXc(table.range.zone));
    expect(tableZones).toMatchObject(["B1:D3", "F1:G2"]);
  });

  test("Empty cells with fill color are included in clusters", () => {
    setCellContent(model, "B2", "1");
    setStyle(model, "C2", { fillColor: "#DC6CDF" });
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellContent(model, "A1")).toEqual("1");
    expect(getCell(model, "B1")?.style?.fillColor).toEqual("#DC6CDF");
  });

  test("Empty cells with style difference than fill color are not included in clusters", () => {
    setCellContent(model, "B2", "1");
    setStyle(model, "C2", { bold: true });
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellContent(model, "A1")).toEqual("1");
    expect(getCell(model, "B1")?.style?.bold).not.toEqual(true);
  });

  test("Cells diagonally next to each other are not in the same cluster", () => {
    setCellContent(model, "A1", "cl1");
    setCellContent(model, "B2", "cl2");
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellsClusters(sheetId)).toEqual({ cl1: "A1", cl2: "C1" });
  });

  test("Cell clusters are positioned below the figures", () => {
    createChart(model, { type: "bar", position: { x: 0, y: 200 } });
    createCellCluster("A1", "cl1");
    model.dispatch("REORGANIZE_SHEET");

    expect(model.getters.getFigures(sheetId)[0]).toMatchObject({
      y: 0,
      height: constants.figureHeight,
    });
    const chartBottomRow = Math.ceil(constants.figureHeight / DEFAULT_CELL_HEIGHT);
    const expectedPosition = { col: 0, row: chartBottomRow + constants.clusterRowsMargin };
    expect(getCellsClusters(sheetId)).toEqual({ cl1: zoneToXc(positionToZone(expectedPosition)) });
  });

  test("Having cells at the bottom of the sheet with style/custom size do not pollute the reorganization", () => {
    setCellContent(model, "B2", "1");
    setStyle(model, "A100", { textColor: "#DC6CDF" });
    resizeRows(model, [99], 56);
    model.dispatch("REORGANIZE_SHEET");

    expect(getCellContent(model, "A1")).toEqual("1");
    expect(getCell(model, "A1")?.style?.textColor).toBeUndefined();
    expect(model.getters.getRowSize(sheetId, 0)).toEqual(DEFAULT_CELL_HEIGHT);
  });
});
