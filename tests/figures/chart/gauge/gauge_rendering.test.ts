import { CHART_PADDING, CHART_TITLE_FONT_SIZE } from "@odoo/o-spreadsheet-engine/constants";
import {
  GAUGE_DEFAULT_VALUE_FONT_SIZE,
  GAUGE_LABELS_FONT_SIZE,
  getGaugeRenderingConfig,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/gauge_chart_rendering";
import {
  GaugeAnimatedRuntime,
  GaugeChartRuntime,
  GaugeChartStyle,
} from "@odoo/o-spreadsheet-engine/types/chart";
import { Model } from "../../../../src";
import { GaugeChartComponent } from "../../../../src/components/figures/chart/gauge/gauge_chart_component";
import { chartMutedFontColor } from "../../../../src/helpers/figures/charts";
import { readonlyAllowedCommands, Rect } from "../../../../src/types";
import { MockCanvasRenderingContext2D } from "../../../setup/canvas.mock";
import { createGaugeChart, setCellContent } from "../../../test_helpers/commands_helpers";
import { mountSpreadsheet, nextTick } from "../../../test_helpers/helpers";

const testRuntime: GaugeChartRuntime = {
  title: { text: "This is a title" },
  minValue: { value: 0, label: "0" },
  maxValue: { value: 100, label: "100" },
  gaugeValue: { value: 50, label: "50" },
  inflectionValues: [
    { value: 25, label: "25", operator: "<" },
    { value: 75, label: "75", operator: "<" },
  ],
  colors: ["#FF0000", "#FF9900", "#007000"],
};

const testStyle: GaugeChartStyle = {
  background: "#FFFFFF",
};

const testChartRect: Rect = {
  x: 0,
  y: 0,
  width: 1000,
  height: 500,
};

function getRenderingConfig(
  runtime: GaugeAnimatedRuntime,
  style = testStyle,
  boundingRect = testChartRect,
  ctx = new MockCanvasRenderingContext2D()
) {
  return getGaugeRenderingConfig(
    boundingRect,
    runtime,
    style,
    ctx as unknown as CanvasRenderingContext2D
  );
}

describe("Gauge rendering config", () => {
  test("Background color is propagated", () => {
    expect(getRenderingConfig(testRuntime).backgroundColor).toEqual(testStyle.background);
  });

  test("Chart size is propagated", () => {
    const config = getRenderingConfig(testRuntime);
    expect(config.height).toEqual(testChartRect.height);
    expect(config.width).toEqual(testChartRect.width);
  });

  /* In the following test, textPosition.y is expected to be 23 as the vertical position of the
     title is computed according to the title height, and fontBoundingBoxAscent and
     fontBoundingBoxDescent are not implemented by js-dom so not available here, they are mocked to set values.
  */
  test("Chart title", () => {
    expect(getRenderingConfig(testRuntime).title).toEqual({
      label: testRuntime.title.text,
      fontSize: CHART_TITLE_FONT_SIZE,
      textPosition: {
        x: CHART_PADDING,
        y: 23,
      },
      color: chartMutedFontColor(testStyle.background),
    });
  });

  test("Min value label", () => {
    const config = getRenderingConfig(testRuntime);
    expect(config.minLabel).toEqual({
      label: "0",
      textPosition: {
        x: config.gauge.rect.x + config.gauge.arcWidth / 2, // in the middle of the left gauge arc
        y: config.gauge.rect.y + config.gauge.rect.height + GAUGE_LABELS_FONT_SIZE, // below the gauge
      },
      fontSize: GAUGE_LABELS_FONT_SIZE,
      color: chartMutedFontColor(testStyle.background),
    });
  });

  test("Max value label", () => {
    const config = getRenderingConfig(testRuntime);
    expect(config.maxLabel).toEqual({
      label: "100",
      textPosition: {
        x: config.gauge.rect.x + config.gauge.rect.width - config.gauge.arcWidth / 2, // in the middle of the right gauge arc
        y: config.gauge.rect.y + config.gauge.rect.height + GAUGE_LABELS_FONT_SIZE, // below the gauge
      },
      fontSize: GAUGE_LABELS_FONT_SIZE,
      color: chartMutedFontColor(testStyle.background),
    });
  });

  test("Gauge properties ", () => {
    const config = getRenderingConfig(testRuntime);
    expect(config.gauge).toMatchObject({
      arcWidth: config.gauge.rect.width / 6,
      percentage: 0.5,
      color: "#FF9900",
    });
  });

  test("Gauge is empty for empty gauge value", () => {
    const config = getRenderingConfig({ ...testRuntime, gaugeValue: undefined });
    expect(config.gauge.percentage).toEqual(0);
    expect(config.gaugeValue.label).toEqual("-");
  });

  test("Gauge is empty for value smaller than the minimum", () => {
    const config = getRenderingConfig({ ...testRuntime, gaugeValue: { value: -1, label: "-1" } });
    expect(config.gauge.percentage).toEqual(0);
  });

  test("Gauge is full for value greater than the maximum", () => {
    const config = getRenderingConfig({ ...testRuntime, gaugeValue: { value: 101, label: "101" } });
    expect(config.gauge.percentage).toEqual(1);
  });

  test("Gauge color changes with the gauge value", () => {
    expect(
      getRenderingConfig({ ...testRuntime, gaugeValue: { value: 0, label: "0" } }).gauge.color
    ).toEqual(testRuntime.colors[0]);
    expect(
      getRenderingConfig({ ...testRuntime, gaugeValue: { value: 50, label: "50" } }).gauge.color
    ).toEqual(testRuntime.colors[1]);
    expect(
      getRenderingConfig({ ...testRuntime, gaugeValue: { value: 100, label: "100" } }).gauge.color
    ).toEqual(testRuntime.colors[2]);
  });

  test("Animation value is used only for the gauge fill value, not the gauge color", () => {
    for (const animationValue of [0, 50, 100]) {
      const config = getRenderingConfig({
        ...testRuntime,
        gaugeValue: { value: 0, label: "0" },
        animationValue,
      });
      expect(config.gauge.color).toEqual(testRuntime.colors[0]);
      expect(config.gauge.percentage).toEqual(animationValue / 100);
    }
  });

  test("Gauge inflection value can be lower than or lower or equal than", () => {
    const ltRuntime = testRuntime;
    expect(
      getRenderingConfig({ ...ltRuntime, gaugeValue: { value: 25, label: "25" } }).gauge.color
    ).toEqual(testRuntime.colors[1]);
    expect(
      getRenderingConfig({ ...ltRuntime, gaugeValue: { value: 75, label: "75" } }).gauge.color
    ).toEqual(testRuntime.colors[2]);

    const lteRuntime: GaugeChartRuntime = {
      ...testRuntime,
      inflectionValues: [
        { value: 25, label: "25", operator: "<=" },
        { value: 75, label: "75", operator: "<=" },
      ],
    };
    expect(
      getRenderingConfig({ ...lteRuntime, gaugeValue: { value: 25, label: "25" } }).gauge.color
    ).toEqual(testRuntime.colors[0]);
    expect(
      getRenderingConfig({ ...lteRuntime, gaugeValue: { value: 75, label: "75" } }).gauge.color
    ).toEqual(testRuntime.colors[1]);
  });

  test("Inflection values", () => {
    expect(getRenderingConfig(testRuntime).inflectionValues).toEqual([
      {
        rotation: Math.PI * (1 - 0.25),
        label: "25",
        fontSize: GAUGE_LABELS_FONT_SIZE,
        color: chartMutedFontColor(testStyle.background),
        offset: 0,
      },
      {
        rotation: Math.PI * (1 - 0.75),
        label: "75",
        fontSize: GAUGE_LABELS_FONT_SIZE,
        color: chartMutedFontColor(testStyle.background),
        offset: 0,
      },
    ]);
  });

  test("Inflection values are offset when they would overlap each other", () => {
    const runtime: GaugeChartRuntime = {
      ...testRuntime,
      inflectionValues: [
        { value: 25, label: "25$", operator: "<" },
        { value: 26, label: "26$", operator: "<" },
      ],
    };
    expect(getRenderingConfig(runtime).inflectionValues).toMatchObject([
      { offset: 0 },
      { offset: GAUGE_LABELS_FONT_SIZE },
    ]);
  });

  test("Gauge value", () => {
    const config = getRenderingConfig(testRuntime);
    expect(config.gaugeValue).toEqual({
      label: "50",
      textPosition: {
        x: config.gauge.rect.x + config.gauge.rect.width / 2,
        y: config.gauge.rect.y + config.gauge.rect.height - config.gauge.rect.height / 12,
      },
      fontSize: GAUGE_DEFAULT_VALUE_FONT_SIZE,
      color: chartMutedFontColor(testStyle.background),
    });
  });

  test("Gauge value is scaled down for small charts", () => {
    const config = getRenderingConfig(testRuntime, testStyle, { ...testChartRect, height: 150 });
    expect(config.gaugeValue.fontSize).toBeLessThan(GAUGE_DEFAULT_VALUE_FONT_SIZE);
  });

  test("Gauge value is scaled down for long texts", () => {
    const config = getRenderingConfig({
      ...testRuntime,
      gaugeValue: { value: 50, label: "This is a very long text" },
    });
    expect(config.gaugeValue.fontSize).toBeLessThan(GAUGE_DEFAULT_VALUE_FONT_SIZE);
  });

  test("Text colors are contrasted on dark backgrounds", () => {
    const darkStyle = { background: "#000000" };
    const config = getRenderingConfig(testRuntime, darkStyle);
    expect(config.title.color).toEqual(chartMutedFontColor("#000000"));
    expect(config.minLabel.color).toEqual(chartMutedFontColor("#000000"));
    expect(config.maxLabel.color).toEqual(chartMutedFontColor("#000000"));
    expect(config.gaugeValue.color).toEqual(chartMutedFontColor("#000000"));
    expect(config.inflectionValues[0].color).toEqual(chartMutedFontColor("#000000"));
    expect(config.inflectionValues[1].color).toEqual(chartMutedFontColor("#000000"));
  });
});

describe("Gauge chart component animation", () => {
  let gaugeAnimationSpy: jest.SpyInstance;
  let model: Model;

  beforeEach(() => {
    gaugeAnimationSpy = jest.spyOn(GaugeChartComponent.prototype, "drawGaugeWithAnimation");
    model = new Model();
  });

  afterEach(() => {
    gaugeAnimationSpy.mockRestore();
  });

  test("Gauge chart is animated only at first render", async () => {
    createGaugeChart(model, {});
    model.updateMode("dashboard");
    await mountSpreadsheet({ model });

    expect(gaugeAnimationSpy).toHaveBeenCalledTimes(1);

    // Scroll the figure out of the viewport and back in
    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 0, offsetY: 500 });
    await nextTick();
    expect(".o-figure").toHaveCount(0);
    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 0, offsetY: 0 });
    await nextTick();
    expect(".o-figure").toHaveCount(1);
    expect(gaugeAnimationSpy).toHaveBeenCalledTimes(1);
  });

  test("Animations are replayed only when chart data changes", async () => {
    readonlyAllowedCommands.add("UPDATE_CELL");

    const model = new Model();
    createGaugeChart(model, { dataRange: "A1" });
    model.updateMode("dashboard");
    await mountSpreadsheet({ model });

    expect(gaugeAnimationSpy).toHaveBeenCalledTimes(1);

    // Dispatch a command that doesn't change the chart data
    setCellContent(model, "A50", "6");
    await nextTick();
    expect(gaugeAnimationSpy).toHaveBeenCalledTimes(1);

    // Change the chart data
    setCellContent(model, "A1", "6");
    await nextTick();
    expect(gaugeAnimationSpy).toHaveBeenCalledTimes(2);

    readonlyAllowedCommands.delete("UPDATE_CELL");
  });
});
