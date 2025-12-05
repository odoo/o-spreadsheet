import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
} from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ChartDefinition, CustomizedDataSet, Model } from "../../../src";
import { toXC, zoneToXc } from "../../../src/helpers";
import { toChartDataSource } from "../../test_helpers/chart_helpers";
import {
  addColumns,
  addRows,
  freezeColumns,
  freezeRows,
  setCellContent,
  setSelection,
} from "../../test_helpers/commands_helpers";
import {
  doAction,
  makeTestEnv,
  mockChart,
  mountSpreadsheet,
  nextTick,
  spyModelDispatch,
} from "../../test_helpers/helpers";

describe("Insert chart menu item", () => {
  const data = {
    sheets: [
      {
        name: "Sheet1",
        rows: {},
        cells: {
          A2: "P1",
          A3: "P2",
          A4: "P3",
          A5: "P4",

          B1: "first column dataset",
          B2: "10",
          B3: "11",
          B4: "12",
          B5: "13",

          C1: "",
          C2: "2",
          C3: "4",
          C4: "6",

          D1: "=sum()",
          D2: "3",
          D3: "2",
          D4: "5",

          E1: "Title1",
          E2: "10",
          E3: "11",
          E4: "12",

          F1: "=sum(1,2)",
          F2: "7",
          F3: "8",
          F4: "9",

          G1: "",
          G2: "7",
          G3: "8",
          G4: "9",

          H1: "Title2",
          H2: "7",
          H3: "8",
          H4: "9",
        },
      },
    ],
  };

  let dispatchSpy: jest.SpyInstance;
  let defaultPayload: any;
  let model: Model;
  let env: SpreadsheetChildEnv;
  let openSidePanelSpy: jest.Mock<any, any>;

  function insertChart() {
    doAction(["insert", "insert_chart"], env);
  }

  async function mountTestSpreadsheet() {
    ({ model, env } = await mountSpreadsheet({ model: new Model(data) }));
    dispatchSpy = spyModelDispatch(model);
  }

  beforeEach(async () => {
    openSidePanelSpy = jest.fn();
    env = makeTestEnv({
      model: new Model(data),
      openSidePanel: (type, props) => openSidePanelSpy(type, props),
    });
    model = env.model;

    mockChart();
    dispatchSpy = spyModelDispatch(model);
    defaultPayload = {
      col: expect.any(Number),
      row: expect.any(Number),
      offset: expect.any(Object),
      size: expect.any(Object),
      figureId: expect.any(String),
      chartId: expect.any(String),
      sheetId: expect.any(String),
      definition: {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1", yAxisId: "y" }],
          dataSetsHaveTitle: false,
        }),
        stacked: false,
        legendPosition: "none",
        title: {},
        type: "bar",
        humanize: true,
      },
    };
  });

  test("Chart is inserted at correct position", () => {
    setSelection(model, ["B2"]);
    insertChart();
    const { width, height } = model.getters.getSheetViewDimension();
    const figureUI = model.getters.getVisibleFigures()[0];

    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    const x = (width - figureUI.width) / 2;
    const y = (height - figureUI.height) / 2;
    payload.offset = {
      x: x % DEFAULT_CELL_WIDTH,
      y: y % DEFAULT_CELL_HEIGHT,
    };
    (payload.col = Math.floor(x / DEFAULT_CELL_WIDTH)),
      (payload.row = Math.floor(y / DEFAULT_CELL_HEIGHT)),
      expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    expect(figureUI).toMatchObject({ x, y });
  });

  test("Chart is selected and focused at insertion", async () => {
    await mountTestSpreadsheet();
    setSelection(model, ["B2"]);
    insertChart();
    const figureId = model.getters.getFigures(model.getters.getActiveSheetId())[0].id;
    expect(dispatchSpy).toHaveBeenCalledWith("SELECT_FIGURE", { figureId });
    await nextTick();
    expect(document.activeElement?.classList).toContain("o-figure");
  });

  test("Chart side panel was opened at chart insertion", () => {
    setSelection(model, ["B2"]);
    insertChart();
    expect(openSidePanelSpy).toHaveBeenCalledWith("ChartPanel", undefined);
  });

  test("Chart is inserted at correct position for rows freeze", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeRows(model, 5, sheetId);
    setSelection(model, ["B2"]);
    insertChart();
    const { width, height } = model.getters.getSheetViewDimension();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.offset = {
      x: 40,
      y: 10.5,
    };
    payload.col = 2;
    payload.row = 14;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    const figureUI = model.getters.getVisibleFigures()[0];
    expect({ x: figureUI.x, y: figureUI.y }).toStrictEqual({
      x: (width - figureUI.width) / 2,
      y: (height - figureUI.height) / 2,
    });
  });

  test("Chart is inserted at correct position inside bottomRight pane for columns freeze", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    setSelection(model, ["B2"]);
    insertChart();
    const { width, height } = model.getters.getSheetViewDimension();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.offset = {
      x: 40,
      y: 10.5,
    };
    payload.col = 2;
    payload.row = 14; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    const figureUI = model.getters.getVisibleFigures()[0];
    expect({ x: figureUI.x, y: figureUI.y }).toStrictEqual({
      x: (width - figureUI.width) / 2,
      y: (height - figureUI.height) / 2,
    });
  });

  test("Chart is inserted at correct position inside bottomRight pane for both freeze", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    freezeRows(model, 5, sheetId);
    setSelection(model, ["B2"]);
    insertChart();
    const { width, height } = model.getters.getSheetViewDimension();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.offset = {
      x: 40,
      y: 10.5,
    };
    payload.col = 2;
    payload.row = 14; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    const figureUI = model.getters.getVisibleFigures()[0];
    expect({ x: figureUI.x, y: figureUI.y }).toStrictEqual({
      x: (width - figureUI.width) / 2,
      y: (height - figureUI.height) / 2,
    });
  });

  test("Chart is inserted at the top left of the viewport when too small", () => {
    setSelection(model, ["B2"]);
    model.dispatch("RESIZE_SHEETVIEW", {
      width: DEFAULT_FIGURE_WIDTH / 2,
      height: DEFAULT_FIGURE_HEIGHT / 2,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.offset = {
      x: 0,
      y: 0,
    };
    payload.col = 0;
    payload.row = 0;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    const figureUI = model.getters.getVisibleFigures()[0];
    expect({ x: figureUI.x, y: figureUI.y }).toStrictEqual({
      x: 0,
      y: 0,
    });
  });

  test("Chart is inserted inside frozen pane if middle is frozen pane", () => {
    addRows(model, "before", 0, 100);
    setSelection(model, ["B2"]);
    model.dispatch("RESIZE_SHEETVIEW", {
      width: DEFAULT_FIGURE_WIDTH * 1.5,
      height: DEFAULT_FIGURE_HEIGHT * 1.5,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    const { bottom, right } = model.getters.getActiveMainViewport();
    freezeColumns(model, Math.floor(right / 2));
    freezeRows(model, Math.floor(bottom / 2));
    insertChart();
    const { width, height } = model.getters.getSheetViewDimension();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.offset = {
      x: 38,
      y: 14.75,
    };
    payload.col = 1;
    payload.row = 3; // Position inside frozen pane
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    const figureUI = model.getters.getVisibleFigures()[0];
    expect({ x: figureUI.x, y: figureUI.y }).toStrictEqual({
      x: (width - figureUI.width) / 2,
      y: (height - figureUI.height) / 2,
    });
  });

  test("Chart is inserted at correct position on a scrolled viewport", () => {
    setSelection(model, ["B2:B3"]);
    const { width, height } = env.model.getters.getSheetViewDimension();
    addColumns(model, "after", "D", 100);
    addRows(model, "after", 4, 100);
    env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 2 * DEFAULT_CELL_WIDTH,
      offsetY: 4 * DEFAULT_CELL_HEIGHT,
    });
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.offset = {
      x: 40,
      y: 10.5,
    };
    payload.col = 4;
    payload.row = 18; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    const figureUI = model.getters.getVisibleFigures()[0];
    expect({ x: figureUI.x, y: figureUI.y }).toStrictEqual({
      x: 2 * DEFAULT_CELL_WIDTH + (width - figureUI.width) / 2,
      y: 4 * DEFAULT_CELL_HEIGHT + (height - figureUI.height) / 2,
    });
  });

  test("Chart is inserted at correct position on a scrolled viewport with frozen rows", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeRows(model, 5, sheetId);
    setSelection(model, ["B2:B3"]);
    const { width, height } = model.getters.getSheetViewDimension();
    addColumns(model, "after", "D", 100);
    addRows(model, "after", 4, 100);
    env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 2 * DEFAULT_CELL_WIDTH,
      offsetY: 4 * DEFAULT_CELL_HEIGHT,
    });
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.offset = {
      x: 40,
      y: 10.5,
    };
    payload.col = 4;
    payload.row = 18; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    const figureUI = model.getters.getVisibleFigures()[0];
    expect({ x: figureUI.x, y: figureUI.y }).toStrictEqual({
      x: 2 * DEFAULT_CELL_WIDTH + (width - figureUI.width) / 2,
      y: 4 * DEFAULT_CELL_HEIGHT + (height - figureUI.height) / 2,
    });
  });

  test("Chart is inserted at correct position on a scrolled viewport with columns frozen", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    setSelection(model, ["B2:B3"]);
    const { width, height } = model.getters.getSheetViewDimension();
    addColumns(model, "after", "D", 100);
    addRows(model, "after", 4, 100);
    env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 2 * DEFAULT_CELL_WIDTH,
      offsetY: 4 * DEFAULT_CELL_HEIGHT,
    });
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.offset = {
      x: 40,
      y: 10.5,
    };
    payload.col = 2;
    payload.row = 18; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    const figureUI = model.getters.getVisibleFigures()[0];
    expect({ x: figureUI.x, y: figureUI.y }).toStrictEqual({
      x: (width - figureUI.width) / 2, // figure is inside left frozen pane
      y: 4 * DEFAULT_CELL_HEIGHT + (height - figureUI.height) / 2,
    });
  });

  test("Chart is inserted at correct position on a scrolled viewport with both directions frozen", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    freezeRows(model, 5, sheetId);
    setSelection(model, ["B2:B3"]);
    const { width, height } = model.getters.getSheetViewDimension();
    addColumns(model, "after", "D", 100);
    addRows(model, "after", 4, 100);
    env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 2 * DEFAULT_CELL_WIDTH,
      offsetY: 4 * DEFAULT_CELL_HEIGHT,
    });
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.offset = {
      x: 40,
      y: 10.5,
    };
    payload.col = 2;
    payload.row = 18; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    const figureUI = model.getters.getVisibleFigures()[0];
    expect({ x: figureUI.x, y: figureUI.y }).toStrictEqual({
      x: (width - figureUI.width) / 2, // figure is inside left frozen pane
      y: 4 * DEFAULT_CELL_HEIGHT + (height - figureUI.height) / 2,
    });
  });

  test("Chart of single cell will extend the selection to find a 'table'", () => {
    setSelection(model, ["A2"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = [
      { dataRange: "B1:B5" },
      { dataRange: "C1:C5" },
      { dataRange: "D1:D5" },
      { dataRange: "E1:E5" },
      { dataRange: "F1:F5" },
      { dataRange: "G1:G5" },
      { dataRange: "H1:H5" },
    ];
    payload.definition.labelRange = "A1:A5";
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.legendPosition = "top";
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    expect(zoneToXc(model.getters.getSelectedZone())).toBe("A1:H5");
  });

  test("Chart can be inserted with unbounded ranges", () => {
    setSelection(model, ["A1:B100"], { unbounded: true });
    insertChart();
    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];
    expect(model.getters.getChartDefinition(chartId)).toMatchObject(
      toChartDataSource({
        dataSets: [{ dataRange: "B:B" }],
        labelRange: "A:A",
      })
    );
  });
});

describe("Smart chart type detection", () => {
  type DatasetDescriptor = string[];

  let model: Model;
  let env: SpreadsheetChildEnv;

  beforeEach(() => {
    model = new Model();
    env = makeTestEnv({ model });
  });

  /**
   * Create a dataset according to the given pattern. The pattern is a list of column types, with possible modifiers
   * (eg. ["text_with_header", "number_repeated", "empty", "date"]) would create a dataset of 4 columns.
   */
  function createDatasetFromDescription(description: DatasetDescriptor) {
    for (let col = 0; col < description.length; col++) {
      const colDescription = description[col];
      const hasHeader = colDescription.includes("_with_header");
      const repeatedValues = colDescription.includes("_repeated");
      const type = colDescription.replace("_with_header", "").replace("_repeated", "");

      for (let row = 0; row < 6; row++) {
        const xc = toXC(col, row);
        if (row === 0 && hasHeader) {
          setCellContent(model, xc, `Header${col}`);
          continue;
        }
        if (type === "empty") {
          continue;
        }
        const generator = repeatedValues ? row % 3 : row;
        if (type === "text") {
          setCellContent(model, xc, `Text${generator}`);
        } else if (type === "number") {
          setCellContent(model, xc, `${generator}`);
        } else if (type === "date") {
          setCellContent(model, xc, `2022-10-${generator + 1}`);
        } else if (type === "percentage") {
          setCellContent(model, xc, `${generator * 10}%`);
        }
      }
    }
  }

  test("Single cell: create a scorecard", () => {
    setCellContent(model, "C3", "100");
    setSelection(model, ["C3"]);
    doAction(["insert", "insert_chart"], env);
    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      type: "scorecard",
      keyValue: "C3",
    });
  });

  test.each<[DatasetDescriptor, Partial<ChartDefinition>]>([
    [["percentage"], { type: "pie" }],
    [["number"], { type: "bar" }],
    [["text"], { type: "pie", labelRange: "A1:A6", aggregated: true }], // categorical pie chart, the data range is also the label range
    [["date"], { type: "line" }],
    [["percentage_with_header"], { type: "pie", dataSetsHaveTitle: true }],
    [["date_with_header"], { type: "line", dataSetsHaveTitle: true }],
  ])("Single column %s creates %s chart", (datasetPattern, expected) => {
    createDatasetFromDescription(datasetPattern);
    doAction(["insert", "insert_chart"], env);

    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];

    const definition = model.getters.getChartDefinition(chartId);
    expect(definition).toMatchObject({
      ...expected,
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A6" }],
        labelRange: "labelRange" in expected ? expected.labelRange : undefined,
      }),
    });
  });

  test.each<[DatasetDescriptor, Partial<ChartDefinition>]>([
    [["text", "percentage"], { type: "pie" }],
    [["number", "percentage"], { type: "pie" }],
    [["date", "percentage"], { type: "pie" }],
    [["number", "number"], { type: "scatter" }],
    [["date", "number"], { type: "line" }],
    [["text", "number"], { type: "bar" }],
    [["text_repeated", "number"], { type: "treemap" }],
    [["text", "date"], { type: "bar" }],
    [["number", "text"], { type: "bar" }],
    [["text", "number_with_header"], { type: "bar", dataSetsHaveTitle: true }],
    [["number", "number_with_header"], { type: "scatter", dataSetsHaveTitle: true }],
  ])("Two columns %s creates %s chart", (datasetPattern, expected) => {
    createDatasetFromDescription(datasetPattern);
    doAction(["insert", "insert_chart"], env);

    const expectedDataset =
      expected.type === "treemap" ? [{ dataRange: "A1:A6" }] : [{ dataRange: "B1:B6" }];
    const expectedLabelRange = expected.type === "treemap" ? "B1:B6" : "A1:A6";

    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      ...expected,
      ...toChartDataSource({
        dataSets: expectedDataset,
        labelRange: expectedLabelRange,
      }),
    });
  });

  test.each<[DatasetDescriptor, Partial<ChartDefinition>]>([
    [["text", "text", "number"], { type: "treemap" }],
    [["text", "text", "text", "number"], { type: "sunburst" }],
    [["text", "text", "percentage"], { type: "treemap" }],
    [["text", "text", "text", "percentage"], { type: "sunburst" }],
    [["text", "text", "text", "number_with_header"], { type: "sunburst", dataSetsHaveTitle: true }],
  ])("Multiple text columns  %s create a %s hierarchical chart", (datasetPattern, expected) => {
    createDatasetFromDescription(datasetPattern);
    doAction(["insert", "insert_chart"], env);

    const datasetLastCol = datasetPattern.findIndex((p) => !p.includes("text"));
    const expectedDatasets: CustomizedDataSet[] = [];
    for (let i = 0; i < datasetLastCol; i++) {
      expectedDatasets.push({ dataRange: toXC(i, 0) + ":" + toXC(i, 5) });
    }
    const expectedLabelRange = toXC(datasetLastCol, 0) + ":" + toXC(datasetLastCol, 5);

    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      ...expected,
      ...toChartDataSource({
        dataSets: expectedDatasets,
        labelRange: expectedLabelRange,
      }),
    });
  });

  test.each<[DatasetDescriptor, Partial<ChartDefinition>]>([
    [["text", "percentage", "percentage"], { type: "pie" }],
    [["number", "percentage", "percentage", "percentage"], { type: "pie" }],
    [["date", "number", "number"], { type: "line" }],
    // Any other combination should give a bar chart with correct datasets
    [["text", "number", "percentage"], { type: "bar" }],
    [["text", "number", "date"], { type: "bar" }],
    [["text", "number", "number"], { type: "bar" }],
    [["number", "number", "number"], { type: "bar" }],
    [["date", "date", "number", "text"], { type: "bar" }],
    [["text", "number_with_header", "percentage"], { type: "bar", dataSetsHaveTitle: true }],
    [["text", "number", "date_with_header"], { type: "bar", dataSetsHaveTitle: true }],
  ])("Multiple columns  %s create a %s chart", (datasetPattern, expected) => {
    createDatasetFromDescription(datasetPattern);
    doAction(["insert", "insert_chart"], env);

    const expectedDatasets: CustomizedDataSet[] = [];
    for (let i = 1; i < datasetPattern.length; i++) {
      expectedDatasets.push({ dataRange: toXC(i, 0) + ":" + toXC(i, 5) });
    }

    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      ...expected,
      ...toChartDataSource({
        dataSets: expectedDatasets,
        labelRange: "A1:A6",
      }),
    });
  });

  test("Empty columns are passed in the chart dataset if the whole selection is empty", () => {
    setSelection(model, ["A1:B6"]);
    doAction(["insert", "insert_chart"], env);
    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      type: "bar",
      ...toChartDataSource({
        dataSets: [{ dataRange: "A1:A6" }, { dataRange: "B1:B6" }],
        dataSetsHaveTitle: false,
      }),
    });
  });

  test("Empty columns are ignored in the chart dataset if other columns are not empty", () => {
    createDatasetFromDescription(["number", "empty", "number"]);
    setSelection(model, ["A1:C6"]);
    doAction(["insert", "insert_chart"], env);
    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      type: "scatter",
      ...toChartDataSource({
        dataSets: [{ dataRange: "C1:C6" }],
        labelRange: "A1:A6",
      }),
    });
  });

  test.each<[DatasetDescriptor, Partial<ChartDefinition>]>([
    [["number"], { legendPosition: "none" }],
    [["text", "number"], { legendPosition: "none" }],
    [["date", "number", "number"], { legendPosition: "top" }],
    [["text", "number", "number"], { legendPosition: "top" }],
  ])(
    "Pie charts and charts with more than one column in their dataset %s have a legend",
    (datasetPattern, expected) => {
      createDatasetFromDescription(datasetPattern);
      doAction(["insert", "insert_chart"], env);

      const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];
      expect(model.getters.getChartDefinition(chartId)).toMatchObject(expected);
    }
  );
});
