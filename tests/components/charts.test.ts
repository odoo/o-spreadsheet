import { CommandResult, Model, Spreadsheet } from "../../src";
import { ChartTerms } from "../../src/components/translations_terms";
import { BACKGROUND_CHART_COLOR, MENU_WIDTH } from "../../src/constants";
import { toHex, toZone } from "../../src/helpers";
import { ChartDefinition } from "../../src/types";
import { BarChartDefinition } from "../../src/types/chart/bar_chart";
import { LineChartDefinition } from "../../src/types/chart/line_chart";
import {
  createChart,
  createGaugeChart,
  createScorecardChart,
  createSheet,
  paste,
  setStyle,
  updateChart,
} from "../test_helpers/commands_helpers";
import {
  setInputValueAndTrigger,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import {
  mockChart,
  MockClipboard,
  mountSpreadsheet,
  nextTick,
  spyDispatch,
  textContentAll,
} from "../test_helpers/helpers";

const TEST_CHART_DATA = {
  basicChart: {
    type: "bar" as const,
    dataSets: ["B1:B4"],
    labelRange: "A2:A4",
    dataSetsHaveTitle: true,
    title: "hello",
    background: BACKGROUND_CHART_COLOR,
    verticalAxisPosition: "left" as const,
    stacked: false,
    legendPosition: "top" as const,
  },
  scorecard: {
    type: "scorecard" as const,
    keyValue: "B1:B4",
    baseline: "A2:A4",
    title: "hello",
    baselineDescr: "description",
    baselineMode: "difference" as const,
  },
  gauge: {
    type: "gauge" as const,
    dataRange: "B1:B4",
    title: "hello",
    sectionRule: {
      rangeMin: "0",
      rangeMax: "100",
      colors: {
        lowerColor: "#6aa84f",
        middleColor: "#f1c232",
        upperColor: "#cc0000",
      },
      lowerInflectionPoint: {
        type: "number" as const,
        value: "33",
      },
      upperInflectionPoint: {
        type: "number" as const,
        value: "66",
      },
    },
  },
};

function createTestChart(type: string) {
  switch (type) {
    case "basicChart":
      createChart(model, TEST_CHART_DATA.basicChart, chartId);
      break;
    case "scorecard":
      createScorecardChart(model, TEST_CHART_DATA.scorecard, chartId);
      break;
    case "gauge":
      createGaugeChart(model, TEST_CHART_DATA.gauge, chartId);
      break;
  }
}

function errorMessages(): string[] {
  return textContentAll(".o-sidepanel-error div");
}

const originalGetBoundingClientRect = HTMLDivElement.prototype.getBoundingClientRect;
jest
  .spyOn(HTMLDivElement.prototype, "getBoundingClientRect")
  // @ts-ignore the mock should return a complete DOMRect, not only { top, left }
  .mockImplementation(function (this: HTMLDivElement) {
    if (this.className.includes("o-spreadsheet")) {
      return { top: 100, left: 200 };
    } else if (this.className.includes("o-chart-menu-item")) {
      return { top: 500, left: 500 };
    }
    return originalGetBoundingClientRect.call(this);
  });

let fixture: HTMLElement;
let model: Model;
let mockChartData = mockChart();
let chartId: string;
let sheetId: string;

let parent: Spreadsheet;

describe("figures", () => {
  beforeEach(async () => {
    const clipboard = new MockClipboard();
    Object.defineProperty(navigator, "clipboard", {
      get() {
        return clipboard;
      },
      configurable: true,
    });
    mockChartData = mockChart();
    chartId = "someuuid";
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
    ({ parent, model, fixture } = await mountSpreadsheet({ model: new Model(data) }));
    await nextTick();
    await nextTick();
    await nextTick();
  });

  test.each(["basicChart", "scorecard", "gauge"])("can export a chart %s", (chartType: string) => {
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
  test.each(["basicChart", "scorecard", "gauge"])(
    "charts have a menu button",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      expect(fixture.querySelector(".o-chart-menu-item")).not.toBeNull();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "charts don't have a menu button in dashboard mode",
    async (chartType: string) => {
      createTestChart(chartType);
      model.updateMode("dashboard");
      await nextTick();
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      expect(fixture.querySelector(".o-chart-menu-item")).toBeNull();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "charts don't have a menu button in readonly mode",
    async (chartType: string) => {
      createTestChart(chartType);
      model.updateMode("readonly");
      await nextTick();
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      expect(fixture.querySelector(".o-chart-menu-item")).toBeNull();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Click on Menu button open context menu in %s",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      await simulateClick(".o-figure");
      expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
      expect(fixture.querySelector(".o-chart-menu-item")).not.toBeNull();
      await simulateClick(".o-chart-menu-item");
      expect(fixture.querySelector(".o-menu")).not.toBeNull();
    }
  );

  test.each(["scorecard", "basicChart", "gauge"])(
    "Context menu is positioned according to the spreadsheet position in %s",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      const menuPopover = fixture.querySelector(".o-menu")?.parentElement;
      expect(menuPopover?.style.top).toBe(`${500 - 100}px`);
      expect(menuPopover?.style.left).toBe(`${500 - 200 - MENU_WIDTH}px`);
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Click on Delete button will delete the chart %s",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      expect(model.getters.getChartDefinition(chartId)).toMatchObject(TEST_CHART_DATA[chartType]);
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      await simulateClick(".o-figure");
      expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
      expect(fixture.querySelector(".o-chart-menu-item")).not.toBeNull();
      await simulateClick(".o-chart-menu-item");
      expect(fixture.querySelector(".o-menu")).not.toBeNull();
      const deleteButton = fixture.querySelector(".o-menu div[data-name='delete']")!;
      expect(deleteButton.textContent).toBe("Delete");
      await simulateClick(".o-menu div[data-name='delete']");
      expect(() => model.getters.getChartRuntime(chartId)).toThrow();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Can copy/paste a %s chart with its context menu",
    async (chartType: string) => {
      createTestChart(chartType);
      const chartRuntime = model.getters.getChartRuntime(chartId);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='copy']");
      paste(model, "A1");
      expect(model.getters.getChartIds(sheetId).length).toEqual(2);
      const chartIds = model.getters.getChartIds(sheetId);
      expect(model.getters.getChartRuntime(chartIds[1])).toEqual(chartRuntime);
      expect(model.getters.getChartRuntime(chartIds[0])).toEqual(chartRuntime);
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Can cut/paste a %s chart with its context menu",
    async (chartType: string) => {
      createTestChart(chartType);
      const chartRuntime = model.getters.getChartRuntime(chartId);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='cut']");
      paste(model, "A1");
      expect(() => model.getters.getChartRuntime(chartId)).toThrow();
      const chartIds = model.getters.getChartIds(sheetId);
      expect(chartIds.length).toEqual(1);
      expect(model.getters.getChartRuntime(chartIds[0])).toEqual(chartRuntime);
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Copied chart are selected",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='copy']");
      expect(model.getters.getSelectedFigureId()).toEqual(chartId);
      paste(model, "A1");
      expect(model.getters.getChartIds(sheetId).length).toEqual(2);
      const chartIds = model.getters.getChartIds(sheetId);
      expect(model.getters.getSelectedFigureId()).not.toEqual(chartId);
      expect(model.getters.getSelectedFigureId()).toEqual(chartIds[1]);
    }
  );

  test.each(["scorecard", "basicChart", "gauge"])(
    "Click on Edit button will prefill sidepanel",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      const editButton = fixture.querySelector(".o-menu div[data-name='edit']")!;
      expect(editButton.textContent).toBe("Edit");
      await simulateClick(".o-menu div[data-name='edit']");
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      const panelChartType = fixture.querySelectorAll(".o-input")[0];
      switch (chartType) {
        case "basicChart": {
          const dataSeries = fixture.querySelectorAll(
            ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
          )[0];
          const hasTitle = (dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement)
            .checked;
          const labels = fixture.querySelector(".o-data-labels");
          expect((panelChartType as HTMLSelectElement).value).toBe(TEST_CHART_DATA.basicChart.type);
          expect((dataSeries.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
            TEST_CHART_DATA.basicChart.dataSets[0]
          );
          expect(hasTitle).toBe(true);
          expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe(
            TEST_CHART_DATA.basicChart.labelRange
          );
          break;
        }
        case "scorecard": {
          const keyValue = fixture.querySelector(
            ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
          );
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
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "can edit charts %s",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      const editButton = fixture.querySelector(".o-menu div[data-name='edit']")!;
      expect(editButton.textContent).toBe("Edit");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      const dataSeries = fixture.querySelectorAll(
        ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
      )[0] as HTMLInputElement;
      const dataSeriesValues = dataSeries.querySelector("input");
      const dispatch = spyDispatch(parent);
      switch (chartType) {
        case "basicChart":
          const hasTitle = dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement;
          triggerMouseEvent(hasTitle, "click");
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
          setInputValueAndTrigger(dataSeriesValues, "B2:B4", "change");
          expect(dispatch).toHaveBeenLastCalledWith("CHANGE_RANGE", {
            value: "B2:B4",
            id: expect.anything(),
            rangeId: expect.anything(),
          });
          break;
      }
      await simulateClick(".o-panel .inactive");
      setInputValueAndTrigger(".o-chart-title input", "hello", "change");
      expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
        id: chartId,
        sheetId,
        definition: {
          ...model.getters.getChartDefinition(chartId),
          title: "hello",
        },
      });
    }
  );

  test("changing property and selecting another chart doesn't change first chart", async () => {
    createChart(
      model,
      {
        dataSets: ["C1:C4"],
        labelRange: "A2:A4",
        type: "line",
        title: "old_title_1",
      },
      "1"
    );
    await nextTick();
    createChart(
      model,
      {
        dataSets: ["C1:C4"],
        labelRange: "A2:A4",
        type: "line",
        title: "old_title_2",
      },
      "2"
    );
    await nextTick();

    const figures = fixture.querySelectorAll(".o-figure");
    await simulateClick(figures[0] as HTMLElement);
    await simulateClick(".o-chart-menu-item");
    await simulateClick(".o-menu div[data-name='edit']");
    await simulateClick(".o-panel .inactive");
    await simulateClick(".o-chart-title input");
    setInputValueAndTrigger(".o-chart-title input", "first_title", "input");

    await simulateClick(figures[1] as HTMLElement);
    expect(model.getters.getChartDefinition("1").title).toBe("old_title_1");
    expect(model.getters.getChartDefinition("2").title).toBe("old_title_2");
  });

  test("selecting a chart then selecting another chart and editing property change the second chart", async () => {
    createChart(
      model,
      {
        dataSets: ["C1:C4"],
        labelRange: "A2:A4",
        type: "line",
        title: "old_title_1",
      },
      "1"
    );
    await nextTick();
    createChart(
      model,
      {
        dataSets: ["C1:C4"],
        labelRange: "A2:A4",
        type: "line",
        title: "old_title_2",
      },
      "2"
    );
    await nextTick();

    const figures = fixture.querySelectorAll(".o-figure");
    await simulateClick(figures[0] as HTMLElement);
    await simulateClick(".o-chart-menu-item");
    await simulateClick(".o-menu div[data-name='edit']");
    await simulateClick(".o-panel .inactive");
    await simulateClick(figures[1] as HTMLElement);
    await simulateClick(".o-chart-title input");
    setInputValueAndTrigger(".o-chart-title input", "new_title", "change");

    expect(model.getters.getChartDefinition("1").title).toBe("old_title_1");
    expect(model.getters.getChartDefinition("2").title).toBe("new_title");
  });

  test.each(["basicChart", "scorecard"])(
    "can edit charts %s background",
    async (chartType: string) => {
      createTestChart(chartType);
      const dispatch = spyDispatch(parent);

      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      const editButton = fixture.querySelector(".o-menu div[data-name='edit']")!;
      expect(editButton.textContent).toBe("Edit");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      await simulateClick(".o-panel-element.inactive");
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      const colorpickerButton = fixture.querySelector(".o-with-color-picker span");
      await simulateClick(colorpickerButton);
      await nextTick();
      const colorpickerItems = fixture.querySelectorAll(
        ".o-color-picker-line-item"
      ) as NodeListOf<HTMLElement>;
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
      if (chartType === "basicChart") {
        const figureCanvas = fixture.querySelector(".o-figure-canvas");
        expect(figureCanvas!.classList).toContain("w-100");
        expect(figureCanvas!.classList).toContain("h-100");
      }
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Clicking in the design panel closes the color picker",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      const editButton = fixture.querySelector(".o-menu div[data-name='edit']")!;
      expect(editButton.textContent).toBe("Edit");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      await simulateClick(".o-panel-element.inactive");
      await nextTick();
      const designPanelBody = fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart");
      expect(designPanelBody).toBeTruthy();
      const colorpickerButton = fixture.querySelector(".o-with-color-picker span");
      await simulateClick(colorpickerButton);
      await nextTick();
      expect(fixture.querySelectorAll(".o-color-picker-line-item").length).not.toBe(0);

      await simulateClick(designPanelBody);
      expect(fixture.querySelectorAll(".o-color-picker-line-item").length).toBe(0);
    }
  );

  test.each([
    ["basicChart", [".o-data-labels"], ["labelRange"]],
    ["scorecard", [".o-data-labels"], ["baseline"]],
  ])("remove ranges in chart %s", async (chartType: string, rangesDomClasses, nameInChartDef) => {
    createTestChart(chartType);
    await nextTick();

    for (let i = 0; i < rangesDomClasses.length; i++) {
      const domClass = rangesDomClasses[i];
      const attrName = nameInChartDef[i];
      expect(model.getters.getChartDefinition(chartId)?.[attrName]).not.toBeUndefined();
      parent.env.model.dispatch("SELECT_FIGURE", { id: chartId });
      parent.env.openSidePanel("ChartPanel");
      await nextTick();
      await simulateClick(domClass + " input");
      setInputValueAndTrigger(domClass + " input", "", "change");
      await nextTick();
      await simulateClick(domClass + " .o-selection-ok");
      expect(
        (parent.model.getters.getChartDefinition(chartId) as ChartDefinition)[attrName]
      ).toBeUndefined();
    }
  });

  test("drawing of chart will receive new data after update", async () => {
    createTestChart("basicChart");
    await nextTick();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu-item");
    const editButton = fixture.querySelector(".o-menu div[data-name='edit']")!;
    expect(editButton.textContent).toBe("Edit");
    await simulateClick(".o-menu div[data-name='edit']");
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
    const chartType = fixture.querySelectorAll(".o-input")[0] as HTMLSelectElement;
    const dataSeries = fixture.querySelectorAll(
      ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
    )[0] as HTMLInputElement;
    const dataSeriesValues = dataSeries.querySelector("input");
    const hasTitle = dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement;
    setInputValueAndTrigger(chartType, "pie", "change");
    await nextTick();
    setInputValueAndTrigger(dataSeriesValues, "B2:B5", "change");
    triggerMouseEvent(hasTitle, "click");
    await nextTick();
    // dataSetsHaveTitle is not propagated
    expect((mockChartData.data! as any).datasets[0].data).toEqual([
      "first column dataset",
      10,
      11,
      12,
    ]);
    expect(mockChartData.type).toBe("pie");
    expect((mockChartData.options!.title as any).text).toBe("hello");
  });

  test("updating a chart from another sheet does not change it s sheetId", async () => {
    createTestChart("basicChart");
    await nextTick();

    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu-item");
    await simulateClick(".o-menu div[data-name='edit']");

    createSheet(model, { sheetId: "42", activate: true });
    await nextTick();
    const chartType = fixture.querySelectorAll(".o-input")[0] as HTMLSelectElement;
    setInputValueAndTrigger(chartType, "pie", "change");
    await nextTick();

    expect(model.getters.getChart(chartId)?.sheetId).toBe(sheetId);

    const dataSeries = fixture.querySelectorAll(
      ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
    )[0] as HTMLInputElement;
    const dataSeriesValues = dataSeries.querySelector("input");
    const hasTitle = dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement;
    setInputValueAndTrigger(dataSeriesValues, "B2:B5", "change");
    triggerMouseEvent(hasTitle, "click");
    await nextTick();
    expect(model.getters.getChart(chartId)?.sheetId).toBe(sheetId);
  });

  test.each(["basicChart", "scorecard", "gauge"])(
    "deleting chart %s will close sidePanel",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='delete']");
      expect(() => model.getters.getChartRuntime("someuuid")).toThrow();
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
    }
  );

  describe.each(["basicChart", "scorecard", "gauge"])(
    "selecting other chart will adapt sidepanel",
    (chartType: string) => {
      test.each(["click", "SELECT_FIGURE command"])(
        "when using %s",
        async (selectMethod: string) => {
          createTestChart(chartType);
          await nextTick();

          createChart(
            model,
            {
              dataSets: ["C1:C4"],
              labelRange: "A2:A4",
              title: "second",
              type: "line",
            },
            "secondChartId"
          );
          await nextTick();
          const figures = fixture.querySelectorAll(".o-figure");
          await simulateClick(figures[0] as HTMLElement);
          await simulateClick(".o-chart-menu-item");
          await simulateClick(".o-menu div[data-name='edit']");
          await nextTick();
          expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();

          if (selectMethod === "click") {
            await simulateClick(figures[1] as HTMLElement);
          } else {
            model.dispatch("SELECT_FIGURE", { id: "secondChartId" });
          }

          await nextTick();
          const panelChartType = fixture.querySelectorAll(".o-input")[0];
          const dataSeries = fixture.querySelectorAll(
            ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
          )[0];
          const hasTitle = (dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement)
            .checked;
          const labels = fixture.querySelector(".o-data-labels");
          expect((panelChartType as HTMLSelectElement).value).toBe("line");
          expect((dataSeries.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
            "C1:C4"
          );
          expect(hasTitle).toBe(true);
          expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe(
            "A2:A4"
          );
          await simulateClick(".o-panel .inactive");
          expect((fixture.querySelector(".o-panel .inactive") as HTMLElement).textContent).toBe(
            " Configuration "
          );
        }
      );
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Selecting a figure and hitting Ctrl does not unselect it",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      expect(model.getters.getSelectedFigureId()).toBe("someuuid");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Control", bubbles: true })
      );
      expect(model.getters.getSelectedFigureId()).toBe("someuuid");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Control", bubbles: true })
      );

      expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    }
  );

  test("Can remove the last data series", async () => {
    createTestChart("basicChart");
    await nextTick();

    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu-item");
    await simulateClick(".o-menu div[data-name='edit']");
    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    setInputValueAndTrigger(element, "C1:C4", "change");
    await nextTick();
    await simulateClick(".o-data-series .o-selection-ok");
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      "B1:B4",
      "C1:C4",
    ]);
    const remove = document.querySelectorAll(".o-data-series .o-remove-selection")[1];
    await simulateClick(remove);
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      "B1:B4",
    ]);
  });

  test.each(["basicChart", "scorecard"])(
    "Can open context menu on right click",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      triggerMouseEvent(".o-chart-container", "contextmenu");
      await nextTick();
      expect(document.querySelectorAll(".o-menu").length).toBe(1);
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Cannot open context menu on right click in dashboard mode",
    async (chartType: string) => {
      createTestChart(chartType);
      model.updateMode("dashboard");
      await nextTick();

      triggerMouseEvent(".o-chart-container", "contextmenu");
      await nextTick();
      expect(document.querySelector(".o-menu")).toBeFalsy();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Cannot open context menu on right click in readonly mode",
    async (chartType: string) => {
      createTestChart(chartType);
      model.updateMode("readonly");
      await nextTick();

      triggerMouseEvent(".o-chart-container", "contextmenu");
      await nextTick();
      expect(document.querySelector(".o-menu")).toBeFalsy();
    }
  );

  describe("Chart error messages", () => {
    test.each([
      ["basicChart", []],
      ["scorecard", []],
    ])(
      "update basic chart with empty labels/baseline",
      async (chartType: string, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await nextTick();

        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu-item");
        await simulateClick(".o-menu div[data-name='edit']");

        await simulateClick(".o-data-labels input");
        setInputValueAndTrigger(".o-data-labels input", "", "change");
        await nextTick();
        await simulateClick(".o-data-labels .o-selection-ok");

        const expectedErrors = expectedResults.map((result) =>
          ChartTerms.Errors[result].toString()
        );

        expect(errorMessages()).toEqual(expectedErrors);
      }
    );

    test.each([
      ["basicChart", [CommandResult.InvalidDataSet]],
      ["scorecard", [CommandResult.InvalidScorecardKeyValue]],
      ["gauge", [CommandResult.InvalidGaugeDataRange]],
    ])(
      "update chart with invalid dataset/keyValue/dataRange",
      async (chartType: string, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await nextTick();

        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu-item");
        await simulateClick(".o-menu div[data-name='edit']");
        await simulateClick(".o-data-series input");
        setInputValueAndTrigger(".o-data-series input", "This is not valid", "change");
        await nextTick();
        await simulateClick(".o-data-series .o-selection-ok");
        expect(errorMessages()).toEqual(
          expectedResults.map((result) => ChartTerms.Errors[result].toString())
        );
      }
    );

    test.each([
      ["basicChart", [CommandResult.InvalidLabelRange]],
      ["scorecard", [CommandResult.InvalidScorecardBaseline]],
    ])(
      "update chart with invalid labels/baseline",
      async (chartType: string, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await nextTick();

        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu-item");
        await simulateClick(".o-menu div[data-name='edit']");
        await simulateClick(".o-data-labels input");
        setInputValueAndTrigger(".o-data-labels input", "this is not valid", "change");
        await nextTick();
        await simulateClick(".o-data-labels .o-selection-ok");
        expect(errorMessages()).toEqual(
          expectedResults.map((result) => ChartTerms.Errors[result].toString())
        );
      }
    );

    describe("update chart with invalid section rule", () => {
      beforeEach(async () => {
        createTestChart("gauge");
        await nextTick();
        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu-item");
        await simulateClick(".o-menu div[data-name='edit']");
        // change configuration panel to design panel
        await simulateClick(".o-panel-design");
      });

      test("empty rangeMin", async () => {
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "", "input");
        setInputValueAndTrigger(".o-data-range-min", "", "change");
        await nextTick();
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.EmptyGaugeRangeMin].toString()
        );
      });

      test("NaN rangeMin", async () => {
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "I'm not a number", "input");
        setInputValueAndTrigger(".o-data-range-min", "I'm not a number", "change");
        await nextTick();
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeRangeMinNaN].toString()
        );
      });

      test("empty rangeMax", async () => {
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "", "input");
        setInputValueAndTrigger(".o-data-range-max", "", "change");
        await nextTick();
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.EmptyGaugeRangeMax].toString()
        );
      });

      test("NaN rangeMax", async () => {
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "I'm not a number", "input");
        setInputValueAndTrigger(".o-data-range-max", "I'm not a number", "change");
        await nextTick();
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeRangeMaxNaN].toString()
        );
      });

      test("rangeMin > rangeMax", async () => {
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "100", "input");
        setInputValueAndTrigger(".o-data-range-min", "100", "change");
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "0", "input");
        setInputValueAndTrigger(".o-data-range-max", "0", "change");
        await nextTick();
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeRangeMinBiggerThanRangeMax].toString()
        );
      });

      test("NaN LowerInflectionPoint", async () => {
        await simulateClick(".o-input-lowerInflectionPoint");
        setInputValueAndTrigger(".o-input-lowerInflectionPoint", "I'm not a number", "input");
        setInputValueAndTrigger(".o-input-lowerInflectionPoint", "I'm not a number", "change");
        await nextTick();
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeLowerInflectionPointNaN].toString()
        );
      });

      test("NaN UpperInflectionPoint", async () => {
        await simulateClick(".o-input-upperInflectionPoint");
        setInputValueAndTrigger(".o-input-upperInflectionPoint", "I'm not a number", "input");
        setInputValueAndTrigger(".o-input-upperInflectionPoint", "I'm not a number", "change");
        await nextTick();
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeUpperInflectionPointNaN].toString()
        );
      });
    });

    test.each(["scorecard"])("error displayed on input fields", async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      parent.env.model.dispatch("SELECT_FIGURE", { id: chartId });
      parent.env.openSidePanel("ChartPanel");
      await nextTick();

      // empty dataset/key value
      await simulateClick(".o-data-series input");
      setInputValueAndTrigger(".o-data-series input", "", "change");
      await nextTick();
      await simulateClick(".o-data-series .o-selection-ok");
      expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
      expect(document.querySelector(".o-data-labels input")?.classList).not.toContain("o-invalid");

      // invalid labels/baseline
      await simulateClick(".o-data-labels input");
      setInputValueAndTrigger(".o-data-labels input", "Invalid Label Range", "change");
      await simulateClick(".o-data-labels .o-selection-ok");
      expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
      expect(document.querySelector(".o-data-labels input")?.classList).toContain("o-invalid");
    });

    describe("gauge > error displayed on input fields", () => {
      beforeEach(async () => {
        createTestChart("gauge");
        await nextTick();
        parent.env.model.dispatch("SELECT_FIGURE", { id: chartId });
        parent.env.openSidePanel("ChartPanel");
        await nextTick();
      });

      test("empty dataRange", async () => {
        await simulateClick(".o-data-series input");
        setInputValueAndTrigger(".o-data-series input", "", "input");
        setInputValueAndTrigger(".o-data-series input", "", "change");
        await nextTick();
        await simulateClick(".o-data-series .o-selection-ok");
        expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
      });

      test("empty rangeMin", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "", "input");
        setInputValueAndTrigger(".o-data-range-min", "", "change");
        await nextTick();
        expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
      });

      test("NaN rangeMin", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "bla bla bla", "input");
        setInputValueAndTrigger(".o-data-range-min", "bla bla bla", "change");
        await nextTick();
        expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
      });

      test("empty rangeMax", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "", "input");
        setInputValueAndTrigger(".o-data-range-max", "", "change");
        await nextTick();
        expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
      });

      test("NaN rangeMax", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "bla bla bla", "input");
        setInputValueAndTrigger(".o-data-range-max", "bla bla bla", "change");
        await nextTick();
        expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
      });

      test("rangeMin > rangeMax", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "100", "input");
        setInputValueAndTrigger(".o-data-range-min", "100", "change");
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "0", "input");
        setInputValueAndTrigger(".o-data-range-max", "0", "change");
        await nextTick();
        expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
        expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
      });

      test("NaN LowerInflectionPoint", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-input-lowerInflectionPoint");
        setInputValueAndTrigger(".o-input-lowerInflectionPoint", "bla bla bla", "input");
        setInputValueAndTrigger(".o-input-lowerInflectionPoint", "bla bla bla", "change");
        await nextTick();
        expect(document.querySelector(".o-input-lowerInflectionPoint")?.classList).toContain(
          "o-invalid"
        );
      });

      test("NaN UpperInflectionPoint", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-input-upperInflectionPoint");
        setInputValueAndTrigger(".o-input-upperInflectionPoint", "bla bla bla", "input");
        setInputValueAndTrigger(".o-input-upperInflectionPoint", "bla bla bla", "change");
        await nextTick();
        expect(document.querySelector(".o-input-upperInflectionPoint")?.classList).toContain(
          "o-invalid"
        );
      });
    });
  });

  test.each(["basicChart", "scorecard"])(
    "Can open context menu on right click",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();
      triggerMouseEvent(".o-chart-container", "contextmenu");
      await nextTick();
      expect(document.querySelector(".o-menu")).not.toBeNull();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Can edit a chart with empty main range without traceback",
    async (chartType: string) => {
      createTestChart(chartType);
      updateChart(model, chartId, { keyValue: undefined, dataRange: undefined, dataSets: [] });
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();

      const input = fixture.querySelector("input.o-required");
      await simulateClick(input);
      await nextTick();
      expect(fixture.querySelector(".o-figure")).toBeTruthy();
    }
  );

  describe("Scorecard specific tests", () => {
    test("can edit chart baseline colors", async () => {
      createTestChart("scorecard");
      const dispatch = spyDispatch(parent);
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      const editButton = fixture.querySelector(".o-menu div[data-name='edit']")!;
      expect(editButton.textContent).toBe("Edit");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      await simulateClick(".o-panel-element.inactive");
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();

      // Change color of "up" value of baseline
      const colorpickerUpButton = fixture.querySelectorAll(".o-with-color-picker span")[1];
      await simulateClick(colorpickerUpButton);
      await nextTick();
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
      const colorpickerDownButton = fixture.querySelectorAll(".o-with-color-picker span")[2];
      await simulateClick(colorpickerDownButton);
      await nextTick();
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
      updateChart(model, chartId, { type: "line", labelRange: "C2:C4", dataSets: ["B2:B4"] });
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      expect(document.querySelector("input[name='labelsAsText']")).toBeTruthy();
    });

    test("labelAsText checkbox not displayed for pie charts", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "pie" });
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox not displayed for bar charts", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "bar" });
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox not displayed for text labels", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line" });
      updateChart(model, chartId, { labelRange: "A2:A4", dataSets: ["B2:B4"] });
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox displayed for date labels", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("C2:C4")],
        format: "m/d/yyyy",
      });
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line", labelRange: "C2:C4", dataSets: ["B2:B4"] });
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      expect(document.querySelector("input[name='labelsAsText']")).toBeTruthy();
    });

    test("labelAsText checkbox updates the chart", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line", labelRange: "C2:C4", dataSets: ["B2:B4"] });
      await nextTick();
      expect(
        (model.getters.getChartDefinition(chartId) as LineChartDefinition).labelsAsText
      ).toBeFalsy();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      await simulateClick("input[name='labelsAsText']");
      expect(
        (model.getters.getChartDefinition(chartId) as LineChartDefinition).labelsAsText
      ).toBeTruthy();
    });

    test("labelAsText checkbox not displayed for text labels with date format", async () => {
      createTestChart("basicChart");
      await nextTick();
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A2:A4")],
        format: "m/d/yyyy",
      });
      updateChart(model, chartId, { type: "line", labelRange: "A2:A4", dataSets: ["B2:B4"] });
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox not displayed for charts with empty labels", async () => {
      createTestChart("basicChart");
      await nextTick();
      updateChart(model, chartId, { type: "line", labelRange: "F2:F4", dataSets: ["B2:B4"] });
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("Side panel correctly reacts to has_header checkbox check/uncheck (with only one point)", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line", labelRange: "C2", dataSets: ["A1"] });
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");

      const checkbox = document.querySelector("input[name='labelsAsText']") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      await simulateClick(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    test("Side panel correctly reacts to has_header checkbox check/uncheck (with two datasets)", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line", labelRange: "C2", dataSets: ["A1:A2", "A1"] });
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");

      const checkbox = document.querySelector("input[name='labelsAsText']") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      expect(checkbox.checked).toBe(false);
      expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).dataSets).toEqual([
        "A1:A2",
        "A1",
      ]);

      await simulateClick(checkbox);
      expect(checkbox.checked).toBe(true);
      expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).dataSets).toEqual([
        "A1:A2",
        "A1",
      ]);

      await simulateClick(checkbox);
      expect(checkbox.checked).toBe(false);
      expect((model.getters.getChartDefinition(chartId) as LineChartDefinition).dataSets).toEqual([
        "A1:A2",
        "A1",
      ]);
    });
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
              id: "1",
              tag: "chart",
              width: 400,
              height: 300,
              x: 100,
              y: 100,
              data: {
                type: "line",
                title: "demo chart",
                labelRange: "Sheet1!A2:A4",
                dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
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
                title: "demo scorecard",
                baseline: "Sheet1!A2:A4",
                keyValue: "Sheet1!B1:B4",
              },
            },
          ],
        },
      ],
    };
    ({ parent, model, fixture } = await mountSpreadsheet({ model: new Model(data) }));
    await nextTick();
  });

  test("delete sheet containing chart data does not crash", async () => {
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");
    model.dispatch("DELETE_SHEET", { sheetId: model.getters.getActiveSheetId() });
    const runtimeChart = model.getters.getChartRuntime("1");
    expect(runtimeChart).toBeDefined();
    await nextTick();
    expect(fixture.querySelector(".o-chart-container")).not.toBeNull();
  });
});

describe("Default background on runtime tests", () => {
  beforeEach(async () => {
    ({ parent, fixture, model } = await mountSpreadsheet({ model: new Model() }));
    await nextTick();
  });

  test("Creating a 'basicChart' without background should have default background on runtime", async () => {
    createChart(model, { dataSets: ["A1"] }, "1", sheetId);
    expect(model.getters.getChartDefinition("1")?.background).toBeUndefined();
    expect(model.getters.getChartRuntime("1").background).toBe(BACKGROUND_CHART_COLOR);
  });
  test("Creating a 'basicChart' without background and updating its type should have default background on runtime", async () => {
    createChart(model, { dataSets: ["A1"] }, "1", sheetId);
    updateChart(model, "1", { type: "line" }, sheetId);
    expect(model.getters.getChartDefinition("1")?.background).toBeUndefined();
    expect(model.getters.getChartRuntime("1").background).toBe(BACKGROUND_CHART_COLOR);
  });
  test("Creating a 'basicChart' on a single cell with style and converting into scorecard should have cell background as chart background", () => {
    setStyle(model, "A1", { fillColor: "#FA0000" }, sheetId);
    createChart(model, { dataSets: ["A1"] }, "1", sheetId);
    updateChart(model, "1", { type: "scorecard", keyValue: "A1" }, sheetId);
    expect(model.getters.getChartDefinition("1")?.background).toBeUndefined();
    expect(model.getters.getChartRuntime("1").background).toBe("#FA0000");
  });
});
