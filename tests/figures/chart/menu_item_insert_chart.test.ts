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
  spyModelDispatch,
} from "../../test_helpers/helpers";

describe("Insert chart menu item", () => {
  const data = {
    sheets: [
      {
        name: "Sheet1",
        rows: {},
        cells: {
          A2: { content: "P1" },
          A3: { content: "P2" },
          A4: { content: "P3" },
          A5: { content: "P4" },

          B1: { content: "first column dataset" },
          B2: { content: "10" },
          B3: { content: "11" },
          B4: { content: "12" },
          B5: { content: "13" },

          C1: { content: "" },
          C2: { content: "2" },
          C3: { content: "4" },
          C4: { content: "6" },

          D1: { content: "=sum()" },
          D2: { content: "3" },
          D3: { content: "2" },
          D4: { content: "5" },

          E1: { content: "Title1" },
          E2: { content: "10" },
          E3: { content: "11" },
          E4: { content: "12" },

          F1: { content: "=sum(1,2)" },
          F2: { content: "7" },
          F3: { content: "8" },
          F4: { content: "9" },

          G1: { content: "" },
          G2: { content: "7" },
          G3: { content: "8" },
          G4: { content: "9" },

          H1: { content: "Title2" },
          H2: { content: "7" },
          H3: { content: "8" },
          H4: { content: "9" },
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
      position: expect.any(Object),
      size: expect.any(Object),
      id: expect.any(String),
      sheetId: expect.any(String),
      definition: {
        dataSets: ["A1"],
        dataSetsHaveTitle: false,
        labelRange: undefined,
        legendPosition: "none",
        stacked: false,
        aggregated: false,
        title: { text: expect.any(String) },
        type: "bar",
        verticalAxisPosition: "left",
      },
    };
  });

  test("Chart is inserted at correct position", () => {
    setSelection(model, ["B2"]);
    insertChart();
    const { width, height } = model.getters.getSheetViewDimension();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.position = {
      x: (width - DEFAULT_FIGURE_WIDTH) / 2,
      y: (height - DEFAULT_FIGURE_HEIGHT) / 2,
    }; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart is selected and focused at insertion", async () => {
    await mountTestSpreadsheet();
    setSelection(model, ["B2"]);
    insertChart();
    const id = model.getters.getFigures(model.getters.getActiveSheetId())[0].id;
    expect(dispatchSpy).toHaveBeenCalledWith("SELECT_FIGURE", { id });
    await nextTick();
    expect(document.activeElement?.classList).toContain("o-figure");
  });

  test("Chart side panel was opened at chart insertion", () => {
    setSelection(model, ["B2"]);
    insertChart();
    expect(openSidePanelSpy).toHaveBeenCalledWith("ChartPanel", undefined);
  });

  test("Chart is inserted at correct position inside bottomRight pane for rows freeze", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeRows(model, 5, sheetId);
    setSelection(model, ["B2"]);
    insertChart();
    const { width, height } = model.getters.getSheetViewDimension();
    const { y: offsetCorrectionY } = model.getters.getMainViewportCoordinates();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.position = {
      x: (width - DEFAULT_FIGURE_WIDTH) / 2,
      y: (height - DEFAULT_FIGURE_HEIGHT + offsetCorrectionY) / 2,
    }; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart is inserted at correct position inside bottomRight pane for columns freeze", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    setSelection(model, ["B2"]);
    insertChart();
    const { width, height } = model.getters.getSheetViewDimension();
    const { x: offsetCorrectionX } = model.getters.getMainViewportCoordinates();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.position = {
      x: (width - DEFAULT_FIGURE_WIDTH + offsetCorrectionX) / 2,
      y: (height - DEFAULT_FIGURE_HEIGHT) / 2,
    }; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart is inserted at correct position inside bottomRight pane for both freeze", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    freezeRows(model, 5, sheetId);
    setSelection(model, ["B2"]);
    insertChart();
    const { width, height } = model.getters.getSheetViewDimension();
    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      model.getters.getMainViewportCoordinates();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.position = {
      x: (width - DEFAULT_FIGURE_WIDTH + offsetCorrectionX) / 2,
      y: (height - DEFAULT_FIGURE_HEIGHT + offsetCorrectionY) / 2,
    }; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
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
    payload.position = {
      x: 0,
      y: 0,
    }; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart is inserted at the top left of the viewport when too small in a frozen pane", () => {
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
    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      model.getters.getMainViewportCoordinates();
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);

    payload.position = {
      x: offsetCorrectionX,
      y: offsetCorrectionY,
    }; // Position at the top of the bottom pane of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
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
    payload.position = {
      x: 2 * DEFAULT_CELL_WIDTH + (width - DEFAULT_FIGURE_WIDTH) / 2,
      y: 4 * DEFAULT_CELL_HEIGHT + (height - DEFAULT_FIGURE_HEIGHT) / 2,
    }; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart is inserted at correct position on a scrolled viewport with frozen rows", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeRows(model, 5, sheetId);
    setSelection(model, ["B2:B3"]);
    const { width, height } = model.getters.getSheetViewDimension();
    const { y: offsetCorrectionY } = model.getters.getMainViewportCoordinates();
    addColumns(model, "after", "D", 100);
    addRows(model, "after", 4, 100);
    env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 2 * DEFAULT_CELL_WIDTH,
      offsetY: 4 * DEFAULT_CELL_HEIGHT,
    });
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.position = {
      x: 2 * DEFAULT_CELL_WIDTH + (width - DEFAULT_FIGURE_WIDTH) / 2,
      y: 4 * DEFAULT_CELL_HEIGHT + (height - DEFAULT_FIGURE_HEIGHT + offsetCorrectionY) / 2,
    }; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart is inserted at correct position on a scrolled viewport with columns frozen", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    setSelection(model, ["B2:B3"]);
    const { width, height } = model.getters.getSheetViewDimension();
    const { x: offsetCorrectionX } = model.getters.getMainViewportCoordinates();
    addColumns(model, "after", "D", 100);
    addRows(model, "after", 4, 100);
    env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 2 * DEFAULT_CELL_WIDTH,
      offsetY: 4 * DEFAULT_CELL_HEIGHT,
    });
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.position = {
      x: 2 * DEFAULT_CELL_WIDTH + (width - DEFAULT_FIGURE_WIDTH + offsetCorrectionX) / 2,
      y: 4 * DEFAULT_CELL_HEIGHT + (height - DEFAULT_FIGURE_HEIGHT) / 2,
    }; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart is inserted at correct position on a scrolled viewport with both directions frozen", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    freezeRows(model, 5, sheetId);
    setSelection(model, ["B2:B3"]);
    const { width, height } = model.getters.getSheetViewDimension();
    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      model.getters.getMainViewportCoordinates();
    addColumns(model, "after", "D", 100);
    addRows(model, "after", 4, 100);
    env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 2 * DEFAULT_CELL_WIDTH,
      offsetY: 4 * DEFAULT_CELL_HEIGHT,
    });
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = expect.any(Object);
    payload.position = {
      x: 2 * DEFAULT_CELL_WIDTH + (width - DEFAULT_FIGURE_WIDTH + offsetCorrectionX) / 2,
      y: 4 * DEFAULT_CELL_HEIGHT + (height - DEFAULT_FIGURE_HEIGHT + offsetCorrectionY) / 2,
    }; // Position at the center of the viewport
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of single column without title", () => {
    setSelection(model, ["B2:B5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["B2:B5"];
    payload.definition.labelRange = undefined;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of single column with title", () => {
    setSelection(model, ["B1:B5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["B1:B5"];
    payload.definition.labelRange = undefined;
    payload.definition.dataSetsHaveTitle = true;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of several columns (ie labels) without title", () => {
    setSelection(model, ["A2:B5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["B2:B5"];
    payload.definition.labelRange = "A2:A5";
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of several columns (ie labels) with title", () => {
    setSelection(model, ["A1:B5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["B1:B5"];
    payload.definition.labelRange = "A1:A5";
    payload.definition.dataSetsHaveTitle = true;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart title should be set by default if dataset have any", () => {
    setSelection(model, ["B1:C4"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["C1:C4"];
    payload.definition.legendPosition = "none";
    payload.definition.title = { text: "" };
    payload.definition.dataSetsHaveTitle = false;
    payload.definition.labelRange = "B1:B4";
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });
  test("Chart title should only generate string and numerical values", async () => {
    setSelection(model, ["C1:G4"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["D1:G4"];
    payload.definition.legendPosition = "top";
    payload.definition.title = { text: "Title1 and 3" };
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.labelRange = "C1:C4";
    payload.definition.type = "line";
    payload.definition.cumulative = false;
    payload.definition.labelsAsText = false;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });
  test("Chart title should only append and prefix to last title", () => {
    setSelection(model, ["C1:H4"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["D1:H4"];
    payload.definition.legendPosition = "top";
    payload.definition.title = { text: "Title1, 3 and Title2" };
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.labelRange = "C1:C4";
    payload.definition.type = "line";
    payload.definition.cumulative = false;
    payload.definition.labelsAsText = false;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });
  test("[Case 1] Chart is inserted with proper legend position", () => {
    setSelection(model, ["A1:B5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["B1:B5"];
    payload.definition.labelRange = "A1:A5";
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.legendPosition = "none";
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });
  test("[Case 2] Chart is inserted with proper legend position", () => {
    setSelection(model, ["F1:I5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["G1:I5"];
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.labelRange = "F1:F5";
    payload.definition.legendPosition = "top";
    payload.definition.type = "line";
    payload.definition.cumulative = false;
    payload.definition.labelsAsText = false;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of single isolated cell is a scorecard", () => {
    setCellContent(model, "K5", "Hello");
    setSelection(model, ["K5"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition = {
      keyValue: "K5",
      title: { text: expect.any(String) },
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
    payload.definition.dataSets = ["K5"];
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });

  test("Chart of single cell will extend the selection to find a 'table'", () => {
    setSelection(model, ["A2"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["B1:H5"];
    payload.definition.labelRange = "A1:A5";
    payload.definition.dataSetsHaveTitle = true;
    payload.definition.legendPosition = "top";
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    expect(zoneToXc(model.getters.getSelectedZone())).toBe("A1:H5");
  });

  test("Chart with number cells as labels is a linear chart", () => {
    setCellContent(model, "K1", "1");
    setCellContent(model, "K2", "2");
    setCellContent(model, "K3", "3");
    setCellContent(model, "L1", "1");
    setCellContent(model, "L2", "2");
    setCellContent(model, "L3", "3");

    setSelection(model, ["K1"]);
    insertChart();
    const payload = { ...defaultPayload };
    payload.definition.dataSets = ["L1:L3"];
    payload.definition.labelRange = "K1:K3";
    payload.definition.type = "line";
    payload.definition.cumulative = false;
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
    payload.definition.dataSets = ["L1:L3"];
    payload.definition.labelRange = "K1:K3";
    payload.definition.type = "line";
    payload.definition.cumulative = false;
    payload.definition.labelsAsText = false;
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
    expect(zoneToXc(model.getters.getSelectedZone())).toBe("K1:L3");
  });

  test("Chart with only one column of text cells is a count pie chart", () => {
    setCellContent(model, "K1", "London");
    setCellContent(model, "K2", "Berlin");
    setCellContent(model, "K3", "Paris");
    setCellContent(model, "K4", "Paris");
    setCellContent(model, "K5", "Paris");
    setCellContent(model, "K6", "London");

    setSelection(model, ["K1:K6"]);
    insertChart();
    const payload = {
      ...defaultPayload,
      definition: {
        dataSets: ["K1:K6"],
        labelRange: "K1:K6",
        aggregated: true,
        legendPosition: "top",
        type: "pie",
        dataSetsHaveTitle: false,
        title: { text: "" },
      },
    };
    expect(dispatchSpy).toHaveBeenCalledWith("CREATE_CHART", payload);
  });
});
