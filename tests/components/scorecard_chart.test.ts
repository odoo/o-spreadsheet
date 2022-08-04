import { App } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import { toHex } from "../../src/helpers";
import {
  createScorecardChart,
  setCellContent,
  updateChart,
} from "../test_helpers/commands_helpers";
import { makeTestFixture, mountSpreadsheet, nextTick, target } from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let chartId: string;
let sheetId: string;

let parent: Spreadsheet;
let app: App;

function getChartElement(): HTMLElement {
  return fixture.querySelector(".o-figure")!;
}

function getChartTitleElement(): HTMLElement {
  return fixture.querySelector(".o-figure div.o-title-text")!;
}

function getChartKeyElement(): HTMLElement {
  return fixture.querySelector(".o-figure div.o-key-text")!;
}

function getChartBaselineElement(): HTMLElement {
  return fixture.querySelector(".o-figure div.o-baseline-text")!;
}

function getChartBaselineTextElement(): HTMLElement {
  return fixture.querySelector(".o-figure .o-baseline-text-value")!;
}

function getChartBaselineDescrElement(): HTMLElement {
  return fixture.querySelector(".o-figure .o-baseline-text-description")!;
}

function getElementFontSize(element: HTMLElement): number {
  const fontSizeAttr = element.style.fontSize;
  return Number(fontSizeAttr.slice(0, fontSizeAttr.length - 2));
}

function updateChartSize(width: number, height: number) {
  model.dispatch("UPDATE_FIGURE", {
    sheetId,
    id: chartId,
    x: 0,
    y: 0,
    width,
    height,
  });
}

function getChartBaselineTextContent() {
  const baseline = getChartBaselineElement()!;
  const spans = baseline.querySelectorAll("span");
  let text = "";
  for (let span of spans) {
    text += span.textContent;
  }
  return text;
}

describe("Scorecard charts", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
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
            A1: { content: "2" },
            A2: { content: "3" },
            B1: { content: "1" },
            B2: { content: "2" },
            B3: { content: "3" },
          },
        },
      ],
    };
    ({ app, parent } = await mountSpreadsheet(fixture, { model: new Model(data) }));
    model = parent.model;
    await nextTick();
    await nextTick();
  });
  afterEach(() => {
    app.destroy();
    fixture.remove();
  });

  test("Scorecard snapshot", async () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", title: "hello", baselineDescr: "description" },
      chartId
    );
    await nextTick();
    expect(getChartElement()).toMatchSnapshot();
  });

  test("Chart display correct info", async () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", title: "hello", baselineDescr: "description" },
      chartId
    );
    await nextTick();

    expect(getChartElement()).toBeTruthy();
    expect(getChartTitleElement()?.textContent).toEqual("hello");
    expect(getChartKeyElement()?.textContent).toEqual("2");
    expect(getChartBaselineTextContent()).toEqual("1 description");
  });

  test("Baseline = 0 correctly displayed", async () => {
    setCellContent(model, "B1", "0");
    setCellContent(model, "A1", "0");
    createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);
    await nextTick();

    expect(getChartElement()).toBeTruthy();
    expect(getChartKeyElement()?.textContent).toEqual("0");
    expect(getChartBaselineTextContent()).toEqual("0");
  });

  test("Percentage baseline display a percentage", async () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    await nextTick();

    expect(getChartElement()).toBeTruthy();
    expect(getChartBaselineTextContent()).toEqual("100%");
  });

  test("Baseline with mode 'text' is plainly displayed", async () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B1", baselineMode: "text" }, chartId);
    await nextTick();

    expect(getChartElement()).toBeTruthy();
    expect(getChartBaselineTextContent()).toEqual("1");
    expect(toHex(getChartBaselineTextElement()!.style["color"])).toEqual("#757575");
  });

  test("Key < baseline display in red with down arrow", async () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B3" }, chartId);
    await nextTick();

    const baselineElement = getChartBaselineElement();
    expect(baselineElement.querySelector("svg.arrow-down")).toBeTruthy();
    expect(toHex(baselineElement.querySelector("span")!.style["color"])).toEqual("#DC6965");
    expect(getChartBaselineTextContent()).toEqual("1");
  });

  test("Key > baseline display in green with up arrow", async () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);
    await nextTick();

    const baselineElement = getChartBaselineElement();
    expect(baselineElement.querySelector("svg.arrow-up")).toBeTruthy();
    expect(toHex(baselineElement.querySelector("span")!.style["color"])).toEqual("#00A04A");
    expect(getChartBaselineTextContent()).toEqual("1");
  });

  test("Key = baseline display default font color with no arrow", async () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B2" }, chartId);
    await nextTick();

    const baselineElement = getChartBaselineElement();
    expect(baselineElement.querySelector("svg")).toBeFalsy();
    expect(toHex(baselineElement.querySelector("span")!.style["color"])).toEqual("#757575");
    expect(getChartBaselineTextContent()).toEqual("0");
  });

  test("Key value is displayed with the cell format", async () => {
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      format: "0%",
    });
    createScorecardChart(model, { keyValue: "A1" }, chartId);
    await nextTick();
    expect(getChartKeyElement()?.textContent).toEqual("200%");
  });

  test("Baseline is displayed with the cell format", async () => {
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("B2"),
      format: "[$$]#,##0.00",
    });
    createScorecardChart(model, { keyValue: "A1", baseline: "B2" }, chartId);
    await nextTick();
    expect(getChartBaselineElement()?.textContent).toEqual("$0.00");
  });

  test("Key value and baseline are displayed with the cell style", async () => {
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      style: {
        textColor: "#FF0000",
        bold: true,
        italic: true,
        strikethrough: true,
        underline: true,
      },
    });
    createScorecardChart(model, { keyValue: "A1", baseline: "A1" }, chartId);
    await nextTick();
    for (const el of [getChartKeyElement()!, getChartBaselineTextElement()!]) {
      const style = el!.style;
      expect(style["font-style"]).toEqual("italic");
      expect(style["font-weight"]).toEqual("bold");
      expect(toHex(style["color"])).toEqual("#FF0000");
      expect(style["text-decoration"]).toEqual("line-through underline");
    }
  });

  test("Baseline mode percentage don't inherit of the style/format of the cell", async () => {
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      style: { bold: true },
      format: "0.0",
    });
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    await nextTick();
    expect(getChartBaselineTextElement()!.style["font-weight"]).not.toEqual("bold");
    expect(getChartBaselineTextContent()).toEqual("100%");
  });

  test("High contrast font colors with dark background", async () => {
    createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "A1",
        baselineDescr: "descr",
        title: "title",
        background: "#000000",
      },
      chartId
    );
    await nextTick();

    expect(toHex(getChartTitleElement()!.style["color"])).toEqual("#BBBBBB");
    expect(toHex(getChartBaselineTextElement()!.style["color"])).toEqual("#BBBBBB");
    expect(toHex(getChartBaselineDescrElement()!.style["color"])).toEqual("#BBBBBB");
    expect(toHex(getChartKeyElement()!.style["color"])).toEqual("#FFFFFF");
  });

  test("Increasing size of the chart scale up the font sizes", async () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );
    await nextTick();

    updateChartSize(100, 100);
    await nextTick();
    await nextTick();

    const baselineFontSize = getElementFontSize(getChartBaselineElement());
    const titleFontSize = getElementFontSize(getChartTitleElement());
    const keyFontSize = getElementFontSize(getChartKeyElement());

    updateChartSize(200, 200);
    await nextTick();

    expect(getElementFontSize(getChartBaselineElement())).toBeGreaterThan(baselineFontSize);
    expect(getElementFontSize(getChartTitleElement())).toEqual(titleFontSize);
    expect(getElementFontSize(getChartKeyElement())).toBeGreaterThan(keyFontSize);
  });

  test("Decreasing size of the chart scale down the font sizes", async () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );
    await nextTick();

    updateChartSize(200, 200);
    await nextTick();
    await nextTick();

    const baselineFontSize = getElementFontSize(getChartBaselineElement());
    const titleFontSize = getElementFontSize(getChartTitleElement());
    const keyFontSize = getElementFontSize(getChartKeyElement());

    updateChartSize(100, 100);
    await nextTick();

    expect(getElementFontSize(getChartBaselineElement())).toBeLessThan(baselineFontSize);
    expect(getElementFontSize(getChartTitleElement())).toEqual(titleFontSize);
    expect(getElementFontSize(getChartKeyElement())).toBeLessThan(keyFontSize);
  });

  test("Font size scale down if we put a long key value", async () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );
    await nextTick();
    const baselineFontSize = getElementFontSize(getChartBaselineElement());
    const titleFontSize = getElementFontSize(getChartTitleElement());
    const keyFontSize = getElementFontSize(getChartKeyElement());
    setCellContent(model, "A1", "123456789123456789123456879");
    await nextTick();
    expect(getElementFontSize(getChartBaselineElement())).toBeLessThan(baselineFontSize);
    expect(getElementFontSize(getChartTitleElement())).toEqual(titleFontSize);
    expect(getElementFontSize(getChartKeyElement())).toBeLessThan(keyFontSize);
  });

  test("Font size scale up if we remove a long description", async () => {
    createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "B2",
        baselineDescr: "This is a very very very very long description",
      },
      chartId
    );
    await nextTick();
    const baselineFontSize = getElementFontSize(getChartBaselineElement());
    updateChart(model, chartId, { baselineDescr: "" }, sheetId);
    await nextTick();
    expect(getElementFontSize(getChartBaselineElement())).toBeGreaterThan(baselineFontSize);
  });
});
