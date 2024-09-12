import {
  GAUGE_DEFAULT_VALUE_FONT_SIZE,
  GAUGE_LABELS_FONT_SIZE,
  GAUGE_TEXT_COLOR,
  GAUGE_TEXT_COLOR_HIGH_CONTRAST,
  GAUGE_TITLE_FONT_SIZE,
  GAUGE_TITLE_PADDING_LEFT,
  getGaugeRenderingConfig,
} from "../../../../src/helpers/figures/charts/gauge_chart_rendering";
import { Rect } from "../../../../src/types";
import { GaugeChartRuntime } from "../../../../src/types/chart";
import { MockCanvasRenderingContext2D } from "../../../setup/canvas.mock";

const testRuntime: GaugeChartRuntime = {
  background: "#FFFFFF",
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

const testChartRect: Rect = {
  x: 0,
  y: 0,
  width: 1000,
  height: 500,
};

function getRenderingConfig(
  runtime: GaugeChartRuntime,
  boundingRect = testChartRect,
  ctx = new MockCanvasRenderingContext2D()
) {
  return getGaugeRenderingConfig(boundingRect, runtime, ctx as unknown as CanvasRenderingContext2D);
}

describe("Gauge rendering config", () => {
  test("Background color is propagated", () => {
    expect(getRenderingConfig(testRuntime).backgroundColor).toEqual(testRuntime.background);
  });

  test("Chart size is propagated", () => {
    const config = getRenderingConfig(testRuntime);
    expect(config.height).toEqual(testChartRect.height);
    expect(config.width).toEqual(testChartRect.width);
  });

  /* In the following test, textPosition.y is expected to be NaN as the vertical position of the
     title is computed according to the title height, and fontBoundingBoxAscent and
     fontBoundingBoxDescent are not implemented by js-dom so not available here.
  */
  test("Chart title", () => {
    expect(getRenderingConfig(testRuntime).title).toEqual({
      label: testRuntime.title.text,
      fontSize: GAUGE_TITLE_FONT_SIZE,
      textPosition: {
        x: GAUGE_TITLE_PADDING_LEFT,
        y: NaN,
      },
      color: GAUGE_TEXT_COLOR,
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
      color: GAUGE_TEXT_COLOR,
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
      color: GAUGE_TEXT_COLOR,
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
        color: GAUGE_TEXT_COLOR,
        offset: 0,
      },
      {
        rotation: Math.PI * (1 - 0.75),
        label: "75",
        fontSize: GAUGE_LABELS_FONT_SIZE,
        color: GAUGE_TEXT_COLOR,
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
      color: GAUGE_TEXT_COLOR,
    });
  });

  test("Gauge value is scaled down for small charts", () => {
    const config = getRenderingConfig(testRuntime, { ...testChartRect, height: 150 });
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
    const config = getRenderingConfig({ ...testRuntime, background: "#000000" });
    expect(config.title.color).toEqual(GAUGE_TEXT_COLOR_HIGH_CONTRAST);
    expect(config.minLabel.color).toEqual(GAUGE_TEXT_COLOR_HIGH_CONTRAST);
    expect(config.maxLabel.color).toEqual(GAUGE_TEXT_COLOR_HIGH_CONTRAST);
    expect(config.gaugeValue.color).toEqual(GAUGE_TEXT_COLOR_HIGH_CONTRAST);
    expect(config.inflectionValues[0].color).toEqual(GAUGE_TEXT_COLOR_HIGH_CONTRAST);
    expect(config.inflectionValues[1].color).toEqual(GAUGE_TEXT_COLOR_HIGH_CONTRAST);
  });
});
