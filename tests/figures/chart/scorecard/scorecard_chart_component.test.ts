import { Model } from "../../../../src";
import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
} from "../../../../src/constants";
import { getContextFontSize } from "../../../../src/helpers";
import { drawScoreChart } from "../../../../src/helpers/figures/charts";
import {
  ScorecardChartConfig,
  formatBaselineDescr,
  getScorecardConfiguration,
} from "../../../../src/helpers/figures/charts/scorecard_chart_config_builder";
import { Pixel, UID } from "../../../../src/types";
import { ScorecardChartRuntime } from "../../../../src/types/chart/scorecard_chart";
import { MockCanvasRenderingContext2D } from "../../../setup/canvas.mock";
import {
  createScorecardChart,
  setCellContent,
  setFormat,
  setStyle,
  updateLocale,
} from "../../../test_helpers/commands_helpers";
import { FR_LOCALE } from "../../../test_helpers/constants";
import { getCellContent } from "../../../test_helpers/getters_helpers";
import { toRangesData } from "../../../test_helpers/helpers";

let model: Model;
let chartId: string;
let sheetId: string;

function updateScorecardChartSize(width: Pixel, height: Pixel) {
  model.dispatch("UPDATE_FIGURE", {
    sheetId,
    id: chartId,
    x: 0,
    y: 0,
    width,
    height,
  });
}

function getChartDesign(model: Model, chartId: UID, sheetId: UID): ScorecardChartConfig {
  const figure = model.getters.getFigure(sheetId, chartId)!;
  const runtime = model.getters.getChartRuntime(chartId) as ScorecardChartRuntime;
  return getScorecardConfiguration({ width: figure.width, height: figure.height }, runtime);
}

let scorecardChartStyle: {
  title: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean };
  key: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean };
  baseline: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean };
  baselineDescr: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean };
};

let canvas: HTMLCanvasElement;
function renderScorecardChart(model: Model, chartId: UID, sheetId: UID, canvas: HTMLCanvasElement) {
  const figure = model.getters.getFigure(sheetId, chartId)!;
  const runtime = model.getters.getChartRuntime(chartId) as ScorecardChartRuntime;
  const design = getScorecardConfiguration({ width: figure.width, height: figure.height }, runtime);
  drawScoreChart(design, canvas);
}

test("Scorecard chart canvas adapt to figure size", () => {
  chartId = "someuuid";
  sheetId = "Sheet1";
  const data = {
    sheets: [
      {
        name: sheetId,
        colNumber: 3,
        rowNumber: 3,
        rows: {},
        cells: {
          A1: "2",
          A2: "3",
          A3: "2.1234",
          B1: "1",
          B2: "2",
          B3: "3",
        },
      },
    ],
  };
  model = new Model(data);
  canvas = document.createElement("canvas");

  createScorecardChart(
    model,
    { keyValue: "A1", baseline: "B2", title: { text: "This is a title" } },
    chartId
  );

  updateScorecardChartSize(100, 100);
  renderScorecardChart(model, chartId, sheetId, canvas);

  expect(canvas.width).toEqual(100);
  expect(canvas.height).toEqual(100);
});

describe("Scorecard charts computation", () => {
  beforeEach(() => {
    chartId = "someuuid";
    sheetId = "Sheet1";
    const data = {
      sheets: [
        {
          name: sheetId,
          colNumber: 3,
          rowNumber: 3,
          rows: {},
          cells: {
            A1: "2",
            A2: "3",
            A3: "2.1234",
            B1: "1",
            B2: "2",
            B3: "3",
          },
        },
      ],
    };
    model = new Model(data);
  });

  test("Chart display correct info", () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", title: { text: "hello" }, baselineDescr: "desc" },
      chartId
    );
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.title?.text).toEqual("hello");
    expect(chartDesign.baseline?.text).toEqual("1");
    expect(chartDesign.baselineDescr?.[0].text).toEqual(" desc");
    expect(chartDesign.key?.text).toEqual("2");
    expect(chartDesign.baselineDescr?.length).toEqual(1);
  });

  test("Baseline = 0 correctly displayed", () => {
    setCellContent(model, "B1", "0");
    setCellContent(model, "A1", "0");
    createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.key?.text).toEqual("0");
    expect(chartDesign.baseline?.text).toEqual("0");
    expect(chartDesign.baselineDescr).toBeUndefined();
    expect(chartDesign.baselineArrow).toBeUndefined();
  });

  test("Percentage baseline display a percentage", () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.baseline?.text).toEqual("100.0%");
  });

  test("Baseline with mode 'text' is plainly displayed", () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B1", baselineMode: "text" }, chartId);
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.baseline?.text).toEqual("1");
    expect(chartDesign.baseline?.style.color).toBeSameColorAs("#525252");
  });

  test("Baseline description and arrow with mode 'progress' are not displayed", () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "progress" },
      chartId
    );
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.baselineDescr).toBeUndefined();
    expect(chartDesign.baselineArrow).toBeUndefined();
    expect(chartDesign.baseline?.style.color).toBeSameColorAs("#525252");
    expect(chartDesign.baseline?.text).toEqual("200.0%");
  });

  test("Progress bar color is equal to up color for positive percentage", () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "progress" },
      chartId
    );
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.progressBar?.style.color).toBeSameColorAs(
      DEFAULT_SCORECARD_BASELINE_COLOR_UP
    );
  });

  test("Progress bar color is equal to down color for negative percentage", () => {
    setCellContent(model, "A1", "-5");
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "progress" },
      chartId
    );
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.progressBar?.style.color).toBeSameColorAs(
      DEFAULT_SCORECARD_BASELINE_COLOR_DOWN
    );
  });

  test("Number are humanized if stipulated in the chart definition", () => {
    setCellContent(model, "A1", "123456789");
    setCellContent(model, "B1", "10.5");
    createScorecardChart(model, { keyValue: "A1", baseline: "B1", humanize: true }, chartId);
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.key?.text).toBe("123m");
    expect(chartDesign.baseline?.text).toBe("123m");
  });

  test("Number are humanized if stipulated in the chart definition even in text mode", () => {
    setCellContent(model, "A1", "123456789");
    setCellContent(model, "B1", "122222342");
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", humanize: true, baselineMode: "text" },
      chartId
    );
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.key?.text).toBe("123m");
    expect(chartDesign.baseline?.text).toBe("122m");
  });

  test("Key < baseline display in red with down arrow", () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B3" }, chartId);
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.baselineArrow?.direction).toBe("down");
    expect(chartDesign.baselineArrow?.style.color).toBeSameColorAs(
      DEFAULT_SCORECARD_BASELINE_COLOR_DOWN
    );
    expect(chartDesign.baseline?.style.color).toBeSameColorAs(
      DEFAULT_SCORECARD_BASELINE_COLOR_DOWN
    );
    expect(chartDesign.baseline?.text).toEqual("1");
  });

  test("Key > baseline display in green with up arrow", () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.baselineArrow?.direction).toBe("up");
    expect(chartDesign.baselineArrow?.style.color).toBeSameColorAs(
      DEFAULT_SCORECARD_BASELINE_COLOR_UP
    );
    expect(chartDesign.baseline?.style.color).toBeSameColorAs(DEFAULT_SCORECARD_BASELINE_COLOR_UP);
    expect(chartDesign.baseline?.text).toEqual("1");
  });

  test("Key = baseline display default font color with no arrow", () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B2" }, chartId);
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.baselineArrow).toBeUndefined();
    expect(chartDesign.baseline?.style.color).toBeSameColorAs("#525252");
    expect(chartDesign.baseline?.text).toEqual("0");
  });

  test("Key value is displayed with the cell evaluated format", () => {
    createScorecardChart(model, { keyValue: "C1" }, chartId);
    setCellContent(model, "C1", "=A1");
    setFormat(model, "A1", "0%");
    const chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.key?.text).toEqual("200%");
  });

  test("Baseline is displayed with the spreadsheet locale", () => {
    setCellContent(model, "C1", "=B2");
    createScorecardChart(model, { keyValue: "A3", baseline: "C1" }, chartId);
    let chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.baseline?.text).toEqual("0.12");

    updateLocale(model, FR_LOCALE);
    chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.baseline?.text).toEqual("0,12");
  });

  test("Baseline is displayed with the cell evaluated format", () => {
    setCellContent(model, "C1", "=B2");
    createScorecardChart(model, { keyValue: "A3", baseline: "C1" }, chartId);
    let chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.baseline?.text).toEqual("0.12");

    setFormat(model, "B2", "[$$]#,##0.00");
    chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.baseline?.text).toEqual("$0.12");
  });

  test("Baseline with lot of decimal is truncated", () => {
    setCellContent(model, "C1", "=B2");
    createScorecardChart(model, { keyValue: "A3", baseline: "B2" }, chartId);
    const chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.baseline?.text).toEqual("0.12");
    expect(getCellContent(model, "A3")).toEqual("2.1234");
  });

  test("Baseline with lot of decimal isn't truncated if the cell has a format", () => {
    createScorecardChart(model, { keyValue: "A3", baseline: "B2" }, chartId);
    setFormat(model, "B2", "[$$]#,####0.0000");
    const chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.baseline?.text).toEqual("$0.1234");
  });

  test("Baseline percentage mode format has priority over cell format", () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    setFormat(model, "B2", "[$$]#,####0.0000");
    const chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.baseline?.text).toEqual("100.0%");
  });

  test("Key value and baseline are displayed with the cell style", () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "A1" }, chartId);
    setStyle(model, "A1", {
      textColor: "#FF0000",
      bold: true,
      italic: true,
      strikethrough: true,
      underline: true,
    });
    const chartDesign = getChartDesign(model, chartId, sheetId);
    for (const style of [chartDesign.key?.style, chartDesign.baseline?.style]) {
      expect(style?.font.includes("bold")).toBeTruthy();
      expect(style?.font.includes("italic")).toBeTruthy();
      expect(style?.color).toBeSameColorAs("#FF0000");
      expect(style?.strikethrough).not.toBeUndefined();
      expect(style?.underline).not.toBeUndefined();
    }
  });

  test("Scorecard elements take the bold/italic style into account when finding the best font size", () => {
    const string = "This is a long string that will be the keyvalue";
    setCellContent(model, "A3", string);
    setStyle(model, "A3", { bold: true, italic: true });
    createScorecardChart(model, { baseline: "A3", keyValue: "A3" }, chartId);
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.baseline?.style.font.includes("bold")).toBeTruthy();
    expect(chartDesign.baseline?.style.font.includes("italic")).toBeTruthy();
    expect(chartDesign.key?.style.font.includes("bold")).toBeTruthy();
    expect(chartDesign.key?.style.font.includes("italic")).toBeTruthy();
  });

  test("Baseline mode percentage don't inherit of the style/format of the cell", () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    setStyle(model, "A1", { bold: true });
    setFormat(model, "A1", "0.0");
    const chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.baseline?.style.font.includes("bold")).toBeFalsy();
    expect(chartDesign.baseline?.text).toEqual("100.0%");
  });

  test("High contrast font colors with dark background", () => {
    createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "A1",
        baselineDescr: "descr",
        title: { text: "title" },
        background: "#000000",
      },
      chartId
    );
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.title?.style.color).toBeSameColorAs("#C8C8C8");
    expect(chartDesign.baseline?.style.color).toBeSameColorAs("#C8C8C8");
    expect(chartDesign.baselineDescr?.[0].style.color).toBeSameColorAs("#C8C8C8");
    expect(chartDesign.key?.style.color).toBeSameColorAs("#FFFFFF");
  });

  test("Font size stays the same if we put a long key value", () => {
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: { text: "This is a title" } },
      chartId
    );
    const chartDesign1 = getChartDesign(model, chartId, sheetId);
    setCellContent(model, "A1", "123456789123456789123456789");
    const chartDesign2 = getChartDesign(model, chartId, sheetId);
    expect(getContextFontSize(chartDesign2.baseline!.style.font)).toEqual(
      getContextFontSize(chartDesign1.baseline!.style.font)
    );
    expect(getContextFontSize(chartDesign2.title!.style.font)).toEqual(
      getContextFontSize(chartDesign1.title!.style.font)
    );
    expect(getContextFontSize(chartDesign2.key!.style.font)).toEqual(
      getContextFontSize(chartDesign1.key!.style.font)
    );
  });

  test("Scorecard chart adapts CF font color properly while prioritizing user set values", async () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        rule: {
          type: "CellIsRule",
          values: [],
          operator: "IsNotEmpty",
          style: { textColor: "#FF0000", fillColor: "#00FF00" },
        },
        id: "cfId",
      },
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
    setCellContent(model, "A1", "30");
    createScorecardChart(model, { keyValue: "A1" }, chartId);
    let chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.key?.style.color).toBeSameColorAs("#FF0000");
    setStyle(model, "A1", { textColor: "#FFAAAA" });
    chartDesign = getChartDesign(model, chartId, sheetId);
    expect(chartDesign.key?.style.color).toBeSameColorAs("#FFAAAA");
  });
});

describe("Scorecard charts rendering", () => {
  beforeEach(() => {
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
            A1: "2",
            A2: "3",
            A3: "2.1234",
            B1: "1",
            B2: "2",
            B3: "3",
          },
        },
      ],
    };
    model = new Model(data);
    scorecardChartStyle = {
      title: {},
      key: {},
      baseline: {},
      baselineDescr: {},
    };
    /*
     * We mock the fillText method of the canvas context to get the font size and color used
     * to display each element of the chart. This is done by checking the text that is passed
     * and trying to match it with one of the element of the chart.
     * Be careful when writing new test using this, as the switch will mismatch elements
     * that have the same text (ie baseline text = baselineDescr text = title text, ...).
     * Be sure, when using this, to have all elements that are different in the test.
     */
    jest
      .spyOn(MockCanvasRenderingContext2D.prototype, "fillText")
      .mockImplementation(function (this: MockCanvasRenderingContext2D, text: string) {
        const { baselineDisplay, keyValue, title, baselineDescr } = model.getters.getChartRuntime(
          chartId
        ) as ScorecardChartRuntime;
        const style = {
          fontSize: getContextFontSize(this.font),
          color: this.fillStyle,
          bold: this.font.includes("bold"),
          italic: this.font.includes("italic"),
        };
        switch (text) {
          case baselineDisplay:
            scorecardChartStyle.baseline = style;
            break;
          case keyValue:
            scorecardChartStyle.key = style;
            break;
          case title.text:
            scorecardChartStyle.title = style;
            break;
          case formatBaselineDescr(baselineDescr, baselineDisplay):
            scorecardChartStyle.baselineDescr = style;
            break;
        }
      });
    canvas = document.createElement("canvas");
  });

  afterEach(() => {
    jest.spyOn(MockCanvasRenderingContext2D.prototype, "fillText").mockRestore();
  });

  test("Baseline with mode 'text' is plainly displayed", () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B1", baselineMode: "text" }, chartId);
    renderScorecardChart(model, chartId, sheetId, canvas);
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs("#525252");
  });

  test("Key < baseline display in red with down arrow", () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B3" }, chartId);
    renderScorecardChart(model, chartId, sheetId, canvas);
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs(
      DEFAULT_SCORECARD_BASELINE_COLOR_DOWN
    );
  });

  test("Key > baseline display in green with up arrow", () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);
    renderScorecardChart(model, chartId, sheetId, canvas);
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs(DEFAULT_SCORECARD_BASELINE_COLOR_UP);
  });

  test("Key = baseline display default font color with no arrow", () => {
    createScorecardChart(model, { keyValue: "A1", baseline: "B2" }, chartId);
    renderScorecardChart(model, chartId, sheetId, canvas);
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs("#525252");
  });

  test("Key value and baseline are displayed with the cell style", () => {
    setStyle(model, "A1", {
      textColor: "#FF0000",
      bold: true,
      italic: true,
    });
    createScorecardChart(model, { keyValue: "A1", baseline: "A1" }, chartId);
    renderScorecardChart(model, chartId, sheetId, canvas);
    for (const style of [scorecardChartStyle.key, scorecardChartStyle.baseline]) {
      expect(style.italic).toEqual(true);
      expect(style.bold).toEqual(true);
      expect(style.color).toBeSameColorAs("#FF0000");
    }
  });

  test("Baseline mode percentage don't inherit of the style of the cell", () => {
    setStyle(model, "A1", { bold: true });
    setFormat(model, "A1", "0.0");
    createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    renderScorecardChart(model, chartId, sheetId, canvas);
    expect(scorecardChartStyle.baseline.bold).not.toEqual(true);
  });

  test("High contrast font colors with dark background", () => {
    createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "A1",
        baselineDescr: "descr",
        title: { text: "title" },
        background: "#000000",
      },
      chartId
    );
    renderScorecardChart(model, chartId, sheetId, canvas);

    expect(scorecardChartStyle.title.color).toBeSameColorAs("#C8C8C8");
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs("#C8C8C8");
    expect(scorecardChartStyle.baselineDescr.color).toBeSameColorAs("#C8C8C8");
    expect(scorecardChartStyle.key.color).toBeSameColorAs("#FFFFFF");
  });
});
