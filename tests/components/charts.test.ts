import { App } from "@odoo/owl";
import { CommandResult, Model, Spreadsheet } from "../../src";
import { ChartTerms } from "../../src/components/translations_terms";
import { BACKGROUND_CHART_COLOR, MENU_WIDTH } from "../../src/constants";
import { toHex, toZone } from "../../src/helpers";
import { createChart, createScorecardChart, updateChart } from "../test_helpers/commands_helpers";
import {
  setInputValueAndTrigger,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import {
  makeTestFixture,
  mockChart,
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
    stackedBar: false,
    labelsAsText: false,
    legendPosition: "top" as const,
  },
  scorecard: {
    type: "scorecard" as const,
    keyValue: "B1:B4",
    baseline: "A2:A4",
    title: "hello",
    baselineDescr: "description",
    baselineMode: "absolute" as const,
  },
};

function createTestChart(type: string) {
  if (type === "basicChart") {
    createChart(model, TEST_CHART_DATA.basicChart, chartId);
  } else if (type === "scorecard") {
    createScorecardChart(model, TEST_CHART_DATA.scorecard, chartId);
  }
}

function getChartUIDefinition(chartType: string) {
  if (chartType === "basicChart") {
    return model.getters.getBasicChartDefinitionUI(sheetId, chartId);
  } else if (chartType === "scorecard") {
    return model.getters.getScorecardChartDefinitionUI(sheetId, chartId);
  }
  return;
}

function getChartRuntime(chartType: string) {
  if (chartType === "basicChart") {
    return model.getters.getBasicChartRuntime(chartId);
  } else if (chartType === "scorecard") {
    return model.getters.getScorecardChartRuntime(chartId);
  }
  return;
}

function errorMessages(): string[] {
  return textContentAll(".o-sidepanel-error div");
}

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

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
let app: App;
describe("figures", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
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
    ({ app, parent } = await mountSpreadsheet(fixture, { model: new Model(data) }));
    model = parent.model;
    await nextTick();
    await nextTick();
    await nextTick();
  });
  afterEach(() => {
    app.destroy();
    fixture.remove();
  });
  test.each(["basicChart", "scorecard"])("can export a chart %s", (chartType: string) => {
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
  test.each(["basicChart", "scorecard"])("charts have a menu button", async (chartType: string) => {
    createTestChart(chartType);
    await nextTick();
    expect(fixture.querySelector(".o-figure")).not.toBeNull();
    expect(fixture.querySelector(".o-chart-menu-item")).not.toBeNull();
  });

  test.each(["basicChart", "scorecard"])(
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

  test.each(["scorecard", "basicChart"])(
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

  test.each(["basicChart", "scorecard"])(
    "Click on Delete button will delete the chart %s",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      expect(getChartUIDefinition(chartType)).toMatchObject(TEST_CHART_DATA[chartType]);
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      await simulateClick(".o-figure");
      expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
      expect(fixture.querySelector(".o-chart-menu-item")).not.toBeNull();
      await simulateClick(".o-chart-menu-item");
      expect(fixture.querySelector(".o-menu")).not.toBeNull();
      const deleteButton = fixture.querySelectorAll(".o-menu-item")[1];
      expect(deleteButton.textContent).toBe("Delete");
      await simulateClick(".o-menu div[data-name='delete']");
      expect(getChartRuntime(chartType)).toBeUndefined();
    }
  );

  test.each(["scorecard", "basicChart"])(
    "Click on Edit button will prefill sidepanel",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      const editButton = fixture.querySelectorAll(".o-menu-item")[0];
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

  test.each(["basicChart", "scorecard"])("can edit charts %s", async (chartType: string) => {
    createTestChart(chartType);
    await nextTick();

    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu-item");
    const editButton = fixture.querySelectorAll(".o-menu-item")[0];
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
        setInputValueAndTrigger(dataSeriesValues, "B2:B4", "change");
        const hasTitle = dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement;
        triggerMouseEvent(hasTitle, "click");
        expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
          id: chartId,
          sheetId,
          definition: {
            dataSets: ["B2:B4"],
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
        title: "hello",
      },
    });
  });

  test.each(["basicChart", "scorecard"])(
    "can edit charts %s background",
    async (chartType: string) => {
      createTestChart(chartType);
      const dispatch = spyDispatch(parent);

      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      const editButton = fixture.querySelectorAll(".o-menu-item")[0];
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
          background: "#000000",
        },
      });
    }
  );

  test.each([
    ["basicChart", [".o-data-labels"], ["labelRange"]],
    ["scorecard", [".o-data-labels", ".o-data-series"], ["baseline", "keyValue"]],
  ])("remove ranges in chart %s", async (chartType: string, rangesDomClasses, nameInChartDef) => {
    createTestChart(chartType);
    await nextTick();

    const figure = model.getters.getFigure(sheetId, chartId);
    for (let i = 0; i < rangesDomClasses.length; i++) {
      const domClass = rangesDomClasses[i];
      const attrName = nameInChartDef[i];
      expect(getChartUIDefinition(chartType)?.[attrName]).not.toBeUndefined();
      parent.env.openSidePanel("ChartPanel", { figure });
      await nextTick();
      await simulateClick(domClass + " input");
      setInputValueAndTrigger(domClass + " input", "", "change");
      await nextTick();
      await simulateClick(domClass + " .o-selection-ok");
      expect(parent.model.getters.getBasicChartDefinition(chartId)?.[attrName]).toBeUndefined();
    }
  });

  test("drawing of chart will receive new data after update", async () => {
    createTestChart("basicChart");
    await nextTick();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu-item");
    const editButton = fixture.querySelectorAll(".o-menu-item")[0];
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
    setInputValueAndTrigger(dataSeriesValues, "B2:B5", "change");
    triggerMouseEvent(hasTitle, "click");
    await nextTick();
    expect((mockChartData.data! as any).labels).toEqual(["P1", "P2", "P3", ""]);
    expect((mockChartData.data! as any).datasets[0].data).toEqual([10, 11, 12, 13]);
    expect(mockChartData.type).toBe("pie");
    expect((mockChartData.options!.title as any).text).toBe("hello");
  });

  test.each(["basicChart", "scorecard"])(
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
      expect(model.getters.getBasicChartRuntime("someuuid")).toBeUndefined();
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
    }
  );

  test.each(["basicChart", "scorecard"])("can refresh a chart", async (chartType: string) => {
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
    const dispatch = spyDispatch(parent);
    await simulateClick(".o-menu div[data-name='refresh']");
    expect(dispatch).toHaveBeenCalledWith("REFRESH_CHART", {
      id: "someuuid",
    });
  });

  test.each(["basicChart", "scorecard"])(
    "selecting other chart will adapt sidepanel",
    async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      createChart(model, {
        dataSets: ["C1:C4"],
        labelRange: "A2:A4",
        title: "second",
        type: "line",
      });
      await nextTick();
      const figures = fixture.querySelectorAll(".o-figure");
      await simulateClick(figures[0] as HTMLElement);
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      await simulateClick(figures[1] as HTMLElement);
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
      expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe("A2:A4");
      await simulateClick(".o-panel .inactive");
      expect((fixture.querySelector(".o-panel .inactive") as HTMLElement).textContent).toBe(
        " Configuration "
      );
    }
  );

  test.each(["basicChart", "scorecard"])(
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
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getBasicChartDefinitionUI(sheetId, chartId)!.dataSets).toEqual([
      "B1:B4",
      "C1:C4",
    ]);
    const remove = document.querySelectorAll(".o-data-series .o-remove-selection")[1];
    await simulateClick(remove);
    expect(model.getters.getBasicChartDefinitionUI(sheetId, chartId)!.dataSets).toEqual(["B1:B4"]);
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

  describe("Chart error messages", () => {
    test.each([
      ["basicChart", [CommandResult.EmptyDataSet]],
      ["scorecard", [CommandResult.EmptyScorecardKeyValue]],
    ])(
      "update basic chart with empty dataset/keyValue and empty labels/baseline",
      async (chartType: string, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await nextTick();

        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu-item");
        await simulateClick(".o-menu div[data-name='edit']");

        await simulateClick(".o-data-series input");
        setInputValueAndTrigger(".o-data-series input", "", "change");
        await nextTick();
        await simulateClick(".o-data-series .o-selection-ok");

        const expectedErrors = expectedResults.map((result) =>
          ChartTerms.Errors[result].toString()
        );

        expect(errorMessages()).toEqual(expectedErrors);

        await simulateClick(".o-data-labels input");
        setInputValueAndTrigger(".o-data-labels input", "", "change");
        await nextTick();
        await simulateClick(".o-data-labels .o-selection-ok");

        expect(errorMessages()).toEqual(expectedErrors);
      }
    );

    test.each([
      ["basicChart", [CommandResult.InvalidDataSet]],
      ["scorecard", [CommandResult.InvalidScorecardKeyValue]],
    ])(
      "update basic chart with invalid dataset/key value and empty labels/baseline",
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

    test.each(["scorecard"])("error displayed on input fields", async (chartType: string) => {
      createTestChart(chartType);
      await nextTick();

      const model = parent.model;
      const sheetId = model.getters.getActiveSheetId();
      const figure = model.getters.getFigure(sheetId, chartId);
      parent.env.openSidePanel("ChartPanel", { figure });
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

  describe("Scorecard specific tests", () => {
    test("can edit chart baseline colors", async () => {
      createTestChart("scorecard");
      const dispatch = spyDispatch(parent);
      await nextTick();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      const editButton = fixture.querySelectorAll(".o-menu-item")[0];
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
          baselineColorUp: "#0000ff",
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
          baselineColorDown: "#ff0000",
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
      const sheetId = model.getters.getActiveSheetId();
      createTestChart("basicChart");
      updateChart(model, chartId, { type: "line", labelRange: "C2:C4", dataSets: ["B2:B4"] });
      await nextTick();
      expect(model.getters.getBasicChartDefinitionUI(sheetId, chartId)!.labelsAsText).toBeFalsy();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu-item");
      await simulateClick(".o-menu div[data-name='edit']");
      await simulateClick("input[name='labelsAsText']");
      expect(model.getters.getBasicChartDefinitionUI(sheetId, chartId)!.labelsAsText).toBeTruthy();
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
  });
});

describe("charts with multiple sheets", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
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
    ({ app, parent } = await mountSpreadsheet(fixture, { model: new Model(data) }));
    model = parent.model;
    await nextTick();
  });
  afterEach(() => {
    fixture.remove();
    app.destroy();
  });
  test("delete sheet containing chart data does not crash", async () => {
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");
    model.dispatch("DELETE_SHEET", { sheetId: model.getters.getActiveSheetId() });
    const runtimeChart = model.getters.getBasicChartRuntime("1");
    expect(runtimeChart).toBeDefined();
    await nextTick();
    expect(fixture.querySelector(".o-chart-container")).not.toBeNull();
  });
});
