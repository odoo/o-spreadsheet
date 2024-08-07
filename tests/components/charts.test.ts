import { Model, Spreadsheet } from "../../src";
import { BACKGROUND_CHART_COLOR, MENU_WIDTH } from "../../src/constants";
import { DispatchResult } from "../../src/types";
import { createChart, hideColumns, hideRows } from "../test_helpers/commands_helpers";
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
  textContentAll,
} from "../test_helpers/helpers";

function errorMessages(): string[] {
  return textContentAll(".o-sidepanel-error div");
}

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

let fixture: HTMLElement;
let model: Model;
let mockChartData = mockChart();
let chartId: string;

let parent: Spreadsheet;
describe("figures", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    mockChartData = mockChart();
    chartId = "someuuid";
    const data = {
      sheets: [
        {
          name: "Sheet1",
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
    parent = await mountSpreadsheet(fixture, { data });
    model = parent.model;
    await nextTick();
    createChart(
      model,
      {
        dataSets: ["B1:B4"],
        labelRange: "A2:A4",
        title: "hello",
      },
      chartId
    );
    await nextTick();
  });
  afterEach(() => {
    parent.destroy();
    fixture.remove();
  });
  test("can export a chart", () => {
    const data = model.exportData();
    const activeSheetId = model.getters.getActiveSheetId();
    const sheet = data.sheets.find((s) => s.id === activeSheetId)!;
    expect(sheet.figures).toEqual([
      {
        data: {
          dataSets: ["B1:B4"],
          labelRange: "A2:A4",
          dataSetsHaveTitle: true,
          title: "hello",
          type: "bar",
          background: BACKGROUND_CHART_COLOR,
          verticalAxisPosition: "left",
          stackedBar: false,
          legendPosition: "top",
        },
        id: "someuuid",
        height: 335,
        tag: "chart",
        width: 536,
        x: 0,
        y: 0,
      },
    ]);
  });
  test("charts have a menu button", () => {
    expect(fixture.querySelector(".o-figure")).toBeDefined();
    expect(fixture.querySelector(".o-chart-menu")).toBeDefined();
  });

  test("Click on Menu button open context menu", async () => {
    expect(fixture.querySelector(".o-figure")).toBeDefined();
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
    expect(fixture.querySelector(".o-chart-menu")).toBeDefined();
    await simulateClick(".o-chart-menu");
    expect(fixture.querySelector(".o-menu")).toBeDefined();
  });

  test("Context menu is positioned according to the spreadsheet position", async () => {
    const originalGetBoundingClientRect = HTMLDivElement.prototype.getBoundingClientRect;
    jest
      .spyOn(HTMLDivElement.prototype, "getBoundingClientRect")
      // @ts-ignore the mock should return a complete DOMRect, not only { top, left }
      .mockImplementation(function (this: HTMLDivElement) {
        if (this.className.includes("o-spreadsheet")) {
          return { top: 100, left: 200 };
        } else if (this.className.includes("o-chart-container")) {
          return { top: 500, left: 500 };
        }
        return originalGetBoundingClientRect.call(this);
      });

    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    const menuPopover = fixture.querySelector(".o-menu")?.parentElement;
    expect(menuPopover?.style.top).toBe(`${500 - 100}px`);
    expect(menuPopover?.style.left).toBe(`${500 - 200 - MENU_WIDTH}px`);
  });

  test("Click on Delete button will delete the chart", async () => {
    expect(model.getters.getChartDefinition("someuuid")).toMatchObject({
      dataSets: [
        {
          dataRange: {
            prefixSheet: false,
            zone: {
              bottom: 3,
              left: 1,
              right: 1,
              top: 0,
            },
          },
          labelCell: {
            prefixSheet: false,
            zone: {
              bottom: 0,
              left: 1,
              right: 1,
              top: 0,
            },
          },
        },
      ],
      labelRange: {
        prefixSheet: false,
        zone: {
          bottom: 3,
          left: 0,
          right: 0,
          top: 1,
        },
      },
      title: "hello",
      type: "bar",
    });
    expect(fixture.querySelector(".o-figure")).toBeDefined();
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
    expect(fixture.querySelector(".o-chart-menu")).toBeDefined();
    await simulateClick(".o-chart-menu");
    expect(fixture.querySelector(".o-menu")).toBeDefined();
    const deleteButton = fixture.querySelectorAll(".o-menu-item")[1];
    expect(deleteButton.textContent).toBe("Delete");
    await simulateClick(".o-menu div[data-name='delete']");
    expect(model.getters.getChartRuntime("someuuid")).toBeUndefined();
  });

  test("Click on Edit button will prefill sidepanel", async () => {
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    const editButton = fixture.querySelectorAll(".o-menu-item")[0];
    expect(editButton.textContent).toBe("Edit");
    await simulateClick(".o-menu div[data-name='edit']");
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
    const chartType = fixture.querySelectorAll(".o-input")[0];
    const dataSeries = fixture.querySelectorAll(
      ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
    )[0];
    const hasTitle = (dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement).checked;
    const labels = fixture.querySelector(".o-data-labels");
    expect((chartType as HTMLSelectElement).value).toBe("bar");
    expect((dataSeries.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
      "B1:B4"
    );
    expect(hasTitle).toBe(true);
    expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe("A2:A4");
  });

  test("can edit charts", async () => {
    const chartId = "someuuid";
    const sheetId = model.getters.getActiveSheetId();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    const editButton = fixture.querySelectorAll(".o-menu-item")[0];
    expect(editButton.textContent).toBe("Edit");
    await simulateClick(".o-menu div[data-name='edit']");
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
    const chartType = fixture.querySelectorAll(".o-input")[0] as HTMLSelectElement;
    const dataSeries = fixture.querySelectorAll(
      ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
    )[0] as HTMLInputElement;
    const dataSeriesValues = dataSeries.querySelector("input");
    const hasTitle = dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement;
    parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
    setInputValueAndTrigger(chartType, "pie", "change");
    expect(parent.env.dispatch).toHaveBeenCalledWith("UPDATE_CHART", {
      id: chartId,
      sheetId,
      definition: {
        type: "pie",
      },
    });

    parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
    setInputValueAndTrigger(dataSeriesValues, "B2:B4", "change");
    triggerMouseEvent(hasTitle, "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("UPDATE_CHART", {
      id: chartId,
      sheetId,
      definition: {
        dataSets: ["B2:B4"],
        dataSetsHaveTitle: false,
      },
    });

    parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
    await simulateClick(".o-panel .inactive");
    setInputValueAndTrigger(".o-chart-title input", "hello", "change");
    expect(parent.env.dispatch).toHaveBeenCalledWith("UPDATE_CHART", {
      id: chartId,
      sheetId,
      definition: {
        title: "hello",
      },
    });
  });

  test("can edit chart background color", async () => {
    const chartId = "someuuid";
    const sheetId = model.getters.getActiveSheetId();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='edit']");

    parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
    await simulateClick(".o-panel .inactive");
    await simulateClick(".o-with-color-picker span");
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-color-picker")).toBeTruthy();
    await simulateClick(
      ".o-color-picker .o-color-picker-line .o-color-picker-line-item[data-color='#00ffff']"
    );
    expect(parent.env.dispatch).toHaveBeenCalledWith("UPDATE_CHART", {
      id: chartId,
      sheetId,
      definition: {
        background: "#00ffff",
      },
    });
    expect(fixture.querySelector(".o-chart-container canvas")!.classList).toContain("w-100");
    expect(fixture.querySelector(".o-chart-container canvas")!.classList).toContain("h-100");
  });

  test("remove labels", async () => {
    const model = parent.model;
    const sheetId = model.getters.getActiveSheetId();
    const figure = model.getters.getFigure(sheetId, chartId);
    expect(parent.model.getters.getChartDefinition(chartId)?.labelRange).not.toBeUndefined();
    parent.env.openSidePanel("ChartPanel", { figure });
    await nextTick();
    await simulateClick(".o-data-labels input");
    setInputValueAndTrigger(".o-data-labels input", "", "change");
    await simulateClick(".o-data-labels .o-selection-ok");
    expect(parent.model.getters.getChartDefinition(chartId)?.labelRange).toBeUndefined();
  });

  test("empty dataset and invalid label range display both errors", async () => {
    const model = parent.model;
    const sheetId = model.getters.getActiveSheetId();
    const figure = model.getters.getFigure(sheetId, chartId);
    parent.env.openSidePanel("ChartPanel", { figure });
    await nextTick();

    // empty dataset
    await simulateClick(".o-data-series input");
    setInputValueAndTrigger(".o-data-series input", "", "change");
    await simulateClick(".o-data-series .o-selection-ok");
    expect(parent.el?.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
    expect(parent.el?.querySelector(".o-data-labels input")?.classList).not.toContain("o-invalid");
    expect(errorMessages()).toEqual(["A dataset needs to be defined"]);

    // invalid labels
    await simulateClick(".o-data-labels input");
    setInputValueAndTrigger(".o-data-labels input", "Invalid Label Range", "change");
    await simulateClick(".o-data-labels .o-selection-ok");
    expect(parent.el?.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
    expect(parent.el?.querySelector(".o-data-labels input")?.classList).toContain("o-invalid");
    expect(errorMessages()).toEqual(["A dataset needs to be defined", "Labels are invalid"]);
  });

  test("drawing of chart will receive new data after update", async () => {
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    const editButton = fixture.querySelectorAll(".o-menu-item")[0];
    expect(editButton.textContent).toBe("Edit");
    await simulateClick(".o-menu div[data-name='edit']");
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
    expect((mockChartData.data! as any).labels).toEqual(["P1", "P2", "P3"]);
    expect((mockChartData.data! as any).datasets[0].data).toEqual([10, 11, 12, 13]);
    expect(mockChartData.type).toBe("pie");
    expect((mockChartData.options!.title as any).text).toBe("hello");
  });

  test("deleting chart will close sidePanel", async () => {
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='edit']");
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='delete']");
    expect(model.getters.getChartRuntime("someuuid")).toBeUndefined();
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
  });

  test("can refresh a chart", async () => {
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='edit']");
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
    await simulateClick(".o-menu div[data-name='refresh']");
    expect(parent.env.dispatch).toHaveBeenCalledWith("REFRESH_CHART", {
      id: "someuuid",
    });
  });

  test("selecting other chart will adapt sidepanel", async () => {
    createChart(model, { dataSets: ["C1:C4"], labelRange: "A2:A4", title: "second", type: "line" });
    await nextTick();
    const figures = fixture.querySelectorAll(".o-figure");
    await simulateClick(figures[0] as HTMLElement);
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='edit']");
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
    await simulateClick(figures[1] as HTMLElement);
    await nextTick();
    const chartType = fixture.querySelectorAll(".o-input")[0];
    const dataSeries = fixture.querySelectorAll(
      ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
    )[0];
    const hasTitle = (dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement).checked;
    const labels = fixture.querySelector(".o-data-labels");
    expect((chartType as HTMLSelectElement).value).toBe("line");
    expect((dataSeries.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
      "C1:C4"
    );
    expect(hasTitle).toBe(true);
    expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe("A2:A4");
    await simulateClick(".o-panel .inactive");
    expect((fixture.querySelector(".o-panel .inactive") as HTMLElement).textContent).toBe(
      "Configuration "
    );
  });

  test("Selecting a figure and hitting Ctrl does not unselect it", async () => {
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
  });

  test("update chart with empty dataset and empty labels", async () => {
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='edit']");

    await simulateClick(".o-data-series input");
    setInputValueAndTrigger(".o-data-series input", "", "change");
    await nextTick();
    await simulateClick(".o-data-series .o-selection-ok");

    expect(errorMessages()).toEqual(["A dataset needs to be defined"]);

    await simulateClick(".o-data-labels input");
    setInputValueAndTrigger(".o-data-labels input", "", "change");
    await nextTick();
    await simulateClick(".o-data-labels .o-selection-ok");

    expect(errorMessages()).toEqual(["A dataset needs to be defined"]);
  });

  test("update chart with invalid dataset and empty labels", async () => {
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='edit']");
    await simulateClick(".o-data-series input");
    setInputValueAndTrigger(".o-data-series input", "This is not valid", "change");
    await nextTick();
    await simulateClick(".o-data-series .o-selection-ok");
    expect(errorMessages()).toEqual(["The dataset is invalid"]);
  });

  test("update chart with invalid labels", async () => {
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='edit']");
    await simulateClick(".o-data-labels input");
    setInputValueAndTrigger(".o-data-labels input", "this is not valid", "change");
    await nextTick();
    await simulateClick(".o-data-labels .o-selection-ok");
    expect(errorMessages()).toEqual(["Labels are invalid"]);
  });

  test("hidden columns are filtered", () => {
    model = new Model({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
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
            C1: { content: "second column dataset" },
            C2: { content: "15" },
            C3: { content: "16" },
            C4: { content: "17" },
            C5: { content: "18" },
          },
        },
      ],
    });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    let chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets?.length).toEqual(2);
    hideColumns(model, ["C"]);
    chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets?.length).toEqual(1);
    expect(chart.data!.datasets![0].label).toBe("first column dataset");
  });

  test("hidden rows are filtered", () => {
    model = new Model({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
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
            C1: { content: "second column dataset" },
            C2: { content: "15" },
            C3: { content: "16" },
            C4: { content: "17" },
            C5: { content: "18" },
          },
        },
      ],
    });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    let chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data?.length).toEqual(4);
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3", "P4"]);
    hideRows(model, [2]);
    chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.datasets![0].data?.length).toEqual(3);
    expect(chart.data!.labels).toEqual(["P1", "P3", "P4"]);
  });

  test("hidden labels are replaced by numbers", () => {
    model = new Model({
      sheets: [
        {
          name: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
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
            C1: { content: "second column dataset" },
            C2: { content: "15" },
            C3: { content: "16" },
            C4: { content: "17" },
            C5: { content: "18" },
          },
        },
      ],
    });
    createChart(
      model,
      {
        dataSets: ["Sheet1!B1:B5", "Sheet1!C1:C5"],
        labelRange: "Sheet1!A2:A5",
        dataSetsHaveTitle: true,
        type: "line",
      },
      "1"
    );
    let chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.labels).toEqual(["P1", "P2", "P3", "P4"]);
    hideColumns(model, ["A"]);
    chart = model.getters.getChartRuntime("1")!;
    expect(chart.data!.labels).toEqual(["0", "1", "2", "3"]);
  });

  test("Can remove the last data series", async () => {
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='edit']");
    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    setInputValueAndTrigger(element, "C1:C4", "change");
    await nextTick();
    await simulateClick(".o-data-series .o-selection-ok");
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getChartDefinitionUI(sheetId, chartId)!.dataSets).toEqual([
      "B1:B4",
      "C1:C4",
    ]);
    const remove = document.querySelectorAll(".o-data-series .o-remove-selection")[1];
    await simulateClick(remove);
    expect(model.getters.getChartDefinitionUI(sheetId, chartId)!.dataSets).toEqual(["B1:B4"]);
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
              },
            },
          ],
        },
      ],
    };
    parent = await mountSpreadsheet(fixture, { data });
    model = parent.model;
    await nextTick();
  });
  afterEach(() => {
    fixture.remove();
  });
  test("delete sheet containing chart data does not crash", async () => {
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");
    model.dispatch("DELETE_SHEET", { sheetId: model.getters.getActiveSheetId() });
    const runtimeChart = model.getters.getChartRuntime("1");
    expect(runtimeChart).toBeDefined();
    await nextTick();
    expect(fixture.querySelector(".o-chart-container")).toBeDefined();
  });
});
