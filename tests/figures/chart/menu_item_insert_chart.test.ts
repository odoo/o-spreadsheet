import { Model } from "../../../src";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../src/constants";
import { zoneToXc } from "../../../src/helpers";
import { SpreadsheetChildEnv } from "../../../src/types";
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
  setGrid,
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
  let defaultPiePayload: any;
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
        dataSets: [{ dataRange: "A1", yAxisId: "y" }],
        dataSetsHaveTitle: false,
        legendPosition: "none",
        title: {},
        type: "bar",
      },
    };
    defaultPiePayload = {
      ...defaultPayload,
      definition: {
        dataSets: [{ dataRange: "A1" }],
        dataSetsHaveTitle: false,
        legendPosition: "top",
        isDoughnut: false,
        title: {},
        type: "pie",
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

  test("Chart of single column without title", () => {
    setSelection(model, ["B2:B5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = [{ dataRange: "B2:B5" }];
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of single column with title", () => {
    setSelection(model, ["B1:B5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = [{ dataRange: "B1:B5" }];
    payload.definition.dataSetsHaveTitle = true;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of several columns (ie labels) without title", () => {
    setSelection(model, ["A2:B5"]);
    insertChart();
    const payload = { ...defaultPiePayload };
    payload.definition.dataSets = [{ dataRange: "B2:B5" }];
    payload.definition.labelRange = "A2:A5";
    payload.definition.aggregated = true;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of several columns (ie labels) with title", () => {
    setSelection(model, ["A1:B5"]);
    insertChart();
    const payload = { ...defaultPiePayload };
    payload.definition.dataSets = [{ dataRange: "B1:B5" }];
    payload.definition.labelRange = "A1:A5";
    payload.definition.aggregated = true;
    payload.definition.dataSetsHaveTitle = true;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("[Case 1] Chart is inserted with proper legend position", () => {
    setSelection(model, ["A1:B5"]);
    insertChart();
    const payload = { ...defaultPiePayload };
    payload.definition.dataSets = [{ dataRange: "B1:B5" }];
    payload.definition.labelRange = "A1:A5";
    payload.definition.aggregated = true;
    payload.definition.dataSetsHaveTitle = true;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });
  test("[Case 2] Chart is inserted with proper legend position", () => {
    setSelection(model, ["F1:I5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = [{ dataRange: "F1:H5" }];
    payload.definition.labelRange = "F1:F5";
    payload.definition.aggregated = true;
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.legendPosition = "top";
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of single isolated cell is a scorecard", () => {
    setCellContent(model, "K5", "Hello");
    setSelection(model, ["K5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = {
      keyValue: "K5",
      title: {},
      type: "scorecard",
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
    };
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of single isolated empty cell is a bar chart", () => {
    setSelection(model, ["K5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = [{ dataRange: "K5" }];
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of single cell will extend the selection to find a 'table'", () => {
    setSelection(model, ["A2"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = [{ dataRange: "B1:H5" }];
    payload.definition.aggregated = true;
    payload.definition.labelRange = "A1:A5";
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.legendPosition = "top";
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    expect(zoneToXc(model.getters.getSelectedZone())).toBe("A1:H5");
  });

  test("Chart with number cells as labels is a scatter chart", () => {
    setCellContent(model, "K1", "1");
    setCellContent(model, "K2", "2");
    setCellContent(model, "K3", "3");
    setCellContent(model, "L1", "1");
    setCellContent(model, "L2", "2");
    setCellContent(model, "L3", "3");

    setSelection(model, ["K1"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.type = "scatter";
    payload.definition.dataSets = [{ dataRange: "L1:L3" }];
    payload.definition.labelRange = "K1:K3";
    payload.definition.labelsAsText = false;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    expect(zoneToXc(model.getters.getSelectedZone())).toBe("K1:L3");
  });

  test("Chart with date cells as labels is a linear chart", () => {
    setCellContent(model, "K1", "10/10/2022");
    setCellContent(model, "K2", "10/11/2022");
    setCellContent(model, "K3", "10/12/2022");
    setCellContent(model, "L1", "1");
    setCellContent(model, "L2", "2");
    setCellContent(model, "L3", "3");

    setSelection(model, ["K1"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.type = "line";
    payload.definition.dataSets = [{ dataRange: "L1:L3" }];
    payload.definition.labelRange = "K1:K3";
    payload.definition.aggregated = false;
    payload.definition.cumulative = false;
    payload.definition.labelsAsText = false;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    expect(zoneToXc(model.getters.getSelectedZone())).toBe("K1:L3");
  });

  test("Chart with percentage cells is a doughnut chart when sum < 100", () => {
    setCellContent(model, "K1", "10%");
    setCellContent(model, "K2", "20%");
    setCellContent(model, "K3", "30%");
    setSelection(model, ["K1:K3"]);
    insertChart();
    const payload = { ...defaultPiePayload };
    payload.definition.dataSets = [{ dataRange: "K1:K3" }];
    payload.definition.legendPosition = "none";
    payload.definition.isDoughnut = true;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart with percentage cells is a pie chart when sum >= 100", () => {
    setCellContent(model, "K1", "40%");
    setCellContent(model, "K2", "30%");
    setCellContent(model, "K3", "40%");

    setSelection(model, ["K1:K3"]);
    insertChart();
    const payload = { ...defaultPiePayload };
    payload.definition.dataSets = [{ dataRange: "K1:K3" }];
    payload.definition.legendPosition = "none";
    payload.definition.isDoughnut = false;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart with text cells (including empty cells) is a pie chart", () => {
    setCellContent(model, "K1", "Country");
    setCellContent(model, "K2", "India");
    setCellContent(model, "K3", "Pakistan");
    setCellContent(model, "K4", "India");
    setCellContent(model, "K6", "USA");

    setSelection(model, ["K1:K100"]);
    insertChart();
    const payload = { ...defaultPiePayload };
    payload.definition.title = { text: "Country" };
    payload.definition.dataSets = [{ dataRange: "K:K" }];
    payload.definition.labelRange = "K:K";
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.aggregated = true;
    payload.definition.legendPosition = "top";
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Text + number with <=6 unique labels creates pie chart", () => {
    setSelection(model, ["A1:A5", "B1:B5"]);
    insertChart();
    const payload = { ...defaultPiePayload };
    payload.definition.dataSets = [{ dataRange: "B1:B5" }];
    payload.definition.labelRange = "A1:A5";
    payload.definition.isDoughnut = false;
    payload.definition.aggregated = true;
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.legendPosition = "top";
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Text + number with > 6 non-unique labels creates treemap chart", () => {
    const labels = ["A", "B", "C", "D", "E", "F", "G", "A", "B"];
    const numbers = [10, 20, 30, 40, 50, 60, 70, 80, 90];

    labels.forEach((label, i) => {
      setCellContent(model, `K${i + 1}`, label);
    });

    numbers.forEach((value, i) => {
      setCellContent(model, `L${i + 1}`, value.toString());
    });

    setSelection(model, ["K1:K9", "L1:L9"]);
    insertChart();
    const payload = {
      ...defaultPayload,
      definition: {
        type: "treemap",
        title: {},
        labelRange: "L1:L9",
        dataSets: [{ dataRange: "K1:K9" }],
        dataSetsHaveTitle: false,
        legendPosition: "none",
      },
    };
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("unique text column + multiple numeric columns with <= 12 category creates radar chart", () => {
    ["spring", "summer", "autumn", "fall", "winter"].forEach((val, i) => {
      setCellContent(model, `W${i + 1}`, val);
      setCellContent(model, `X${i + 1}`, `${10 + i}`);
      setCellContent(model, `Y${i + 1}`, `${20 + i}`);
    });
    setSelection(model, ["W1:W5", "X1:X5", "Y1:Y5"]);
    insertChart();

    const payload = {
      ...defaultPayload,
      definition: {
        type: "radar",
        title: {},
        dataSets: [{ dataRange: "X1:Y5" }],
        labelRange: "W1:W5",
        dataSetsHaveTitle: false,
        legendPosition: "top",
      },
    };
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart with 2 string columns is a treemap chart (without headers)", () => {
    // prettier-ignore
    const grid = {
      K1: "Group1",    L1: "SubGroup1",    M1: "40",
      K2: "Group1",    L2: "SubGroup2",    M2: "20",
      K3: "Group2",    L3: "SubGroup1",    M3: "10",
    };
    setGrid(model, grid);
    setSelection(model, ["K1"]);
    insertChart();
    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId()).at(-1)!;
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      type: "treemap",
      dataSets: [{ dataRange: "K1:K3" }, { dataRange: "L1:L3" }],
      dataSetsHaveTitle: false,
      labelRange: "M1:M3",
    });
  });

  test("Chart with 2 string columns is a treemap chart (with headers)", () => {
    // prettier-ignore
    const grid = {
      K1: "Header1",   L1: "Header2",      M1: "Header3",
      K2: "Group1",    L2: "SubGroup1",    M2: "20",
                       L3: "SubGroup2",    M3: "10",
    };
    setGrid(model, grid);
    setSelection(model, ["K1"]);
    insertChart();
    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId()).at(-1)!;
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      type: "treemap",
      dataSets: [{ dataRange: "K1:K3" }, { dataRange: "L1:L3" }],
      dataSetsHaveTitle: true,
      labelRange: "M1:M3",
    });
  });

  test("Chart with > 2 string columns is a sunburst chart (with headers)", () => {
    // prettier-ignore
    const grid = {
      K1: "Continent",  L1: "Country",  M1: "State",        N1: "Sales",
      K2: "Asia",       L2: "India",    M2: "Gujarat",      N2: "100",
                        L3: "India",    M3: "Maharashtra",  N3: "200",
      K4: "Europe",     L4: "Germany",  M4: "Bavaria",      N4: "150",
    };
    setGrid(model, grid);
    setSelection(model, ["K1"]);
    insertChart();

    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId()).at(-1)!;
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      type: "sunburst",
      dataSets: [{ dataRange: "K1:K4" }, { dataRange: "L1:L4" }, { dataRange: "M1:M4" }],
      labelRange: "N1:N4",
      dataSetsHaveTitle: true,
    });
  });

  test("Chart can be inserted with unbounded ranges", () => {
    setSelection(model, ["A1:B100"], { unbounded: true });
    insertChart();
    const chartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      dataSets: [{ dataRange: "B:B" }],
      labelRange: "A:A",
    });
  });
});
