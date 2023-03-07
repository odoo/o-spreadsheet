import { Model } from "../../src";
import { toHex } from "../../src/helpers";
import { UID } from "../../src/types";
import { ScorecardChartDefinition } from "../../src/types/chart/scorecard_chart";
import {
  createScorecardChart as createScorecardChartHelper,
  setCellContent,
  updateChart,
} from "../test_helpers/commands_helpers";
import { dragElement, getElComputedStyle, simulateClick } from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick, target } from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let chartId: string;
let sheetId: string;

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

async function createScorecardChart(
  model: Model,
  data: Partial<ScorecardChartDefinition>,
  chartId?: UID,
  sheetId?: UID
) {
  createScorecardChartHelper(model, data, chartId, sheetId);
  await nextTick();
}

async function updateScorecardChartSize(width: number, height: number) {
  model.dispatch("UPDATE_FIGURE", {
    sheetId,
    id: chartId,
    x: 0,
    y: 0,
    width,
    height,
  });
  await nextTick();
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
            A3: { content: "2.1234" },
            B1: { content: "1" },
            B2: { content: "2" },
            B3: { content: "3" },
          },
        },
      ],
    };
    ({ model, fixture } = await mountSpreadsheet({ model: new Model(data) }));
  });

  test("Scorecard snapshot", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", title: "hello", baselineDescr: "description" },
      chartId
    );
    expect(getChartElement()).toMatchSnapshot();
  });

  test("scorecard text is resized while figure is resized", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", title: "hello", baselineDescr: "description" },
      chartId
    );
    await simulateClick(".o-figure");
    expect(getElComputedStyle(".o-figure-wrapper", "width")).toBe("536px");
    expect(getElComputedStyle(".o-figure-wrapper", "height")).toBe("335px");
    await dragElement(".o-fig-anchor.o-topLeft", { x: 300, y: 200 });
    expect(getElComputedStyle(".o-figure-wrapper", "width")).toBe("236px");
    expect(getElComputedStyle(".o-figure-wrapper", "height")).toBe("135px");
    // force a triggering of all resizeObservers to ensure the grid is resized
    //@ts-ignore
    window.resizers.resize();
    await nextTick();
    expect(getChartElement()).toMatchSnapshot();
  });

  test("Chart display correct info", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", title: "hello", baselineDescr: "description" },
      chartId
    );

    expect(getChartElement()).toBeTruthy();
    expect(getChartTitleElement()?.textContent).toEqual("hello");
    expect(getChartKeyElement()?.textContent).toEqual("2");
    expect(getChartBaselineTextContent()).toEqual("1 description");
  });

  test("Baseline = 0 correctly displayed", async () => {
    setCellContent(model, "B1", "0");
    setCellContent(model, "A1", "0");
    await createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);

    expect(getChartElement()).toBeTruthy();
    expect(getChartKeyElement()?.textContent).toEqual("0");
    expect(getChartBaselineTextContent()).toEqual("0");
  });

  test("Percentage baseline display a percentage", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );

    expect(getChartElement()).toBeTruthy();
    expect(getChartBaselineTextContent()).toEqual("100%");
  });

  test("Baseline with mode 'text' is plainly displayed", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "text" },
      chartId
    );

    expect(getChartElement()).toBeTruthy();
    expect(getChartBaselineTextContent()).toEqual("1");
    expect(toHex(getChartBaselineTextElement()!.style["color"])).toEqual("#525252");
  });

  test("Key < baseline display in red with down arrow", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "B3" }, chartId);

    const baselineElement = getChartBaselineElement();
    expect(baselineElement.querySelector("svg.arrow-down")).toBeTruthy();
    expect(toHex(baselineElement.querySelector("span")!.style["color"])).toEqual("#DC6965");
    expect(getChartBaselineTextContent()).toEqual("1");
  });

  test("Key > baseline display in green with up arrow", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);

    const baselineElement = getChartBaselineElement();
    expect(baselineElement.querySelector("svg.arrow-up")).toBeTruthy();
    expect(toHex(baselineElement.querySelector("span")!.style["color"])).toEqual("#00A04A");
    expect(getChartBaselineTextContent()).toEqual("1");
  });

  test("Key = baseline display default font color with no arrow", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "B2" }, chartId);

    const baselineElement = getChartBaselineElement();
    expect(baselineElement.querySelector("svg")).toBeFalsy();
    expect(toHex(baselineElement.querySelector("span")!.style["color"])).toEqual("#525252");
    expect(getChartBaselineTextContent()).toEqual("0");
  });

  test("Key value is displayed with the cell evaluated format", async () => {
    setCellContent(model, "C1", "=A1");
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      format: "0%",
    });
    await createScorecardChart(model, { keyValue: "C1" }, chartId);
    expect(getChartKeyElement()?.textContent).toEqual("200%");
  });

  test("Baseline is displayed with the cell evaluated format", async () => {
    setCellContent(model, "C1", "=B2");
    await createScorecardChart(model, { keyValue: "A3", baseline: "C1" }, chartId);
    expect(getChartBaselineElement()?.textContent).toEqual((0.12).toLocaleString());

    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("B2"),
      format: "[$$]#,##0.00",
    });
    await nextTick();
    expect(getChartBaselineElement()?.textContent).toEqual("$0.12");
  });

  test("Baseline with lot of decimal is truncated", async () => {
    setCellContent(model, "C1", "=B2");
    await createScorecardChart(model, { keyValue: "A3", baseline: "B2" }, chartId);
    expect(getCellContent(model, "A3")).toEqual("2.1234");
    expect(getChartBaselineElement()?.textContent).toEqual((0.12).toLocaleString());
  });

  test("Baseline with lot of decimal isn't truncated if the cell has a format", async () => {
    await createScorecardChart(model, { keyValue: "A3", baseline: "B2" }, chartId);
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("B2"),
      format: "[$$]#,####0.0000",
    });
    await nextTick();
    expect(getChartBaselineElement()?.textContent).toEqual("$0.1234");
  });

  test("Baseline percentage mode format has priority over cell format", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("B1"),
      format: "[$$]#,####0.0000",
    });
    await nextTick();
    expect(getChartBaselineElement()?.textContent).toEqual("100%");
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
    await createScorecardChart(model, { keyValue: "A1", baseline: "A1" }, chartId);
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
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    expect(getChartBaselineTextElement()!.style["font-weight"]).not.toEqual("bold");
    expect(getChartBaselineTextContent()).toEqual("100%");
  });

  test("High contrast font colors with dark background", async () => {
    await createScorecardChart(
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

    expect(toHex(getChartTitleElement()!.style["color"])).toEqual("#C8C8C8");
    expect(toHex(getChartBaselineTextElement()!.style["color"])).toEqual("#C8C8C8");
    expect(toHex(getChartBaselineDescrElement()!.style["color"])).toEqual("#C8C8C8");
    expect(toHex(getChartKeyElement()!.style["color"])).toEqual("#FFFFFF");
  });

  test("Increasing size of the chart scale up the font sizes", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );

    await updateScorecardChartSize(100, 100);

    const baselineFontSize = getElementFontSize(getChartBaselineElement());
    const titleFontSize = getElementFontSize(getChartTitleElement());
    const keyFontSize = getElementFontSize(getChartKeyElement());

    await updateScorecardChartSize(200, 200);

    expect(getElementFontSize(getChartBaselineElement())).toBeGreaterThan(baselineFontSize);
    expect(getElementFontSize(getChartTitleElement())).toEqual(titleFontSize);
    expect(getElementFontSize(getChartKeyElement())).toBeGreaterThan(keyFontSize);
  });

  test("Decreasing size of the chart scale down the font sizes", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );

    await updateScorecardChartSize(200, 200);

    const baselineFontSize = getElementFontSize(getChartBaselineElement());
    const titleFontSize = getElementFontSize(getChartTitleElement());
    const keyFontSize = getElementFontSize(getChartKeyElement());

    await updateScorecardChartSize(100, 100);

    expect(getElementFontSize(getChartBaselineElement())).toBeLessThan(baselineFontSize);
    expect(getElementFontSize(getChartTitleElement())).toEqual(titleFontSize);
    expect(getElementFontSize(getChartKeyElement())).toBeLessThan(keyFontSize);
  });

  test("Font size scale down if we put a long key value", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );
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
    await createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "B2",
        baselineDescr: "This is a very very very very long description",
      },
      chartId
    );
    const baselineFontSize = getElementFontSize(getChartBaselineElement());

    updateChart(model, chartId, { baselineDescr: "" }, sheetId);
    await nextTick();
    expect(getElementFontSize(getChartBaselineElement())).toBeGreaterThan(baselineFontSize);
  });
});
