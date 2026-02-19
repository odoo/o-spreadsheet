import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
} from "@odoo/o-spreadsheet-engine/constants";
import {
  getScorecardConfiguration,
  ScorecardChartConfig,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/scorecard_chart_config_builder";
import {
  ScorecardChartDefinition,
  ScorecardChartRuntime,
  ScorecardChartStyle,
} from "@odoo/o-spreadsheet-engine/types/chart/scorecard_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { getContextFontSize } from "../../../../src/helpers";
import {
  chartMutedFontColor,
  drawScoreChart,
  ScorecardChart,
} from "../../../../src/helpers/figures/charts";
import { Pixel, UID } from "../../../../src/types";
import { MockCanvasRenderingContext2D } from "../../../setup/canvas.mock";
import { click } from "../../../test_helpers";
import { openChartDesignSidePanel } from "../../../test_helpers/chart_helpers";
import {
  createScorecardChart,
  setCellContent,
  setFormat,
  setStyle,
  updateChart,
  updateLocale,
} from "../../../test_helpers/commands_helpers";
import { FR_LOCALE } from "../../../test_helpers/constants";
import { getCellContent } from "../../../test_helpers/getters_helpers";
import {
  mountComponentWithPortalTarget,
  nextTick,
  toRangesData,
} from "../../../test_helpers/helpers";

let model: Model;
let chartId: string;
let sheetId: string;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

const mutedFontColor = chartMutedFontColor("#fff");

function updateScorecardChartSize(width: Pixel, height: Pixel) {
  const figureId = model.getters.getFigureIdFromChartId(chartId);
  model.dispatch("UPDATE_FIGURE", {
    sheetId,
    figureId,
    offset: {
      x: 0,
      y: 0,
    },
    width,
    height,
    col: 0,
    row: 0,
  });
}

function getChartStyle(model: Model, chartId: UID): ScorecardChartStyle {
  const chart = model.getters.getChart(chartId) as ScorecardChart;
  return model.getters.getStyleOfSingleCellChart(chart.background, chart.keyValue);
}

function getChartDesign(model: Model, chartId: UID, sheetId: UID): ScorecardChartConfig {
  const figureId = model.getters.getFigureIdFromChartId(chartId);
  const figure = model.getters.getFigure(sheetId, figureId)!;
  const runtime = model.getters.getChartRuntime(chartId) as ScorecardChartRuntime;
  const style = getChartStyle(model, chartId);
  return getScorecardConfiguration({ width: figure.width, height: figure.height }, runtime, style);
}

let scorecardChartStyle: {
  title: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean };
  key: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean };
  keyDescr: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean };
  baseline: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean };
  baselineDescr: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean };
};

let canvas: HTMLCanvasElement;
function renderScorecardChart(model: Model, chartId: UID, sheetId: UID, canvas: HTMLCanvasElement) {
  const figureId = model.getters.getFigureIdFromChartId(chartId);
  const figure = model.getters.getFigure(sheetId, figureId)!;
  const runtime = model.getters.getChartRuntime(chartId) as ScorecardChartRuntime;
  const style = getChartStyle(model, chartId);
  const design = getScorecardConfiguration(
    { width: figure.width, height: figure.height },
    runtime,
    style
  );
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
      { keyValue: "A1", baseline: "B1", title: { text: "hello" }, baselineDescr: { text: "desc" } },
      chartId
    );
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.title?.text).toEqual("hello");
    expect(chartDesign.baseline?.text).toEqual("1");
    expect(chartDesign.baselineDescr?.text).toEqual(" desc");
    expect(chartDesign.key?.text).toEqual("2");
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
    expect(chartDesign.baseline?.style.color).toBeSameColorAs(mutedFontColor);
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
    expect(chartDesign.baseline?.style.color).toBeSameColorAs(mutedFontColor);
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
    expect(chartDesign.baseline?.style.color).toBeSameColorAs(mutedFontColor);
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
        baselineDescr: { text: "descr" },
        title: { text: "title" },
        background: "#000000",
      },
      chartId
    );
    const chartDesign = getChartDesign(model, chartId, sheetId);

    expect(chartDesign.title?.style.color).toBeSameColorAs("#C8C8C8");
    expect(chartDesign.baseline?.style.color).toBeSameColorAs("#C8C8C8");
    expect(chartDesign.baselineDescr?.style.color).toBeSameColorAs("#C8C8C8");
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

  test("Scorecard chart adapts CF font color", async () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        rule: {
          type: "CellIsRule",
          values: [],
          operator: "isNotEmpty",
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
    expect(chartDesign.key?.style.color).toBeSameColorAs("#FF0000");
  });
});

describe("Scorecard charts rendering", () => {
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
      keyDescr: {},
      baseline: {},
      baselineDescr: {},
    };
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model }));

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
        const { baselineDisplay, keyValue, title, baselineDescr, keyDescr } =
          model.getters.getChartRuntime(chartId) as ScorecardChartRuntime;
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
          case " " + keyDescr:
            scorecardChartStyle.keyDescr = style;
            break;
          case " " + baselineDescr:
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
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs(mutedFontColor);
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
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs(mutedFontColor);
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

  test("Key value and baseline descriptions are displayed with the chosen style if no cell style", () => {
    createScorecardChart(
      model,
      {
        keyValue: "A1",
        keyDescr: { text: "keykey", italic: true, bold: true, color: "#FF0000" },
        baseline: "A1",
        baselineDescr: { text: "baselineDescr", italic: true, bold: true, color: "#FF0000" },
      },
      chartId
    );
    renderScorecardChart(model, chartId, sheetId, canvas);
    for (const style of [scorecardChartStyle.keyDescr, scorecardChartStyle.baselineDescr]) {
      expect(style.italic).toEqual(true);
      expect(style.bold).toEqual(true);
      expect(style.color).toBeSameColorAs("#FF0000");
    }
  });

  test("Changing description style affect render", () => {
    createScorecardChart(
      model,
      {
        keyValue: "A1",
        keyDescr: { text: "keykey" },
        baseline: "A1",
        baselineDescr: { text: "baselineDescr" },
      },
      chartId
    );
    renderScorecardChart(model, chartId, sheetId, canvas);
    for (const style of [
      scorecardChartStyle.key,
      scorecardChartStyle.baseline,
      scorecardChartStyle.baselineDescr,
    ]) {
      expect(style.italic).toEqual(false);
      expect(style.bold).toEqual(false);
    }

    updateChart(model, chartId, { keyDescr: { text: "keykey", bold: true } });
    renderScorecardChart(model, chartId, sheetId, canvas);

    expect(scorecardChartStyle.key.bold).toEqual(false);
    expect(scorecardChartStyle.keyDescr.bold).toEqual(true);
    expect(scorecardChartStyle.baseline.bold).toEqual(false);
    expect(scorecardChartStyle.baselineDescr.bold).toEqual(false);

    updateChart(model, chartId, { baselineDescr: { text: "baselineDescr", bold: true } });
    renderScorecardChart(model, chartId, sheetId, canvas);

    expect(scorecardChartStyle.key.bold).toEqual(false);
    expect(scorecardChartStyle.keyDescr.bold).toEqual(true);
    expect(scorecardChartStyle.baseline.bold).toEqual(false);
    expect(scorecardChartStyle.baselineDescr.bold).toEqual(true);
  });

  test("Changing key description style in panel affect render", async () => {
    createScorecardChart(
      model,
      {
        keyValue: "A1",
        keyDescr: { text: "keykey" },
        baseline: "A1",
        baselineDescr: { text: "baselineDescr" },
      },
      chartId
    );
    renderScorecardChart(model, chartId, sheetId, canvas);
    for (const style of [scorecardChartStyle.key, scorecardChartStyle.baseline]) {
      expect(style.italic).toEqual(false);
      expect(style.bold).toEqual(false);
    }
    await openChartDesignSidePanel(model, env, fixture, chartId);

    const keyDescrElem = fixture.querySelectorAll(".o-chart-title")[1]!;
    const keyDescrElemText = keyDescrElem.querySelector("input");
    const keyDescrElemBold = keyDescrElem.querySelector("[title=Bold]");
    const keyDescrElemItalic = keyDescrElem.querySelector("[title=Italic]");
    const keyDescrElemFontSize = keyDescrElem.querySelector(
      '[title="Font Size"] input'
    ) as HTMLInputElement;

    expect(keyDescrElemText?.value).toEqual("keykey");
    expect(keyDescrElemBold?.className).not.toContain("active");
    expect(keyDescrElemItalic?.className).not.toContain("active");
    expect(keyDescrElemFontSize?.value).toEqual("32");

    keyDescrElemText!.value = "just Key";
    keyDescrElemText!.dispatchEvent(new Event("change"));
    await nextTick();

    let definition = model.getters.getChartDefinition(chartId) as ScorecardChartDefinition;
    expect(definition?.keyDescr?.text).toEqual("just Key");
    expect(definition.keyDescr?.bold).toBeFalsy();
    expect(definition.keyDescr?.fontSize).toBeFalsy();

    keyDescrElemFontSize!.value = "64";
    keyDescrElemFontSize!.dispatchEvent(new Event("change"));
    await nextTick();

    definition = model.getters.getChartDefinition(chartId) as ScorecardChartDefinition;
    expect(definition.keyDescr?.text).toEqual("just Key");
    expect(definition.keyDescr?.bold).toBeFalsy();
    expect(definition.keyDescr?.fontSize).toEqual(64);

    await click(keyDescrElemBold!);
    renderScorecardChart(model, chartId, sheetId, canvas);

    definition = model.getters.getChartDefinition(chartId) as ScorecardChartDefinition;
    expect(definition.keyDescr?.text).toEqual("just Key");
    expect(definition.keyDescr?.bold).toEqual(true);
    expect(definition.keyDescr?.fontSize).toEqual(64);
  });

  test("Changing baseline description style in panel affect render", async () => {
    createScorecardChart(
      model,
      {
        keyValue: "A1",
        keyDescr: { text: "keykey" },
        baseline: "A1",
        baselineDescr: { text: "baselineDescr" },
      },
      chartId
    );
    renderScorecardChart(model, chartId, sheetId, canvas);
    for (const style of [scorecardChartStyle.key, scorecardChartStyle.baseline]) {
      expect(style.italic).toEqual(false);
      expect(style.bold).toEqual(false);
    }
    await openChartDesignSidePanel(model, env, fixture, chartId);

    const baselineDescrElem = fixture.querySelectorAll(".o-chart-title")[1]!;
    const baselineDescrElemText = baselineDescrElem.querySelector("input");
    const baselineDescrElemBold = baselineDescrElem.querySelector("[title=Bold]");
    const baselineDescrElemItalic = baselineDescrElem.querySelector("[title=Italic]");
    const baselineDescrElemFontSize = baselineDescrElem.querySelector(
      '[title="Font Size"] input'
    ) as HTMLInputElement;

    expect(baselineDescrElemText?.value).toEqual("keykey");
    expect(baselineDescrElemBold?.className).not.toContain("active");
    expect(baselineDescrElemItalic?.className).not.toContain("active");
    expect(baselineDescrElemFontSize?.value).toEqual("32");

    baselineDescrElemText!.value = "A B C, easy as 1 2 3, do ré mi";
    baselineDescrElemText!.dispatchEvent(new Event("change"));
    await nextTick();

    let definition = model.getters.getChartDefinition(chartId) as ScorecardChartDefinition;
    expect(definition?.keyDescr?.text).toEqual("A B C, easy as 1 2 3, do ré mi");
    expect(definition.keyDescr?.bold).toBeFalsy();
    expect(definition.keyDescr?.fontSize).toBeFalsy();

    baselineDescrElemFontSize!.value = "64";
    baselineDescrElemFontSize!.dispatchEvent(new Event("change"));
    await nextTick();

    definition = model.getters.getChartDefinition(chartId) as ScorecardChartDefinition;
    expect(definition.keyDescr?.text).toEqual("A B C, easy as 1 2 3, do ré mi");
    expect(definition.keyDescr?.bold).toBeFalsy();
    expect(definition.keyDescr?.fontSize).toEqual(64);

    await click(baselineDescrElemBold!);
    renderScorecardChart(model, chartId, sheetId, canvas);

    definition = model.getters.getChartDefinition(chartId) as ScorecardChartDefinition;
    expect(definition.keyDescr?.text).toEqual("A B C, easy as 1 2 3, do ré mi");
    expect(definition.keyDescr?.bold).toEqual(true);
    expect(definition.keyDescr?.fontSize).toEqual(64);
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
});
