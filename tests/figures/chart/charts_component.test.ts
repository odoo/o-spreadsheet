import { CommandResult, Model, Spreadsheet } from "../../../src";
import { ChartPanel } from "../../../src/components/side_panel/chart/main_chart_panel/main_chart_panel";
import { SidePanelStore } from "../../../src/components/side_panel/side_panel/side_panel_store";
import { ChartTerms } from "../../../src/components/translations_terms";
import { BACKGROUND_CHART_COLOR } from "../../../src/constants";
import { toHex, toZone } from "../../../src/helpers";
import { ScorecardChart } from "../../../src/helpers/figures/charts";
import {
  CHART_TYPES,
  ChartDefinition,
  ChartType,
  ChartWithAxisDefinition,
  SpreadsheetChildEnv,
} from "../../../src/types";
import { PieChartRuntime } from "../../../src/types/chart";
import { BarChartDefinition, BarChartRuntime } from "../../../src/types/chart/bar_chart";
import { LineChartDefinition } from "../../../src/types/chart/line_chart";
import {
  getChartConfiguration,
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../test_helpers/chart_helpers";
import {
  copy,
  createChart,
  createGaugeChart,
  createScorecardChart,
  createSheet,
  paste,
  selectCell,
  setCellContent,
  setCellFormat,
  setFormat,
  setStyle,
  undo,
  updateChart,
} from "../../test_helpers/commands_helpers";
import { TEST_CHART_DATA } from "../../test_helpers/constants";
import {
  click,
  doubleClick,
  focusAndKeyDown,
  keyDown,
  setInputValueAndTrigger,
  simulateClick,
  triggerMouseEvent,
} from "../../test_helpers/dom_helper";
import { getCellContent } from "../../test_helpers/getters_helpers";
import {
  mockChart,
  mountComponentWithPortalTarget,
  mountSpreadsheet as mountSpreadsheetHelper,
  nextTick,
  setGrid,
  spyModelDispatch,
  textContentAll,
} from "../../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../../test_helpers/mock_helpers";

mockGetBoundingClientRect({
  "o-popover": () => ({ height: 0, width: 0 }),
  "o-spreadsheet": () => ({ top: 100, left: 200, height: 1000, width: 1000 }),
  "o-figure-menu-item": () => ({ top: 500, left: 500 }),
});
type AllChartType = ChartType | "basicChart";

function createTestChart(type: AllChartType, newChartId = chartId) {
  switch (type) {
    case "scorecard":
      createScorecardChart(model, TEST_CHART_DATA.scorecard, newChartId);
      break;
    case "gauge":
      createGaugeChart(model, TEST_CHART_DATA.gauge, newChartId);
      break;
    case "basicChart":
      createChart(model, TEST_CHART_DATA.basicChart, newChartId);
      break;
    default:
      createChart(model, { ...TEST_CHART_DATA.basicChart, type }, chartId);
      break;
  }
}

function errorMessages(): string[] {
  return textContentAll(".o-validation-error");
}

async function changeChartType(type: string) {
  triggerMouseEvent(".o-type-selector", "pointerdown");
  await nextTick();
  await click(fixture, `.o-chart-type-item[data-id="${type}"]`);
}

async function mountChartSidePanel(figureId = chartId) {
  const props = { figureId, onCloseSidePanel: () => {} };
  ({ fixture, env } = await mountComponentWithPortalTarget(ChartPanel, { props, model }));
}

async function mountSpreadsheet() {
  ({ env, model, fixture, parent } = await mountSpreadsheetHelper({ model }));
}

let fixture: HTMLElement;
let model: Model;
let mockChartData = mockChart();
const chartId = "someuuid";
let sheetId: string;
let parent: Spreadsheet;

let env: SpreadsheetChildEnv;

const TEST_CHART_TYPES = ["basicChart", "scorecard", "gauge", "combo"] as const;

describe("charts", () => {
  beforeEach(async () => {
    mockChartData = mockChart();
    sheetId = "Sheet1";
    const data = {
      sheets: [
        {
          name: sheetId,
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            B1: { content: "first column dataset" },
            C1: { content: "second column dataset" },
            B2: { content: "10" },
            B3: { content: "11" },
            B4: { content: "12" },
            B5: { content: "13" },
            C2: { content: "20" },
            C3: { content: "19" },
            C4: { content: "18" },
            A2: { content: "P1" },
            A3: { content: "P2" },
            A4: { content: "P3" },
            A5: { content: "P4" },
          },
        },
      ],
    };
    model = new Model(data);
  });

  test.each(CHART_TYPES)("Can open a chart sidePanel", async (chartType) => {
    await mountSpreadsheet();
    createTestChart(chartType);
    await openChartConfigSidePanel(model, env, chartId);
    expect(fixture.querySelector(".o-figure")).toBeTruthy();
  });

  test.each(TEST_CHART_TYPES)("can export a chart %s", (chartType) => {
    createTestChart(chartType);
    const data = model.exportData();
    const activeSheetId = model.getters.getActiveSheetId();
    const sheet = data.sheets.find((s) => s.id === activeSheetId)!;
    expect(sheet.figures).toMatchObject([
      {
        data: {
          ...TEST_CHART_DATA[chartType],
        },
        id: chartId,
        height: 335,
        tag: "chart",
        width: 536,
        x: 0,
        y: 0,
      },
    ]);
  });

  test.each(TEST_CHART_TYPES)("charts have a menu button", async (chartType) => {
    await mountSpreadsheet();
    createTestChart(chartType);
    await nextTick();
    expect(fixture.querySelector(".o-figure")).not.toBeNull();
    expect(fixture.querySelector(".o-figure-menu-item")).not.toBeNull();
  });

  test.each(TEST_CHART_TYPES)(
    "charts don't have a menu button in dashboard mode",
    async (chartType) => {
      await mountSpreadsheet();
      createTestChart(chartType);
      model.updateMode("dashboard");
      await nextTick();
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      expect(fixture.querySelector(".o-figure-menu-item")).toBeNull();
    }
  );

  test.each(TEST_CHART_TYPES)(
    "charts don't have a menu button in readonly mode",
    async (chartType) => {
      await mountSpreadsheet();
      createTestChart(chartType);
      model.updateMode("readonly");
      await nextTick();
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      expect(fixture.querySelector(".o-chart-menu-item")).toBeNull();
    }
  );

  test.each(TEST_CHART_TYPES)("Click on Edit button will prefill sidepanel", async (chartType) => {
    createTestChart(chartType);
    await mountChartSidePanel();

    expect(fixture.querySelector(".o-chart")).toBeTruthy();
    const panelChartType = fixture.querySelectorAll(".o-chart .o-input")[0];
    switch (chartType) {
      case "combo":
        const dataSeries = fixture.querySelectorAll(".o-chart .o-data-series")[0];
        const hasTitle = (
          fixture.querySelector("input[name=dataSetsHaveTitle]") as HTMLInputElement
        ).checked;
        const labels = fixture.querySelector(".o-data-labels");
        expect((panelChartType as HTMLSelectElement).value).toBe("combo");
        expect((dataSeries.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
          TEST_CHART_DATA.basicChart.dataSets[0].dataRange
        );
        expect(hasTitle).toBe(true);
        expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe(
          TEST_CHART_DATA.basicChart.labelRange
        );
        break;
      case "basicChart": {
        const dataSeries = fixture.querySelectorAll(".o-chart .o-data-series")[0];
        const hasTitle = (
          fixture.querySelector("input[name=dataSetsHaveTitle]") as HTMLInputElement
        ).checked;
        const labels = fixture.querySelector(".o-data-labels");
        expect((panelChartType as HTMLSelectElement).value).toBe("column");
        expect((dataSeries.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
          TEST_CHART_DATA.basicChart.dataSets[0].dataRange
        );
        expect(hasTitle).toBe(true);
        expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe(
          TEST_CHART_DATA.basicChart.labelRange
        );
        break;
      }
      case "scorecard": {
        const keyValue = fixture.querySelector(".o-chart .o-data-series");
        const baseline = fixture.querySelector(".o-data-labels");
        expect((panelChartType as HTMLSelectElement).value).toBe(TEST_CHART_DATA.scorecard.type);
        expect((keyValue!.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
          TEST_CHART_DATA.scorecard.keyValue
        );
        expect((baseline!.querySelector(".o-selection input") as HTMLInputElement).value).toBe(
          TEST_CHART_DATA.scorecard.baseline
        );
        break;
      }
    }
  });

  test.each(TEST_CHART_TYPES)("Double click on chart will open sidepanel", async (chartType) => {
    await mountSpreadsheet();
    createTestChart(chartType);
    await nextTick();
    expect(document.querySelector(".o-chart-container")).toBeTruthy();
    await doubleClick(fixture, ".o-chart-container");
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    expect(document.querySelector(".o-chart")).toBeTruthy();
  });

  test.each(TEST_CHART_TYPES)("can edit charts %s", async (chartType) => {
    createTestChart(chartType);
    await mountChartSidePanel();

    const dataSeries = fixture.querySelectorAll(".o-chart .o-data-series")[0] as HTMLInputElement;
    const dataSeriesValues = dataSeries.querySelector("input");
    const dispatch = spyModelDispatch(model);
    switch (chartType) {
      case "combo":
      case "basicChart":
        await click(fixture.querySelector("input[name=dataSetsHaveTitle]")!);
        expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
          id: chartId,
          sheetId,
          definition: {
            ...model.getters.getChartDefinition(chartId),
            dataSetsHaveTitle: false,
          },
        });
        break;
      case "scorecard":
        setInputValueAndTrigger(dataSeriesValues, "B2:B4");
        await nextTick();
        await simulateClick(".o-data-series .o-selection-ok");
        const definition = model.getters.getChartDefinition(chartId) as ScorecardChart;
        expect(definition.keyValue).toEqual("B2:B4");
        break;
    }
    await simulateClick(".o-panel .inactive");
    setInputValueAndTrigger(".o-chart-title input", "hello");
    expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
      id: chartId,
      sheetId,
      definition: {
        ...model.getters.getChartDefinition(chartId),
        title: { text: "hello" },
      },
    });
  });

  test("can edit chart title color", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "title" },
      },
      chartId
    );
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);

    const color_menu = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-color-picker-widget > .o-color-picker-button"
    )[0];

    await click(color_menu);
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(model.getters.getChartDefinition(chartId).title).toEqual({
      text: "title",
      color: "#EFEFEF",
    });
  });

  test.each(["Left", "Center", "Right"])(
    "can edit chart title alignment",
    async (alignment: string) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "C1:C4" }],
          labelRange: "A2:A4",
          type: "line",
          title: { text: "title" },
        },
        chartId
      );
      await mountChartSidePanel();
      await openChartDesignSidePanel(model, env, fixture, chartId);
      const alignment_menu = fixture.querySelectorAll(
        ".o-chart-title-designer > .o-menu-item-button[title='Horizontal alignment']"
      )[0];

      await click(alignment_menu);
      await click(fixture, `.o-menu-item-button[title='${alignment}']`);
      expect(model.getters.getChartDefinition(chartId).title).toEqual({
        text: "title",
        align: alignment.toLowerCase(),
      });
    }
  );

  test("can edit chart title style", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "title" },
      },
      chartId
    );
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);

    const bold_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Bold']"
    )[0];
    await click(bold_element);
    expect(model.getters.getChartDefinition(chartId).title).toEqual({
      text: "title",
      bold: true,
    });

    const italic_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Italic']"
    )[0];
    await click(italic_element);
    expect(model.getters.getChartDefinition(chartId).title).toEqual({
      text: "title",
      bold: true,
      italic: true,
    });
  });

  test("can edit chart axis title color", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
      },
      chartId
    );
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);

    const color_menu = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-color-picker-widget > .o-color-picker-button"
    )[1];

    await click(color_menu);
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).axesDesign.x).toEqual({
      title: {
        color: "#EFEFEF",
      },
    });
  });

  test.each(["Left", "Center", "Right"])(
    "can edit chart axis title alignment",
    async (alignment: string) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "C1:C4" }],
          labelRange: "A2:A4",
          type: "line",
          title: { text: "title" },
        },
        chartId
      );
      await mountChartSidePanel();
      await openChartDesignSidePanel(model, env, fixture, chartId);
      const alignment_menu = fixture.querySelectorAll(
        ".o-chart-title-designer > .o-menu-item-button[title='Horizontal alignment']"
      )[1];

      await click(alignment_menu);
      await click(fixture, `.o-menu-item-button[title='${alignment}']`);
      //@ts-ignore
      expect(model.getters.getChartDefinition(chartId).axesDesign.x).toEqual({
        title: {
          align: alignment.toLowerCase(),
        },
      });
    }
  );

  test("can edit chart axis title style", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "title" },
      },
      chartId
    );
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);

    const bold_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Bold']"
    )[1];
    await click(bold_element);
    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).axesDesign.x).toEqual({
      title: {
        bold: true,
      },
    });

    const italic_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Italic']"
    )[1];
    await click(italic_element);
    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).axesDesign.x).toEqual({
      title: {
        bold: true,
        italic: true,
      },
    });
  });

  test("can edit multiple chart axis title style", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "title" },
      },
      chartId
    );
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);

    const bold_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Bold']"
    )[1];
    await click(bold_element);
    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).axesDesign.x).toEqual({
      title: {
        bold: true,
      },
    });

    await click(fixture, ".o-badge-selection button[data-id=y]");
    const italic_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Italic']"
    )[1];
    await click(italic_element);
    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).axesDesign).toEqual({
      x: {
        title: {
          bold: true,
        },
      },
      y: {
        title: {
          italic: true,
        },
      },
    });
  });

  test("can edit chart data series color", async () => {
    createChart(
      model,
      {
        dataSets: [
          { dataRange: "B1:B4", label: "serie_1" },
          { dataRange: "C1:C4", label: "serie_2" },
        ],
        labelRange: "A2:A4",
        type: "line",
      },
      chartId
    );
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);

    let color_menu = fixture.querySelectorAll(".o-round-color-picker-button")[1];

    await click(color_menu);
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).dataSets).toEqual([
      {
        dataRange: "B1:B4",
        backgroundColor: "#EFEFEF",
        label: "serie_1",
      },
      {
        dataRange: "C1:C4",
        label: "serie_2",
      },
    ]);

    setInputValueAndTrigger(".data-series-selector", "serie_2");

    color_menu = fixture.querySelectorAll(".o-round-color-picker-button")[1];

    await click(color_menu);
    await click(fixture, ".o-color-picker-line-item[data-color='#FF0000'");
    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).dataSets).toEqual([
      {
        dataRange: "B1:B4",
        backgroundColor: "#EFEFEF",
        label: "serie_1",
      },
      {
        dataRange: "C1:C4",
        backgroundColor: "#FF0000",
        label: "serie_2",
      },
    ]);
  });

  test("can edit chart data series vertical axis", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
      },
      chartId
    );
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await click(fixture, ".o-vertical-axis-selection input[value=right]");

    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).dataSets).toEqual([
      {
        dataRange: "C1:C4",
        yAxisId: "y1",
      },
    ]);
  });

  test("can edit chart data series label", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
      },
      chartId
    );
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);
    setInputValueAndTrigger(".o-serie-label-editor", "coucou");

    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).dataSets).toEqual([
      {
        dataRange: "C1:C4",
        label: "coucou",
      },
    ]);
  });

  test("can open design panel of chart with duplicated dataset", async () => {
    createChart(
      model,
      { dataSets: [{ dataRange: "C1:C4" }, { dataRange: "C1:C4" }], type: "line" },
      chartId
    );
    await mountChartSidePanel(chartId);
    await openChartDesignSidePanel(model, env, fixture, chartId);
    expect(1).toBe(1);
  });

  test("changing property and selecting another chart does not change first chart", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "old_title_1" },
      },
      "1"
    );
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "old_title_2" },
      },
      "2"
    );
    await mountSpreadsheet();
    await openChartDesignSidePanel(model, env, fixture, "1");

    await simulateClick(".o-chart-title input");
    setInputValueAndTrigger(".o-chart-title input", "first_title", "onlyInput");

    const figures = fixture.querySelectorAll(".o-figure");
    await simulateClick(figures[1] as HTMLElement);
    expect(model.getters.getChartDefinition("1").title.text).toBe("old_title_1");
    expect(model.getters.getChartDefinition("2").title.text).toBe("old_title_2");
  });

  test("selecting a chart then selecting another chart and editing property change the second chart", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "old_title_1" },
      },
      "1"
    );
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "old_title_2" },
      },
      "2"
    );
    await mountSpreadsheet();
    await openChartDesignSidePanel(model, env, fixture, "1");

    const figures = fixture.querySelectorAll(".o-figure");
    await simulateClick(figures[1] as HTMLElement);
    await simulateClick(".o-chart-title input");
    setInputValueAndTrigger(".o-chart-title input", "new_title");

    expect(model.getters.getChartDefinition("1").title.text).toBe("old_title_1");
    expect(model.getters.getChartDefinition("2").title.text).toBe("new_title");
  });

  test.each(TEST_CHART_TYPES)(
    "defocusing sidepanel after modifying chart title w/o saving should maintain the new title %s",
    async (chartType) => {
      createTestChart(chartType);
      await mountSpreadsheet();
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await simulateClick(".o-chart-title input");
      const chartTitle = document.querySelector(".o-chart-title input") as HTMLInputElement;
      expect(chartTitle.value).toBe("hello");
      setInputValueAndTrigger(".o-chart-title input", "hello_new_title");
      await simulateClick(".o-grid-overlay");
      expect(chartTitle.value).toBe("hello_new_title");
    }
  );

  test.each(["basicChart", "combo", "scorecard"] as const)(
    "can edit charts %s background",
    async (chartType) => {
      createTestChart(chartType);
      await mountSpreadsheet();
      const dispatch = spyModelDispatch(model);
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(fixture.querySelector(".o-chart")).toBeTruthy();
      await simulateClick(".o-round-color-picker-button");
      const colorpickerItems = fixture.querySelectorAll<HTMLElement>(".o-color-picker-line-item");
      for (let el of colorpickerItems) {
        if (toHex(el.style.backgroundColor) === "#000000") {
          await simulateClick(el);
          break;
        }
      }
      expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
        id: chartId,
        sheetId,
        definition: {
          ...model.getters.getChartDefinition(chartId),
          background: "#000000",
        },
      });
      if (chartType === "basicChart" || chartType === "combo") {
        const figureCanvas = fixture.querySelector(".o-figure-canvas");
        expect(figureCanvas!.classList).toContain("w-100");
        expect(figureCanvas!.classList).toContain("h-100");
      }
    }
  );

  test.each(TEST_CHART_TYPES)(
    "can close color picker when click elsewhere %s",
    async (chartType) => {
      createTestChart(chartType);
      await mountChartSidePanel();
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await simulateClick(".o-color-picker-widget .o-color-picker-button");
      expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
      await simulateClick(".o-section-title");
      expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
    }
  );

  test.each([
    ["basicChart", [".o-data-labels"], ["labelRange"]],
    ["combo", [".o-data-labels"], ["labelRange"]],
    ["scorecard", [".o-data-labels"], ["baseline"]],
  ] as const)("remove ranges in chart %s", async (chartType, rangesDomClasses, nameInChartDef) => {
    createTestChart(chartType);
    await mountChartSidePanel();

    for (let i = 0; i < rangesDomClasses.length; i++) {
      const domClass = rangesDomClasses[i];
      const attrName = nameInChartDef[i];
      expect(model.getters.getChartDefinition(chartId)?.[attrName]).not.toBeUndefined();

      await simulateClick(domClass + " input");
      await setInputValueAndTrigger(domClass + " input", "");
      await simulateClick(domClass + " .o-selection-ok");
      expect(
        (model.getters.getChartDefinition(chartId) as ChartDefinition)[attrName]
      ).toBeUndefined();
    }
  });

  test("drawing of chart will receive new data after update", async () => {
    createTestChart("basicChart");
    await mountSpreadsheet();
    await openChartConfigSidePanel(model, env, chartId);

    const dataSeries = fixture.querySelectorAll(".o-chart .o-data-series")[0] as HTMLInputElement;
    const dataSeriesValues = dataSeries.querySelector("input");
    const hasTitle = fixture.querySelector("input[name=dataSetsHaveTitle]") as HTMLInputElement;
    await changeChartType("pie");
    setInputValueAndTrigger(dataSeriesValues, "B2:B5");
    await click(hasTitle);
    expect((mockChartData.data! as any).datasets[0].label).toEqual("first column dataset");
    expect((mockChartData.data! as any).datasets[0].data).toEqual([10, 11, 12]);
    expect(mockChartData.type).toBe("pie");
    expect((mockChartData.options?.plugins!.title as any).text).toBe("hello");
  });

  test("updating a chart from another sheet does not change it s sheetId", async () => {
    createTestChart("basicChart");
    await mountChartSidePanel();
    createSheet(model, { sheetId: "42", activate: true });
    const chartType = fixture.querySelectorAll(".o-chart .o-input")[0] as HTMLSelectElement;
    await setInputValueAndTrigger(chartType, "pie");

    expect(model.getters.getChart(chartId)?.sheetId).toBe(sheetId);

    const dataSeries = fixture.querySelectorAll(".o-chart .o-data-series")[0] as HTMLInputElement;
    const dataSeriesValues = dataSeries.querySelector("input");
    const hasTitle = fixture.querySelector("input[name=dataSetsHaveTitle]") as HTMLInputElement;
    setInputValueAndTrigger(dataSeriesValues, "B2:B5");
    await simulateClick(hasTitle);
    expect(model.getters.getChart(chartId)?.sheetId).toBe(sheetId);
  });

  test.each(TEST_CHART_TYPES)("deleting chart %s will close sidePanel", async (chartType) => {
    createTestChart(chartType);
    await mountSpreadsheet();

    await simulateClick(".o-figure");
    await simulateClick(".o-figure-menu-item");
    await simulateClick(".o-menu div[data-name='delete']");
    expect(() => model.getters.getChartRuntime("someuuid")).toThrow();
    await nextTick();
    expect(fixture.querySelector(".o-chart")).toBeFalsy();
  });

  test("deleting another chart does not close the side panel", async () => {
    const figureId1 = "figureId1";
    const figureId2 = "figureId2";
    createTestChart("basicChart", figureId1);
    createTestChart("basicChart", figureId2);
    const sheetId = model.getters.getActiveSheetId();
    await mountChartSidePanel(figureId1);
    expect(fixture.querySelector(".o-chart")).toBeTruthy();
    model.dispatch("DELETE_FIGURE", { id: figureId2, sheetId }); // could be deleted by another user
    await nextTick();
    expect(fixture.querySelector(".o-chart")).toBeTruthy();
  });

  test("Deleting a chart with active selection input does not produce a traceback", async () => {
    createTestChart("basicChart");
    await mountSpreadsheet();
    await openChartConfigSidePanel(model, env, chartId);

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[0];
    await setInputValueAndTrigger(element, "C1:C4");

    await simulateClick(".o-figure");
    await keyDown({ key: "Delete" });
    expect(fixture.querySelector(".o-figure")).toBeFalsy();
  });

  test("Undo a chart insertion will close the chart side panel", async () => {
    createTestChart("basicChart");
    await mountSpreadsheet();
    await openChartConfigSidePanel(model, env, chartId);
    undo(model);
    await nextTick();
    expect(fixture.querySelector(".o-chart")).toBeFalsy();
  });

  test("double click a chart in readonly mode does not open the side panel", async () => {
    createTestChart("basicChart");
    await mountSpreadsheet();

    expect(fixture.querySelector(".o-chart")).toBeFalsy();
    model.updateMode("readonly");
    expect(model.getters.getSelectedFigureId()).toBeNull();
    await nextTick();
    await doubleClick(fixture, ".o-chart-container");
    expect(fixture.querySelector(".o-chart")).toBeFalsy();
    expect(fixture.querySelector(".o-chart")).toBeFalsy();
  });

  describe.each(TEST_CHART_TYPES)("selecting other chart will adapt sidepanel", (chartType) => {
    test.each(["click", "SELECT_FIGURE command"])("when using %s", async (selectMethod: string) => {
      createTestChart(chartType);
      createChart(
        model,
        {
          dataSets: [{ dataRange: "C1:C4" }],
          labelRange: "A2:A4",
          title: { text: "second" },
          type: "line",
        },
        "secondChartId"
      );
      await mountSpreadsheet();
      await openChartConfigSidePanel(model, env, chartId);
      expect(fixture.querySelector(".o-chart")).toBeTruthy();

      const figures = fixture.querySelectorAll(".o-figure");
      if (selectMethod === "click") {
        await simulateClick(figures[1]);
      } else {
        model.dispatch("SELECT_FIGURE", { id: "secondChartId" });
      }

      await nextTick();
      const panelChartType = fixture.querySelectorAll(".o-chart .o-input")[0];
      const dataSeries = fixture.querySelectorAll(".o-chart .o-data-series")[0];
      const hasTitle = (fixture.querySelector("input[name=dataSetsHaveTitle]") as HTMLInputElement)
        .checked;
      const labels = fixture.querySelector(".o-data-labels");
      expect((panelChartType as HTMLSelectElement).value).toBe("line");
      expect((dataSeries.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
        "C1:C4"
      );
      expect(hasTitle).toBe(true);
      expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe("A2:A4");
      await simulateClick(".o-panel .inactive");
      expect((fixture.querySelector(".o-panel .inactive") as HTMLElement).textContent).toBe(
        " Configuration "
      );
    });
  });

  test("Can remove the last data series", async () => {
    createTestChart("basicChart");
    await mountChartSidePanel();

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    await setInputValueAndTrigger(element, "C1:C4");
    await simulateClick(".o-data-series .o-selection-ok");
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      { dataRange: "B1:B4", yAxisId: "y" },
      { dataRange: "C1:C4" },
    ]);
    const remove = document.querySelectorAll(".o-data-series .o-remove-selection")[1];
    await simulateClick(remove);
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      { dataRange: "B1:B4", yAxisId: "y" },
    ]);
  });

  test("Can add multiple ranges all in once", async () => {
    createTestChart("basicChart");
    await mountChartSidePanel();

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    await setInputValueAndTrigger(element, "C1:D4");
    await simulateClick(".o-data-series .o-selection-ok");
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      { dataRange: "B1:B4", yAxisId: "y" },
      { dataRange: "C1:C4" },
      { dataRange: "D1:D4" },
    ]);
    expect(fixture.querySelectorAll(".o-selection-input input").length).toEqual(4);
    expect(
      (fixture.querySelectorAll(".o-selection-input input")[0] as HTMLInputElement).value
    ).toBe("B1:B4");
    expect(
      (fixture.querySelectorAll(".o-selection-input input")[1] as HTMLInputElement).value
    ).toBe("C1:C4");
    expect(
      (fixture.querySelectorAll(".o-selection-input input")[2] as HTMLInputElement).value
    ).toBe("D1:D4");
  });

  test("Can add multiple ranges all in once with fullRow range", async () => {
    createChart(
      model,
      {
        dataSets: [],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "old_title_1" },
      },
      chartId
    );
    await mountChartSidePanel();

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    await setInputValueAndTrigger(element, "1:2");
    await simulateClick(".o-data-series .o-selection-ok");
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      { dataRange: "1:1" },
      { dataRange: "2:2" },
    ]);
  });

  test("Can add multiple ranges all in once with fullColumn range", async () => {
    createChart(
      model,
      {
        dataSets: [],
        labelRange: "A2:A4",
        type: "line",
        title: { text: "old_title_1" },
      },
      chartId
    );
    await mountChartSidePanel();

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    await setInputValueAndTrigger(element, "A:B");
    await simulateClick(".o-data-series .o-selection-ok");
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      { dataRange: "A:A" },
      { dataRange: "B:B" },
    ]);
  });

  describe("Chart error messages appear and don't need to click confirm", () => {
    test.each([
      ["basicChart" as const, []],
      ["combo" as const, []],
      ["scorecard" as const, []],
    ])(
      "update %s with empty labels/baseline",
      async (chartType, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await mountChartSidePanel();

        await simulateClick(".o-data-labels input");
        await setInputValueAndTrigger(".o-data-labels input", "");

        const expectedErrors = expectedResults.map((result) =>
          ChartTerms.Errors[result].toString()
        );

        expect(errorMessages()).toEqual(expectedErrors);
      }
    );

    test.each(TEST_CHART_TYPES)(
      "update chart with valid dataset/keyValue/dataRange show confirm button",
      async (chartType) => {
        createTestChart(chartType);
        await mountChartSidePanel();

        await simulateClick(".o-data-series input");
        await setInputValueAndTrigger(".o-data-series input", "A1");
        expect(fixture.querySelectorAll(".o-data-series .o-selection-ok").length).toBe(1);
      }
    );

    test.each(TEST_CHART_TYPES)(
      "update chart with invalid dataset/keyValue/dataRange disable confirm button",
      async (chartType) => {
        createTestChart(chartType);
        await mountChartSidePanel();

        await simulateClick(".o-data-series input");
        await setInputValueAndTrigger(".o-data-series input", "This is not valid");
        expect(fixture.querySelectorAll(".o-data-series .o-selection-ok[disabled]").length).toBe(1);
      }
    );

    test("does not update the chart with an invalid dataset", async () => {
      createTestChart("basicChart");
      await mountChartSidePanel();

      await simulateClick(".o-data-series input");
      await setInputValueAndTrigger(".o-data-series input", "A1:A10--");
      await focusAndKeyDown(".o-data-series input", { key: "Enter" });

      expect(model.getters.getChartDefinition(chartId)).toMatchObject(TEST_CHART_DATA.basicChart);
    });

    test.each(TEST_CHART_TYPES)(
      "Clicking on reset button on dataset/keyValue/dataRange put back the last valid dataset/keyValue/dataRange",
      async (chartType) => {
        createTestChart(chartType);
        await mountChartSidePanel();

        await simulateClick(".o-data-series input");
        await setInputValueAndTrigger(".o-data-series input", "A1");
        await simulateClick(".o-data-series .o-selection-ok");

        await simulateClick(".o-data-series input");
        await setInputValueAndTrigger(".o-data-series input", "this is not valid");
        await simulateClick(".o-data-series .o-selection-ko");

        expect((fixture.querySelector(".o-data-series input") as HTMLInputElement).value).toBe(
          "A1"
        );
      }
    );

    test.each(["basicChart", "combo", "scorecard"] as const)(
      "resetting chart label works as expected",
      async (chartType) => {
        createTestChart(chartType);
        await mountChartSidePanel();

        await simulateClick(".o-data-labels input");
        await setInputValueAndTrigger(".o-data-labels input", "A1");
        await simulateClick(".o-data-labels .o-selection-ok");

        expect((fixture.querySelector(".o-data-labels input") as HTMLInputElement).value).toBe(
          "A1"
        );

        await simulateClick(".o-data-labels input");
        await setInputValueAndTrigger(".o-data-labels input", "this is not valid");
        await simulateClick(".o-data-labels .o-selection-ko");

        expect((fixture.querySelector(".o-data-labels input") as HTMLInputElement).value).toBe(
          "A1"
        );
      }
    );

    test("Can change gauge inflection operator", async () => {
      createTestChart("gauge");
      await mountChartSidePanel();
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(model.getters.getChartDefinition(chartId)).toMatchObject({
        sectionRule: {
          lowerInflectionPoint: { operator: "<=" },
          upperInflectionPoint: { operator: "<=" },
        },
      });

      const inputs = fixture.querySelectorAll(".o-input[name=operatorType]");

      await setInputValueAndTrigger(inputs[0], "<");
      expect(model.getters.getChartDefinition(chartId)).toMatchObject({
        sectionRule: {
          lowerInflectionPoint: { operator: "<" },
          upperInflectionPoint: { operator: "<=" },
        },
      });

      setInputValueAndTrigger(inputs[1], "<");
      expect(model.getters.getChartDefinition(chartId)).toMatchObject({
        sectionRule: {
          lowerInflectionPoint: { operator: "<" },
          upperInflectionPoint: { operator: "<" },
        },
      });
    });

    describe("update chart with invalid section rule", () => {
      beforeEach(async () => {
        createTestChart("gauge");
        await mountChartSidePanel();
        await openChartDesignSidePanel(model, env, fixture, chartId);
      });

      test("empty rangeMin", async () => {
        await setInputValueAndTrigger(".o-data-range-min", "");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.EmptyGaugeRangeMin].toString()
        );
      });

      test("NaN rangeMin", async () => {
        await setInputValueAndTrigger(".o-data-range-min", "I'm not a number");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeRangeMinNaN].toString()
        );
      });

      test("empty rangeMax", async () => {
        await setInputValueAndTrigger(".o-data-range-max", "");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.EmptyGaugeRangeMax].toString()
        );
      });

      test("NaN rangeMax", async () => {
        await setInputValueAndTrigger(".o-data-range-max", "I'm not a number");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeRangeMaxNaN].toString()
        );
      });

      test("rangeMin > rangeMax", async () => {
        setInputValueAndTrigger(".o-data-range-min", "100");

        await setInputValueAndTrigger(".o-data-range-max", "0");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeRangeMinBiggerThanRangeMax].toString()
        );
      });

      test("NaN LowerInflectionPoint", async () => {
        await simulateClick(".o-input-lowerInflectionPoint");
        await setInputValueAndTrigger(".o-input-lowerInflectionPoint", "I'm not a number");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeLowerInflectionPointNaN].toString()
        );
      });

      test("NaN UpperInflectionPoint", async () => {
        await simulateClick(".o-input-upperInflectionPoint");
        await setInputValueAndTrigger(".o-input-upperInflectionPoint", "I'm not a number");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeUpperInflectionPointNaN].toString()
        );
      });
    });

    test("Scorecard > error displayed on input fields", async () => {
      createTestChart("scorecard");
      await mountChartSidePanel();

      // empty dataset/key value
      await simulateClick(".o-data-series input");
      await setInputValueAndTrigger(".o-data-series input", "");
      await simulateClick(".o-data-series .o-selection-ok");
      expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
      expect(document.querySelector(".o-data-labels input")?.classList).not.toContain("o-invalid");

      // invalid labels/baseline
      await simulateClick(".o-data-labels input");
      setInputValueAndTrigger(".o-data-labels input", "Invalid Label Range");
      await simulateClick(".o-data-labels .o-selection-ok");
      expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
      expect(document.querySelector(".o-data-labels input")?.classList).toContain("o-invalid");
    });

    describe("gauge > error displayed on input fields", () => {
      beforeEach(async () => {
        createTestChart("gauge");
        await mountChartSidePanel();
      });

      test("empty dataRange", async () => {
        await simulateClick(".o-data-series input");
        await setInputValueAndTrigger(".o-data-series input", "");
        await simulateClick(".o-data-series .o-selection-ok");
        expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
      });

      test("empty rangeMin", async () => {
        await simulateClick(".o-panel-design");
        await setInputValueAndTrigger(".o-data-range-min", "");
        expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
      });

      test("NaN rangeMin", async () => {
        await simulateClick(".o-panel-design");
        await setInputValueAndTrigger(".o-data-range-min", "bla bla bla");
        expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
      });

      test("empty rangeMax", async () => {
        await simulateClick(".o-panel-design");
        await setInputValueAndTrigger(".o-data-range-max", "");
        expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
      });

      test("NaN rangeMax", async () => {
        await simulateClick(".o-panel-design");
        await setInputValueAndTrigger(".o-data-range-max", "bla bla bla");
        expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
      });

      test("rangeMin > rangeMax", async () => {
        await simulateClick(".o-panel-design");
        setInputValueAndTrigger(".o-data-range-min", "100");

        await setInputValueAndTrigger(".o-data-range-max", "0");
        expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
        expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
      });

      test("NaN LowerInflectionPoint", async () => {
        await simulateClick(".o-panel-design");
        await setInputValueAndTrigger(".o-input-lowerInflectionPoint", "bla bla bla");
        expect(document.querySelector(".o-input-lowerInflectionPoint")?.classList).toContain(
          "o-invalid"
        );
      });

      test("NaN UpperInflectionPoint", async () => {
        await simulateClick(".o-panel-design");
        await setInputValueAndTrigger(".o-input-upperInflectionPoint", "bla bla bla");
        expect(document.querySelector(".o-input-upperInflectionPoint")?.classList).toContain(
          "o-invalid"
        );
      });
    });
  });

  test.each(["basicChart", "combo", "scorecard"] as const)(
    "Can open context menu on right click",
    async (chartType) => {
      createTestChart(chartType);
      await mountSpreadsheet();
      triggerMouseEvent(".o-chart-container", "contextmenu");
      await nextTick();
      expect(document.querySelector(".o-menu")).not.toBeNull();
    }
  );

  test.each(TEST_CHART_TYPES)(
    "Can edit a chart with empty main range without traceback",
    async (chartType) => {
      createTestChart(chartType);
      updateChart(model, chartId, { keyValue: undefined, dataRange: undefined, dataSets: [] });
      await mountSpreadsheet();
      await openChartConfigSidePanel(model, env, chartId);

      const input = fixture.querySelector(".o-selection input");
      await simulateClick(input);
      expect(fixture.querySelector(".o-figure")).toBeTruthy();
    }
  );

  test("Only yAxisId option is copied when spreading a range of a selection input", async () => {
    createChart(
      model,
      {
        type: "bar",
        dataSets: [
          { dataRange: "B1:B4", backgroundColor: "#FF0000", label: "MyLabel", yAxisId: "y1" },
        ],
      },
      chartId
    );
    await mountSpreadsheet();
    await openChartConfigSidePanel(model, env, chartId);
    await setInputValueAndTrigger(".o-data-series input", "B2:C4");
    await simulateClick(".o-data-series .o-selection-ok");
    const definition = model.getters.getChartDefinition(chartId) as BarChartDefinition;
    expect(definition.dataSets).toEqual([
      { dataRange: "B2:B4", backgroundColor: "#FF0000", label: "MyLabel", yAxisId: "y1" },
      { dataRange: "C2:C4", yAxisId: "y1" },
    ]);
  });

  test("Deleting the second chart after selecting it closes the side panel", async () => {
    createTestChart("basicChart", chartId);
    createTestChart("basicChart", "secondChartId");
    await mountSpreadsheet();
    await openChartConfigSidePanel(model, env, chartId);
    const store = env.getStore(SidePanelStore);
    const sheetId = model.getters.getActiveSheetId();

    const figures = model.getters.getFigures(sheetId);
    expect(store.panelProps.figureId).toBe(figures[0].id);
    expect(fixture.querySelector(".o-sidePanel")).not.toBeNull();

    model.dispatch("SELECT_FIGURE", { id: figures[1].id });
    await nextTick();
    expect(store.panelProps.figureId).toBe(figures[1].id);
    expect(fixture.querySelector(".o-sidePanel")).not.toBeNull();

    model.dispatch("DELETE_FIGURE", { sheetId, id: figures[1].id });
    await nextTick();
    expect(store.isOpen).toBeFalsy();
    expect(fixture.querySelector(".o-sidePanel")).toBeNull();
  });

  describe("Scorecard specific tests", () => {
    test("can edit chart baseline colors", async () => {
      createTestChart("scorecard");
      const dispatch = spyModelDispatch(model);
      await mountChartSidePanel();
      await openChartDesignSidePanel(model, env, fixture, chartId);

      // Change color of "up" value of baseline
      const colorpickerUpButton = fixture.querySelectorAll(
        ".o-chart-baseline-color .o-round-color-picker-button"
      )[0];
      await simulateClick(colorpickerUpButton);
      const colorpickerUpItems = fixture.querySelectorAll(
        ".o-color-picker-line-item"
      ) as NodeListOf<HTMLElement>;
      for (let el of colorpickerUpItems) {
        if (toHex(el.style.backgroundColor) === "#0000FF") {
          await simulateClick(el);
          break;
        }
      }
      expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
        id: chartId,
        sheetId,
        definition: {
          ...model.getters.getChartDefinition(chartId),
          baselineColorUp: "#0000FF",
        },
      });

      // Change color of "down" value of baseline
      const colorpickerDownButton = fixture.querySelectorAll(
        ".o-chart-baseline-color .o-round-color-picker-button"
      )[1];
      await simulateClick(colorpickerDownButton);
      const colorpickerDownItems = fixture.querySelectorAll(
        ".o-color-picker-line-item"
      ) as NodeListOf<HTMLElement>;
      for (let el of colorpickerDownItems) {
        if (toHex(el.style.backgroundColor) === "#FF0000") {
          await simulateClick(el);
          break;
        }
      }
      expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
        id: chartId,
        sheetId,
        definition: {
          ...model.getters.getChartDefinition(chartId),
          baselineColorDown: "#FF0000",
        },
      });
    });
  });

  describe("labelAsText", () => {
    test("labelAsText checkbox displayed for line charts with number dataset and labels", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, {
        type: "line",
        labelRange: "C2:C4",
        dataSets: [{ dataRange: "B2:B4" }],
      });
      await mountChartSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeTruthy();
    });

    test("labelAsText checkbox not displayed for pie charts", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "pie" });
      await mountChartSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox not displayed for bar charts", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "bar" });
      await mountChartSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox not displayed for text labels", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line" });
      updateChart(model, chartId, { labelRange: "A2:A4", dataSets: [{ dataRange: "B2:B4" }] });
      await mountChartSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox displayed for date labels", async () => {
      setFormat(model, "C2:C4", "m/d/yyyy");
      createTestChart("basicChart");
      updateChart(model, chartId, {
        type: "line",
        labelRange: "C2:C4",
        dataSets: [{ dataRange: "B2:B4" }],
      });
      await mountChartSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeTruthy();
    });

    test("labelAsText checkbox updates the chart", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, {
        type: "line",
        labelRange: "C2:C4",
        dataSets: [{ dataRange: "B2:B4" }],
      });
      await mountChartSidePanel();

      expect(
        (model.getters.getChartDefinition(chartId) as LineChartDefinition).labelsAsText
      ).toBeFalsy();

      await simulateClick("input[name='labelsAsText']");
      expect(
        (model.getters.getChartDefinition(chartId) as LineChartDefinition).labelsAsText
      ).toBeTruthy();
    });

    test("labelAsText checkbox not displayed for text labels with date format", async () => {
      createTestChart("basicChart");
      setFormat(model, "C2:C4", "m/d/yyyy");
      updateChart(model, chartId, {
        type: "line",
        labelRange: "A2:A4",
        dataSets: [{ dataRange: "B2:B4" }],
      });
      await mountChartSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox not displayed for charts with empty labels", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, {
        type: "line",
        labelRange: "F2:F4",
        dataSets: [{ dataRange: "B2:B4" }],
      });
      await mountChartSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("Side panel correctly reacts to has_header checkbox check/uncheck (with only one point)", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, {
        type: "line",
        labelRange: "C2",
        dataSets: [{ dataRange: "A1" }],
        dataSetsHaveTitle: false,
      });
      await mountChartSidePanel();

      const checkbox = document.querySelector<HTMLInputElement>("input[name='dataSetsHaveTitle']")!;
      expect(checkbox.checked).toBe(false);

      await simulateClick(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    test("Side panel correctly reacts to has_header checkbox check/uncheck (with two datasets)", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, {
        type: "line",
        labelRange: "C2",
        dataSets: [{ dataRange: "A1:A2" }, { dataRange: "A1" }],
        dataSetsHaveTitle: false,
      });
      await mountChartSidePanel();

      const checkbox = document.querySelector<HTMLInputElement>("input[name='dataSetsHaveTitle']")!;
      expect(checkbox.checked).toBe(false);

      expect(checkbox.checked).toBe(false);
      expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).dataSets).toEqual([
        { dataRange: "A1:A2" },
        { dataRange: "A1" },
      ]);

      await simulateClick(checkbox);
      expect(checkbox.checked).toBe(true);
      expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).dataSets).toEqual([
        { dataRange: "A1:A2" },
        { dataRange: "A1" },
      ]);

      await simulateClick(checkbox);
      expect(checkbox.checked).toBe(false);
      expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).dataSets).toEqual([
        { dataRange: "A1:A2" },
        { dataRange: "A1" },
      ]);
    });
  });

  test("showValues checkbox updates the chart", async () => {
    createTestChart("basicChart");
    updateChart(model, chartId, {
      type: "line",
      labelRange: "C2:C4",
      dataSets: [{ dataRange: "B2:B4" }],
    });
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);

    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).showValues
    ).toBeFalsy();

    let options = getChartConfiguration(model, chartId).options;
    expect(options.plugins.chartShowValuesPlugin.showValues).toBeFalsy();

    await simulateClick("input[name='showValues']");
    expect(
      (model.getters.getChartDefinition(chartId) as LineChartDefinition).showValues
    ).toBeTruthy();

    options = getChartConfiguration(model, chartId).options;
    expect(options.plugins.chartShowValuesPlugin.showValues).toBeTruthy();
  });

  describe("aggregate", () => {
    test.each(["bar", "pie", "line", "scatter", "combo"] as const)(
      "aggregate checkbox is checked for string-count charts",
      async (type: "bar" | "pie" | "line" | "scatter" | "combo") => {
        setCellContent(model, "A1", "London");
        setCellContent(model, "A2", "Berlin");
        setCellContent(model, "A3", "Paris");
        setCellContent(model, "A4", "Paris");
        createChart(
          model,
          {
            dataSets: [{ dataRange: "K1:K6" }],
            labelRange: "K1:K6",
            aggregated: true,
            legendPosition: "top",
            type,
            dataSetsHaveTitle: false,
            title: { text: "" },
          },
          chartId,
          sheetId
        );
        await mountChartSidePanel();

        const checkbox = document.querySelector("input[name='aggregated']") as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      }
    );

    test("aggregate value is kept when changing chart type", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { aggregated: true, type: "pie" });
      await mountChartSidePanel();

      for (const chartType of ["bar", "line", "scatter", "pie"] as const) {
        await changeChartType(chartType);
        const checkbox = document.querySelector("input[name='aggregated']") as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      }
    });

    test("dataSetsHaveTitle value is kept when changing to a chart without aggregate option then back again", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { dataSetsHaveTitle: true, type: "pie" });
      await mountChartSidePanel();
      let checkbox = document.querySelector("input[name='dataSetsHaveTitle']") as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      await changeChartType("gauge");
      expect(document.querySelector("input[name='dataSetsHaveTitle']")).toBeFalsy();

      await changeChartType("pie");
      checkbox = document.querySelector("input[name='dataSetsHaveTitle']") as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe("trend line", () => {
    beforeEach(() => {
      //@prettier-ignore
      setGrid(model, {
        A1: "1",
        B1: "1",
        A2: "2",
        B2: "4",
        A3: "3",
        B3: "27",
        A4: "4",
        B4: "64",
      });
    });
    test.each(["bar", "line", "scatter", "combo"] as const)(
      "trend line check/uncheck",
      async (type: "bar" | "line" | "scatter" | "combo") => {
        createChart(
          model,
          {
            dataSets: [{ dataRange: "B1:B4" }],
            labelRange: "A1:A4",
            type,
            dataSetsHaveTitle: false,
          },
          chartId,
          sheetId
        );
        await mountChartSidePanel(chartId);
        await openChartDesignSidePanel(model, env, fixture, chartId);

        const checkbox = document.querySelector("input[name='showTrendLine']") as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
        let runtime = model.getters.getChartRuntime(chartId) as BarChartRuntime;
        expect(runtime.chartJsConfig.data.datasets.length).toEqual(1);

        await simulateClick(checkbox);
        let definition = model.getters.getChartDefinition(chartId) as ChartWithAxisDefinition;
        expect(definition.dataSets[0].trend).toEqual({
          type: "polynomial",
          order: 1,
          display: true,
        });
        runtime = model.getters.getChartRuntime(chartId) as BarChartRuntime;
        expect(runtime.chartJsConfig.data.datasets.length).toEqual(2);

        await simulateClick(checkbox);
        definition = model.getters.getChartDefinition(chartId) as ChartWithAxisDefinition;
        expect(definition.dataSets[0].trend).toEqual({
          type: "polynomial",
          order: 1,
          display: false,
        });
        runtime = model.getters.getChartRuntime(chartId) as BarChartRuntime;
        expect(runtime.chartJsConfig.data.datasets.length).toEqual(1);
      }
    );

    test.each(["bar", "line", "scatter", "combo"] as const)(
      "Can change trend type",
      async (type: "bar" | "line" | "scatter" | "combo") => {
        createChart(
          model,
          {
            dataSets: [
              { dataRange: "B1:B4", trend: { type: "polynomial", order: 3, display: true } },
            ],
            labelRange: "A1:A4",
            type,
            dataSetsHaveTitle: false,
          },
          chartId,
          sheetId
        );
        await mountChartSidePanel(chartId);
        await openChartDesignSidePanel(model, env, fixture, chartId);

        let definition = model.getters.getChartDefinition(chartId) as ChartWithAxisDefinition;
        expect(definition.dataSets[0].trend).toEqual({
          type: "polynomial",
          order: 3,
          display: true,
        });

        for (const trendType of ["exponential", "logarithmic", "linear"]) {
          setInputValueAndTrigger(".trend-type-selector", trendType);
          definition = model.getters.getChartDefinition(chartId) as ChartWithAxisDefinition;
          if (trendType === "linear") {
            expect(definition.dataSets[0].trend?.type).toEqual("polynomial");
            expect(definition.dataSets[0].trend?.order).toEqual(1);
          } else {
            expect(definition.dataSets[0].trend?.type).toEqual(trendType);
          }
        }
      }
    );

    test.each(["bar", "line", "scatter", "combo"] as const)(
      "Can change polynome degree",
      async (type: "bar" | "line" | "scatter" | "combo") => {
        createChart(
          model,
          {
            dataSets: [
              { dataRange: "B1:B4", trend: { type: "polynomial", order: 3, display: true } },
            ],
            labelRange: "A1:A4",
            type,
            dataSetsHaveTitle: false,
          },
          chartId,
          sheetId
        );
        await mountChartSidePanel(chartId);
        await openChartDesignSidePanel(model, env, fixture, chartId);

        let definition = model.getters.getChartDefinition(chartId) as ChartWithAxisDefinition;
        expect(definition.dataSets[0].trend).toEqual({
          type: "polynomial",
          order: 3,
          display: true,
        });

        setInputValueAndTrigger(".trend-order-input", "2");
        definition = model.getters.getChartDefinition(chartId) as ChartWithAxisDefinition;
        expect(definition.dataSets[0].trend?.order).toEqual(2);
      }
    );

    test.each(["bar", "line", "scatter", "combo"] as const)(
      "Polynome degree choices are limited by the number of points",
      async (type: "bar" | "line" | "scatter" | "combo") => {
        createChart(
          model,
          {
            dataSets: [
              { dataRange: "B1:B5", trend: { type: "polynomial", order: 3, display: true } },
            ],
            labelRange: "A1:A5",
            type,
            dataSetsHaveTitle: false,
          },
          chartId,
          sheetId
        );
        await mountChartSidePanel(chartId);
        await openChartDesignSidePanel(model, env, fixture, chartId);

        const selectElement = fixture.querySelector(".trend-order-input") as HTMLSelectElement;
        const optionValues = [...selectElement.options].map((o) => o.value);
        expect(optionValues).toEqual(["1", "2", "3", "4"]);
      }
    );

    test.each(["bar", "line", "scatter", "combo"] as const)(
      "Can change trend line color",
      async (type: "bar" | "line" | "scatter" | "combo") => {
        createChart(
          model,
          {
            dataSets: [
              {
                dataRange: "B1:B4",
                trend: { type: "polynomial", order: 3, display: true },
                backgroundColor: "#ff0000",
              },
            ],
            labelRange: "A1:A4",
            type,
            dataSetsHaveTitle: false,
          },
          chartId,
          sheetId
        );
        await mountChartSidePanel(chartId);
        await openChartDesignSidePanel(model, env, fixture, chartId);

        let runtime = model.getters.getChartRuntime(chartId) as BarChartRuntime;
        expect(runtime.chartJsConfig.data.datasets[1].borderColor).toBe("#FF8080");

        let color_menu = fixture.querySelectorAll(".o-round-color-picker-button")[2];
        await click(color_menu);
        await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");

        runtime = model.getters.getChartRuntime(chartId) as BarChartRuntime;
        expect(runtime.chartJsConfig.data.datasets[1].borderColor).toBe("#EFEFEF");
      }
    );
  });

  test("When a figure is selected, pressing Ctrl+A will not propagate to the grid to select all cells", async () => {
    await mountSpreadsheet();
    selectCell(model, "A1");
    createTestChart("gauge");
    await nextTick();

    await simulateClick(".o-figure");
    await keyDown({ key: "A", ctrlKey: true });

    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
  });

  test("Can undo multiple times after pasting figure", async () => {
    await mountSpreadsheet();
    setCellContent(model, "D6", "HELLO");
    createTestChart("gauge");
    await nextTick();
    env.model.dispatch("SELECT_FIGURE", { id: chartId });
    await nextTick();

    copy(model);
    await simulateClick(".o-grid-overlay", 0, 0);
    paste(model, "A1");
    await nextTick();

    await keyDown({ key: "Z", ctrlKey: true });
    expect(model.getters.getChartIds(sheetId)).toHaveLength(1);

    await keyDown({ key: "Y", ctrlKey: true });
    expect(model.getters.getChartIds(sheetId)).toHaveLength(2);

    await keyDown({ key: "Z", ctrlKey: true });
    await keyDown({ key: "Z", ctrlKey: true });
    expect(model.getters.getChartIds(sheetId)).toHaveLength(0);

    await keyDown({ key: "Z", ctrlKey: true });
    expect(getCellContent(model, "D6")).toEqual("");
  });

  test("Pie chart border color matches the background color", async () => {
    createTestChart("basicChart");
    updateChart(model, chartId, { type: "pie", background: "#FF0000" });
    const runtime = model.getters.getChartRuntime(chartId) as PieChartRuntime;
    expect(runtime.chartJsConfig.data?.datasets?.[0].borderColor).toBe("#FF0000");
  });

  test("Chart is re-rendered if its label format change", async () => {
    await mountSpreadsheet();
    const updateChart = jest.spyOn((window as any).Chart.prototype, "update");
    createTestChart("basicChart");
    await nextTick();
    setCellFormat(model, "B2", "#,##0.00");
    await nextTick();
    expect(updateChart).toHaveBeenCalled();
  });

  test("Chart is re-rendered once if window.devicePixelRatio changes", async () => {
    await mountSpreadsheet();
    const updateChart = jest.spyOn((window as any).Chart.prototype, "update");
    createTestChart("basicChart");
    await nextTick();
    expect(updateChart).not.toHaveBeenCalled();
    window.devicePixelRatio = 2;
    parent.render(true);
    await nextTick();
    expect(updateChart).toHaveBeenCalled();
  });

  test("Cannot change series axis on horizontal bar chart", async () => {
    createChart(model, { type: "bar", horizontal: true }, chartId);
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);
    expect(fixture.querySelector(".o-vertical-axis-selection ")).toBeNull();
  });
});

describe("charts with multiple sheets", () => {
  beforeEach(async () => {
    mockChartData = mockChart();
    const data = {
      sheets: [
        {
          name: "Sheet1",
          cells: {
            B1: { content: "first dataset" },
            B2: { content: "12" },
            B3: { content: "13" },
            B4: { content: "14" },
            C1: { content: "second dataset" },
            C2: { content: "2" },
            C3: { content: "3" },
            C4: { content: "4" },
            A2: { content: "Emily Anderson (Emmy)" },
            A3: { content: "Sophie Allen (Saffi)" },
            A4: { content: "Chloe Adams" },
          },
        },
        {
          name: "Sheet2",
          figures: [
            {
              id: chartId,
              tag: "chart",
              width: 400,
              height: 300,
              x: 100,
              y: 100,
              data: {
                type: "line",
                title: { text: "demo chart" },
                labelRange: "Sheet1!A2:A4",
                dataSets: [{ dataRange: "Sheet1!B1:B4" }, { dataRange: "Sheet1!C1:C4" }],
                dataSetsHaveTitle: true,
                background: "#FFFFFF",
              },
            },
            {
              id: "2",
              tag: "chart",
              width: 400,
              height: 300,
              x: 500,
              y: 300,
              data: {
                type: "scorecard",
                title: { text: "demo scorecard" },
                baseline: "Sheet1!A2:A4",
                keyValue: "Sheet1!B1:B4",
              },
            },
          ],
        },
      ],
    };
    model = new Model(data);
    await mountSpreadsheet();
  });

  test("delete sheet containing chart data does not crash", async () => {
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");
    model.dispatch("DELETE_SHEET", { sheetId: model.getters.getActiveSheetId() });
    const runtimeChart = model.getters.getChartRuntime(chartId);
    expect(runtimeChart).toBeDefined();
    await nextTick();
    expect(fixture.querySelector(".o-chart-container")).not.toBeNull();
  });
});

describe("Default background on runtime tests", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("Creating a 'basicChart' without background should have default background on runtime", async () => {
    createChart(model, { type: "bar", dataSets: [{ dataRange: "A1" }] }, chartId, sheetId);
    expect(model.getters.getChartDefinition(chartId)?.background).toBeUndefined();
    expect(model.getters.getChartRuntime(chartId).background).toBe(BACKGROUND_CHART_COLOR);
  });
  test("Creating a 'basicChart' without background and updating its type should have default background on runtime", async () => {
    createChart(model, { type: "bar", dataSets: [{ dataRange: "A1" }] }, chartId, sheetId);
    updateChart(model, chartId, { type: "line" }, sheetId);
    expect(model.getters.getChartDefinition(chartId)?.background).toBeUndefined();
    expect(model.getters.getChartRuntime(chartId).background).toBe(BACKGROUND_CHART_COLOR);
  });
  test("Creating a 'basicChart' on a single cell with style and converting into scorecard should have cell background as chart background", () => {
    setStyle(model, "A1", { fillColor: "#FA0000" }, sheetId);
    createChart(model, { type: "bar", dataSets: [{ dataRange: "A1" }] }, chartId, sheetId);
    updateChart(model, chartId, { type: "scorecard", keyValue: "A1" }, sheetId);
    expect(model.getters.getChartDefinition(chartId)?.background).toBeUndefined();
    expect(model.getters.getChartRuntime(chartId).background).toBe("#FA0000");
  });
});

test("ChartJS charts are correctly destroyed on chart deletion", async () => {
  model = new Model();
  await mountSpreadsheet();
  createChart(model, { type: "bar", dataSets: [{ dataRange: "A1" }] }, chartId);
  await nextTick();
  const spyDelete = jest.spyOn((window as any).Chart.prototype, "destroy");
  model.dispatch("DELETE_FIGURE", { id: chartId, sheetId: model.getters.getActiveSheetId() });
  await nextTick();
  expect(spyDelete).toHaveBeenCalled();
});

test("ChartJS charts are correctly destroyed and re-created when runtime change type but definition do not", async () => {
  model = new Model();
  await mountSpreadsheet();

  createChart(model, { type: "pie", isDoughnut: false }, chartId);
  expect(model.getters.getChartDefinition(chartId).type).toEqual("pie");
  expect(model.getters.getChartRuntime(chartId)).toMatchObject({
    chartJsConfig: { type: "pie" },
  });
  await nextTick();
  const spyConstructor = jest.spyOn((window as any).Chart.prototype, "constructorMock");
  const spyDelete = jest.spyOn((window as any).Chart.prototype, "destroy");

  updateChart(model, chartId, { isDoughnut: true }, sheetId);
  expect(model.getters.getChartDefinition(chartId).type).toEqual("pie");
  expect(model.getters.getChartRuntime(chartId)).toMatchObject({
    chartJsConfig: { type: "doughnut" },
  });

  await nextTick();
  expect(spyDelete).toHaveBeenCalled();
  expect(spyConstructor).toHaveBeenCalled();
});

test("ChartJS charts extensions are loaded when mounting a chart, and are only loaded once", async () => {
  window.Chart.registry.plugins["items"] = [];
  model = new Model();
  const spyRegister = jest.spyOn(window.Chart, "register");
  createChart(model, { type: "bar" }, chartId);
  await mountSpreadsheet();
  expect(spyRegister).toHaveBeenCalledTimes(2);
  expect(window.Chart.registry.plugins["items"]).toMatchObject([
    { id: "chartShowValuesPlugin" },
    { id: "waterfallLinesPlugin" },
  ]);

  createChart(model, { type: "line" }, "chart2");
  await nextTick();
  expect(spyRegister).toHaveBeenCalledTimes(2);
});

describe("Change chart type", () => {
  beforeEach(() => {
    model = new Model();
  });

  test.each(["bar", "line"] as const)(
    "Can change chart type between simple and stacked %s",
    async (type) => {
      const uiType = type === "bar" ? "column" : type;
      createChart(model, { type }, chartId);
      await mountChartSidePanel(chartId);

      const select = fixture.querySelector(".o-type-selector") as HTMLSelectElement;
      const stackedCheckbox = fixture.querySelector("input[name='stacked']") as HTMLInputElement;
      expect(select.value).toBe(uiType);
      expect(stackedCheckbox.checked).toBe(false);

      await changeChartType("stacked_" + uiType);
      expect(select.value).toBe("stacked_" + uiType);
      expect(model.getters.getChartDefinition(chartId)).toMatchObject({ type, stacked: true });
      expect(stackedCheckbox.checked).toBe(true);

      await click(stackedCheckbox);
      expect(stackedCheckbox.checked).toBe(false);
      expect(select.value).toBe(uiType);
      expect(model.getters.getChartDefinition(chartId)).toMatchObject({ type, stacked: false });
    }
  );

  test("Can change chart type between bar and horizontal bar chart", async () => {
    createChart(model, { type: "bar", horizontal: false }, chartId);
    await mountChartSidePanel(chartId);
    const select = fixture.querySelector(".o-type-selector") as HTMLSelectElement;

    updateChart(model, chartId, { horizontal: true }, sheetId);
    await nextTick();
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({ horizontal: true });
    expect(select.value).toBe("bar");

    await changeChartType("column");
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({ horizontal: false });
    expect(select.value).toBe("column");
  });

  test("Can change chart type between pie and doughnut chart", async () => {
    createChart(model, { type: "pie", isDoughnut: false }, chartId);
    await mountChartSidePanel(chartId);
    const select = fixture.querySelector(".o-type-selector") as HTMLSelectElement;

    updateChart(model, chartId, { isDoughnut: true }, sheetId);
    await nextTick();
    expect(model.getters.getChartRuntime(chartId)).toMatchObject({
      chartJsConfig: { type: "doughnut" },
    });
    expect(select.value).toBe("doughnut");

    await changeChartType("pie");
    expect(model.getters.getChartRuntime(chartId)).toMatchObject({
      chartJsConfig: { type: "pie" },
    });
    expect(select.value).toBe("pie");
  });

  test("Can change from (stacked)line to (stacked)area chart", async () => {
    createChart(model, { type: "line", stacked: false, fillArea: false }, chartId);
    await mountChartSidePanel(chartId);
    const select = fixture.querySelector(".o-type-selector") as HTMLSelectElement;

    updateChart(model, chartId, { fillArea: true }, sheetId);
    await nextTick();
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      stacked: false,
      fillArea: true,
    });
    expect(select.value).toBe("area");

    await changeChartType("stacked_area");
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      stacked: true,
      fillArea: true,
    });
    expect(select.value).toBe("stacked_area");

    updateChart(model, chartId, { fillArea: false }, sheetId);
    await nextTick();
    expect(model.getters.getChartDefinition(chartId)).toMatchObject({
      stacked: true,
      fillArea: false,
    });
    expect(select.value).toBe("stacked_line");
  });

  test("Changing chart type updates the stacked checkbox label accordingly", async () => {
    createChart(model, { type: "line" }, chartId);
    await mountChartSidePanel(chartId);

    expect(fixture.querySelector("label.o-checkbox")!.textContent).toBe("Stacked line chart");

    updateChart(model, chartId, { fillArea: true }, sheetId);
    await nextTick();
    expect(fixture.querySelector("label.o-checkbox")!.textContent).toBe("Stacked area chart");

    await changeChartType("bar");
    expect(fixture.querySelector("label.o-checkbox")!.textContent).toBe("Stacked bar chart");

    updateChart(model, chartId, { horizontal: false }, sheetId);
    await nextTick();
    expect(fixture.querySelector("label.o-checkbox")!.textContent).toBe("Stacked column chart");
  });
});
