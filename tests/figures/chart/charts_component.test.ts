import { CommandResult, Model, Spreadsheet } from "../../../src";
import { ChartTerms } from "../../../src/components/translations_terms";
import { BACKGROUND_CHART_COLOR } from "../../../src/constants";
import { toHex } from "../../../src/helpers";
import { ScorecardChart } from "../../../src/helpers/figures/charts";
import { CHART_TYPES, ChartDefinition, ChartType } from "../../../src/types";
import { BarChartDefinition } from "../../../src/types/chart/bar_chart";
import { LineChartDefinition } from "../../../src/types/chart/line_chart";
import {
  copy,
  createChart,
  createGaugeChart,
  createScorecardChart,
  createSheet,
  paste,
  setCellContent,
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
  mountSpreadsheet,
  nextTick,
  spyDispatch,
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
    case "line":
    case "bar":
    case "pie":
    case "scatter":
      createChart(model, { ...TEST_CHART_DATA.basicChart, type }, newChartId);
      break;
  }
}

function errorMessages(): string[] {
  return textContentAll(".o-validation-error");
}

async function openChartConfigSidePanel(id = chartId) {
  model.dispatch("SELECT_FIGURE", { id });
  parent.env.openSidePanel("ChartPanel");
  await nextTick();
}

async function openChartDesignSidePanel(id = chartId) {
  await openChartConfigSidePanel(id);
  await simulateClick(".o-panel-element.inactive");
}

let fixture: HTMLElement;
let model: Model;
let mockChartData = mockChart();
let chartId: string;
let sheetId: string;

let parent: Spreadsheet;

describe("charts", () => {
  beforeEach(async () => {
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
  });

  test.each(CHART_TYPES)("Can open a chart sidePanel", async (chartType) => {
    createTestChart(chartType);
    await openChartConfigSidePanel();
    expect(fixture.querySelector(".o-figure")).toBeTruthy();
  });

  test.each(["basicChart", "scorecard", "gauge"] as const)("can export a chart %s", (chartType) => {
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

  test.each(["basicChart", "scorecard", "gauge"] as const)(
    "charts have a menu button",
    async (chartType) => {
      createTestChart(chartType);
      await nextTick();
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      expect(fixture.querySelector(".o-figure-menu-item")).not.toBeNull();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"] as const)(
    "charts don't have a menu button in dashboard mode",
    async (chartType) => {
      createTestChart(chartType);
      model.updateMode("dashboard");
      await nextTick();
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      expect(fixture.querySelector(".o-figure-menu-item")).toBeNull();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"] as const)(
    "charts don't have a menu button in readonly mode",
    async (chartType) => {
      createTestChart(chartType);
      model.updateMode("readonly");
      await nextTick();
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      expect(fixture.querySelector(".o-chart-menu-item")).toBeNull();
    }
  );

  test.each(["scorecard", "basicChart", "gauge"] as const)(
    "Click on Edit button will prefill sidepanel",
    async (chartType) => {
      createTestChart(chartType);
      await openChartConfigSidePanel();

      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      const panelChartType = fixture.querySelectorAll(".o-sidePanel .o-input")[0];
      switch (chartType) {
        case "basicChart": {
          const dataSeries = fixture.querySelectorAll(
            ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
          )[0];
          const hasTitle = (
            fixture.querySelector(".o-use-row-as-headers input[type=checkbox]") as HTMLInputElement
          ).checked;
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

  test.each(["scorecard", "basicChart", "gauge"] as const)(
    "Double click on chart will open sidepanel",
    async (chartType) => {
      createTestChart(chartType);
      await nextTick();
      expect(document.querySelector(".o-chart-container")).toBeTruthy();
      await doubleClick(fixture, ".o-chart-container");
      expect(model.getters.getSelectedFigureId()).toBe("someuuid");
      expect(document.querySelector(".o-sidePanel")).toBeTruthy();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"] as const)(
    "can edit charts %s",
    async (chartType) => {
      createTestChart(chartType);
      await openChartConfigSidePanel();

      const dataSeries = fixture.querySelectorAll(
        ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
      )[0] as HTMLInputElement;
      const dataSeriesValues = dataSeries.querySelector("input");
      const dispatch = spyDispatch(parent);
      switch (chartType) {
        case "basicChart":
          await click(fixture.querySelector(".o-use-row-as-headers input[type=checkbox]")!);
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
          title: "hello",
        },
      });
    }
  );

  test("changing property and selecting another chart does not change first chart", async () => {
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
    await openChartDesignSidePanel("1");

    await simulateClick(".o-chart-title input");
    setInputValueAndTrigger(".o-chart-title input", "first_title", "onlyInput");

    const figures = fixture.querySelectorAll(".o-figure");
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
    await openChartDesignSidePanel("1");

    const figures = fixture.querySelectorAll(".o-figure");
    await simulateClick(figures[1] as HTMLElement);
    await simulateClick(".o-chart-title input");
    setInputValueAndTrigger(".o-chart-title input", "new_title");

    expect(model.getters.getChartDefinition("1").title).toBe("old_title_1");
    expect(model.getters.getChartDefinition("2").title).toBe("new_title");
  });

  test.each(["basicChart", "scorecard", "gauge"] as const)(
    "defocusing sidepanel after modifying chart title w/o saving should maintain the new title %s",
    async (chartType) => {
      createTestChart(chartType);
      await openChartDesignSidePanel();

      await simulateClick(".o-chart-title input");
      const chartTitle = document.querySelector(".o-chart-title input") as HTMLInputElement;
      expect(chartTitle.value).toBe("hello");
      setInputValueAndTrigger(".o-chart-title input", "hello_new_title");
      await simulateClick(".o-grid-overlay");
      expect(chartTitle.value).toBe("hello_new_title");
    }
  );

  test.each(["basicChart", "scorecard"] as const)(
    "can edit charts %s background",
    async (chartType) => {
      createTestChart(chartType);
      const dispatch = spyDispatch(parent);
      await openChartDesignSidePanel();

      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      const colorpickerButton = fixture.querySelector(
        ".o-chart-background-color .o-color-picker-widget .o-color-picker-button"
      );
      await simulateClick(colorpickerButton);
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

  test.each(["basicChart", "scorecard", "gauge"] as const)(
    "can close color picker when click elsewhere %s",
    async (chartType) => {
      createTestChart(chartType);
      openChartDesignSidePanel();

      await simulateClick(".o-color-picker-widget .o-color-picker-button");
      expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
      await simulateClick(".o-section-title");
      expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
    }
  );

  test.each([
    ["basicChart", [".o-data-labels"], ["labelRange"]],
    ["scorecard", [".o-data-labels"], ["baseline"]],
  ] as const)("remove ranges in chart %s", async (chartType, rangesDomClasses, nameInChartDef) => {
    createTestChart(chartType);
    await openChartConfigSidePanel();

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
    await openChartConfigSidePanel();

    const chartType = fixture.querySelectorAll(".o-sidePanel .o-input")[0] as HTMLSelectElement;
    const dataSeries = fixture.querySelectorAll(
      ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
    )[0] as HTMLInputElement;
    const dataSeriesValues = dataSeries.querySelector("input");
    const hasTitle = fixture.querySelector(
      ".o-use-row-as-headers input[type=checkbox]"
    ) as HTMLInputElement;
    await setInputValueAndTrigger(chartType, "pie");
    setInputValueAndTrigger(dataSeriesValues, "B2:B5");
    await click(hasTitle);
    // dataSetsHaveTitle is not propagated
    expect((mockChartData.data! as any).datasets[0].data).toEqual([
      "first column dataset",
      10,
      11,
      12,
    ]);
    expect(mockChartData.type).toBe("pie");
    expect((mockChartData.options?.plugins!.title as any).text).toBe("hello");
  });

  test("updating a chart from another sheet does not change it s sheetId", async () => {
    createTestChart("basicChart");
    await openChartConfigSidePanel();

    createSheet(model, { sheetId: "42", activate: true });
    const chartType = fixture.querySelectorAll(".o-sidePanel .o-input")[0] as HTMLSelectElement;
    await setInputValueAndTrigger(chartType, "pie");

    expect(model.getters.getChart(chartId)?.sheetId).toBe(sheetId);

    const dataSeries = fixture.querySelectorAll(
      ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
    )[0] as HTMLInputElement;
    const dataSeriesValues = dataSeries.querySelector("input");
    const hasTitle = fixture.querySelector(
      ".o-use-row-as-headers input[type=checkbox]"
    ) as HTMLInputElement;
    setInputValueAndTrigger(dataSeriesValues, "B2:B5");
    await simulateClick(hasTitle);
    expect(model.getters.getChart(chartId)?.sheetId).toBe(sheetId);
  });

  test.each(["basicChart", "scorecard", "gauge"] as const)(
    "deleting chart %s will close sidePanel",
    async (chartType) => {
      createTestChart(chartType);
      await openChartConfigSidePanel();

      await simulateClick(".o-figure");
      await simulateClick(".o-figure-menu-item");
      await simulateClick(".o-menu div[data-name='delete']");
      expect(() => model.getters.getChartRuntime("someuuid")).toThrow();
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
    }
  );

  test("deleting another chart does not close the side panel", async () => {
    const figureId1 = "figureId1";
    const figureId2 = "figureId2";
    createTestChart("basicChart", figureId1);
    createTestChart("basicChart", figureId2);
    const sheetId = model.getters.getActiveSheetId();
    await openChartConfigSidePanel(figureId1);
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
    model.dispatch("DELETE_FIGURE", { id: figureId2, sheetId }); // could be deleted by another user
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
  });

  test("Deleting a chart with active selection input does not produce a traceback", async () => {
    createTestChart("basicChart");
    await openChartConfigSidePanel();

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[0];
    await setInputValueAndTrigger(element, "C1:C4");

    await simulateClick(".o-figure");
    await keyDown({ key: "Delete" });
    expect(fixture.querySelector(".o-figure")).toBeFalsy();
  });

  test("Undo a chart insertion will close the chart side panel", async () => {
    createTestChart("basicChart");
    await openChartConfigSidePanel();
    undo(model);
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel")).toBeFalsy();
  });

  test("double click a chart in readonly mode does not open the side panel", async () => {
    createTestChart("basicChart");
    await nextTick();

    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
    model.updateMode("readonly");
    expect(model.getters.getSelectedFigureId()).toBeNull();
    await nextTick();
    await doubleClick(fixture, ".o-chart-container");
    expect(fixture.querySelector(".o-sidePanel")).toBeFalsy();
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
  });

  describe.each(["basicChart", "scorecard", "gauge"] as const)(
    "selecting other chart will adapt sidepanel",
    (chartType) => {
      test.each(["click", "SELECT_FIGURE command"])(
        "when using %s",
        async (selectMethod: string) => {
          createTestChart(chartType);
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
          await openChartConfigSidePanel();
          expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();

          const figures = fixture.querySelectorAll(".o-figure");
          if (selectMethod === "click") {
            await simulateClick(figures[1]);
          } else {
            model.dispatch("SELECT_FIGURE", { id: "secondChartId" });
          }

          await nextTick();
          const panelChartType = fixture.querySelectorAll(".o-sidePanel .o-input")[0];
          const dataSeries = fixture.querySelectorAll(
            ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
          )[0];
          const hasTitle = (
            fixture.querySelector(".o-use-row-as-headers input[type=checkbox]") as HTMLInputElement
          ).checked;
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

  test("Can remove the last data series", async () => {
    createTestChart("basicChart");
    await openChartConfigSidePanel();

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    await setInputValueAndTrigger(element, "C1:C4");
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

  test("Can add multiple ranges all in once", async () => {
    createTestChart("basicChart");
    await openChartConfigSidePanel();

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    await setInputValueAndTrigger(element, "C1:D4");
    await simulateClick(".o-data-series .o-selection-ok");
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      "B1:B4",
      "C1:C4",
      "D1:D4",
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
        title: "old_title_1",
      },
      chartId
    );
    await openChartConfigSidePanel();

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    await setInputValueAndTrigger(element, "1:2");
    await simulateClick(".o-data-series .o-selection-ok");
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      "1:1",
      "2:2",
    ]);
  });

  test("Can add multiple ranges all in once with fullColumn range", async () => {
    createChart(
      model,
      {
        dataSets: [],
        labelRange: "A2:A4",
        type: "line",
        title: "old_title_1",
      },
      chartId
    );
    await openChartConfigSidePanel();

    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    await setInputValueAndTrigger(element, "A:B");
    await simulateClick(".o-data-series .o-selection-ok");
    expect((model.getters.getChartDefinition(chartId) as BarChartDefinition).dataSets).toEqual([
      "A:A",
      "B:B",
    ]);
  });

  describe("Chart error messages appear and don't need to click confirm", () => {
    test.each([
      ["basicChart" as const, []],
      ["scorecard" as const, []],
    ])(
      "update %s with empty labels/baseline",
      async (chartType, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await openChartConfigSidePanel();

        await simulateClick(".o-data-labels input");
        await setInputValueAndTrigger(".o-data-labels input", "");

        const expectedErrors = expectedResults.map((result) =>
          ChartTerms.Errors[result].toString()
        );

        expect(errorMessages()).toEqual(expectedErrors);
      }
    );

    test.each(["basicChart", "scorecard", "gauge"] as const)(
      "update chart with valid dataset/keyValue/dataRange show confirm button",
      async (chartType) => {
        createTestChart(chartType);
        await openChartConfigSidePanel();

        await simulateClick(".o-data-series input");
        await setInputValueAndTrigger(".o-data-series input", "A1");
        expect(fixture.querySelectorAll(".o-data-series .o-selection-ok").length).toBe(1);
      }
    );

    test.each(["basicChart", "scorecard", "gauge"] as const)(
      "update chart with invalid dataset/keyValue/dataRange hide confirm button",
      async (chartType) => {
        createTestChart(chartType);
        await openChartConfigSidePanel();

        await simulateClick(".o-data-series input");
        await setInputValueAndTrigger(".o-data-series input", "This is not valid");
        expect(fixture.querySelectorAll(".o-data-series .o-selection-ok").length).toBe(0);
      }
    );

    test("does not update the chart with an invalid dataset", async () => {
      createTestChart("basicChart");
      await openChartConfigSidePanel();

      await simulateClick(".o-data-series input");
      await setInputValueAndTrigger(".o-data-series input", "A1:A10--");
      await focusAndKeyDown(".o-data-series input", { key: "Enter" });

      expect(model.getters.getChartDefinition(chartId)).toMatchObject(TEST_CHART_DATA.basicChart);
    });

    test.each(["basicChart", "scorecard", "gauge"] as const)(
      "Clicking on reset button on dataset/keyValue/dataRange put back the last valid dataset/keyValue/dataRange",
      async (chartType) => {
        createTestChart(chartType);
        await openChartConfigSidePanel();

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

    test.each(["basicChart", "scorecard"] as const)(
      "resetting chart label works as expected",
      async (chartType) => {
        createTestChart(chartType);
        await openChartConfigSidePanel();

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

    describe("update chart with invalid section rule", () => {
      beforeEach(async () => {
        createTestChart("gauge");
        await openChartDesignSidePanel();
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
      await openChartConfigSidePanel();

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
        await openChartConfigSidePanel();
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

  test.each(["basicChart", "scorecard"] as const)(
    "Can open context menu on right click",
    async (chartType) => {
      createTestChart(chartType);
      await nextTick();
      triggerMouseEvent(".o-chart-container", "contextmenu");
      await nextTick();
      expect(document.querySelector(".o-menu")).not.toBeNull();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"] as const)(
    "Can edit a chart with empty main range without traceback",
    async (chartType) => {
      createTestChart(chartType);
      updateChart(model, chartId, { keyValue: undefined, dataRange: undefined, dataSets: [] });
      await openChartConfigSidePanel();
      await nextTick();

      const input = fixture.querySelector("input.o-required");
      await simulateClick(input);
      expect(fixture.querySelector(".o-figure")).toBeTruthy();
    }
  );

  describe("Scorecard specific tests", () => {
    test("can edit chart baseline colors", async () => {
      createTestChart("scorecard");
      const dispatch = spyDispatch(parent);
      await openChartDesignSidePanel();

      // Change color of "up" value of baseline
      const colorpickerUpButton = fixture.querySelectorAll(
        ".o-chart-baseline-color .o-color-picker-button"
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
        ".o-chart-baseline-color .o-color-picker-button"
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
      updateChart(model, chartId, { type: "line", labelRange: "C2:C4", dataSets: ["B2:B4"] });
      await openChartConfigSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeTruthy();
    });

    test("labelAsText checkbox not displayed for pie charts", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "pie" });
      await openChartConfigSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox not displayed for bar charts", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "bar" });
      await openChartConfigSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox not displayed for text labels", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line" });
      updateChart(model, chartId, { labelRange: "A2:A4", dataSets: ["B2:B4"] });
      await openChartConfigSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox displayed for date labels", async () => {
      setFormat(model, "C2:C4", "m/d/yyyy");
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line", labelRange: "C2:C4", dataSets: ["B2:B4"] });
      await openChartConfigSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeTruthy();
    });

    test("labelAsText checkbox updates the chart", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line", labelRange: "C2:C4", dataSets: ["B2:B4"] });
      await openChartConfigSidePanel();

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
      updateChart(model, chartId, { type: "line", labelRange: "A2:A4", dataSets: ["B2:B4"] });
      await openChartConfigSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("labelAsText checkbox not displayed for charts with empty labels", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line", labelRange: "F2:F4", dataSets: ["B2:B4"] });
      await openChartConfigSidePanel();

      expect(document.querySelector("input[name='labelsAsText']")).toBeFalsy();
    });

    test("Side panel correctly reacts to has_header checkbox check/uncheck (with only one point)", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line", labelRange: "C2", dataSets: ["A1"] });
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-figure-menu-item");
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
      await simulateClick(".o-figure-menu-item");
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

  describe("aggregate", () => {
    beforeEach(async () => {
      ({ parent, fixture, model } = await mountSpreadsheet({ model: new Model() }));
    });
    test.each(["bar", "pie", "line", "scatter"] as const)(
      "aggregate checkbox is checked for string-count charts",
      async (type: "bar" | "pie" | "line" | "scatter") => {
        setCellContent(model, "A1", "London");
        setCellContent(model, "A2", "Berlin");
        setCellContent(model, "A3", "Paris");
        setCellContent(model, "A4", "Paris");
        createChart(
          model,
          {
            dataSets: ["K1:K6"],
            labelRange: "K1:K6",
            aggregated: true,
            legendPosition: "top",
            type,
            dataSetsHaveTitle: false,
            title: "",
          },
          chartId,
          sheetId
        );
        await openChartConfigSidePanel();

        const checkbox = document.querySelector("input[name='aggregated']") as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      }
    );

    test("aggregate value is kept when changing chart type", async () => {
      createTestChart("basicChart");
      updateChart(model, chartId, { aggregated: true, type: "pie" });
      await openChartConfigSidePanel();

      for (const chartType of ["bar", "line", "scatter", "pie"] as const) {
        await setInputValueAndTrigger(".o-type-selector", chartType);
        const checkbox = document.querySelector("input[name='aggregated']") as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      }
    });
  });

  test("Can undo multiple times after pasting figure", async () => {
    setCellContent(model, "D6", "HELLO");
    createTestChart("gauge");
    await nextTick();
    parent.env.model.dispatch("SELECT_FIGURE", { id: chartId });
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
