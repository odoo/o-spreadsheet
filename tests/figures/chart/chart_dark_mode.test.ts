import { GRAY_200_DARK, GRAY_300, GRAY_700 } from "@odoo/o-spreadsheet-engine/constants";
import { BarChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/bar_chart";
import { PieChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/pie_chart";
import { ChartConfiguration } from "chart.js";
import { Model } from "../../../src";

import { createChart } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

//prettier-ignore
const grid = {
  A1: "1", B1: "10",
  A2: "2", B2: "20",
};

describe("Chart dark mode tests", () => {
  let model: Model;

  beforeEach(() => {
    model = createModelFromGrid(grid);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("Chart colors in light mode (default)", () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        type: "bar",
        title: { text: "Title" },
        axesDesign: {
          x: { title: { text: "X Axis" } },
          y: { title: { text: "Y Axis" } },
        },
      },
      "1"
    );

    const runtime = model.getters.getChartRuntime("1") as BarChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"bar">;
    const options = config.options!;

    expect(options.plugins?.background?.color).toBe("#FFFFFF");

    expect(options.plugins!.title!.color).toBe("#666666");

    const xScale = options.scales!.x!;
    const yScale = options.scales!.y!;

    expect(xScale.grid!.color).toBeUndefined();
    expect(yScale.grid!.color).toBe(GRAY_300);
    expect(xScale.ticks!.color).toBe("#000000");
    expect(yScale.ticks!.color).toBe("#000000");

    expect(xScale.title!.color).toBe("#000000");
    expect(yScale.title!.color).toBe("#000000");
  });

  test("Chart colors in dark mode", () => {
    const model = createModelFromGrid(grid, { colorScheme: "dark" });
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        type: "bar",
        title: { text: "Title" },
        axesDesign: {
          x: { title: { text: "X Axis" } },
          y: { title: { text: "Y Axis" } },
        },
      },
      "2"
    );

    const runtime = model.getters.getChartRuntime("2") as BarChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"bar">;
    const options = config.options!;

    expect(options.plugins?.background?.color).toBe(GRAY_200_DARK);

    expect(options.plugins!.title!.color).toBe("#C8C8C8");

    const xScale = options.scales!.x!;
    const yScale = options.scales!.y!;

    expect(xScale.grid!.color).toBeUndefined();
    expect(yScale.grid!.color).toBe(GRAY_700);
    expect(xScale.ticks!.color).toBe("#FFFFFF");
    expect(yScale.ticks!.color).toBe("#FFFFFF");
    expect(xScale.title!.color).toBe("#FFFFFF");
    expect(yScale.title!.color).toBe("#FFFFFF");

    expect(config.data.datasets[0].backgroundColor).toBe("#4178A4"); // Adapted from default Blue
  });

  test("Chart custom colors in dark mode", () => {
    const model = createModelFromGrid(grid, { colorScheme: "dark" });
    const CUSTOM_COLOR = "#FF0000";
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        type: "bar",
        title: { text: "Title", color: CUSTOM_COLOR },
        axesDesign: {
          x: { title: { text: "X Axis", color: CUSTOM_COLOR } },
          y: { title: { text: "Y Axis", color: CUSTOM_COLOR } },
        },
      },
      "custom_colors"
    );

    const runtime = model.getters.getChartRuntime("custom_colors") as BarChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"bar">;
    const options = config.options!;

    expect(options.plugins!.title!.color).toBe(model.getters.getAdaptedColor(CUSTOM_COLOR));

    const xScale = options.scales!.x!;
    const yScale = options.scales!.y!;

    expect(xScale.title!.color).toBe(model.getters.getAdaptedColor(CUSTOM_COLOR));
    expect(yScale.title!.color).toBe(model.getters.getAdaptedColor(CUSTOM_COLOR));
  });

  test("Chart pie legend colors in dark mode", () => {
    const model = createModelFromGrid(grid, { colorScheme: "dark" });
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        type: "pie",
      },
      "pie_legend"
    );

    const runtime = model.getters.getChartRuntime("pie_legend") as PieChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"pie">;

    expect(config.data.datasets[0].backgroundColor).toContain("#4EA7F2");
  });

  test("Chart colors with explicit background in dark mode", () => {
    const model = createModelFromGrid(grid, { colorScheme: "dark" });
    const EXPLICIT_WHITE = "#FFFFFF";

    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        type: "bar",
        background: EXPLICIT_WHITE,
        title: { text: "Title" },
      },
      "3"
    );

    const runtime = model.getters.getChartRuntime("3") as BarChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"bar">;
    const options = config.options!;

    // Background should be the explicit one
    expect(options.plugins?.background?.color).toBe(EXPLICIT_WHITE);

    // Text colors should be dark (because background is light)
    expect(options.plugins!.title!.color).toBe("#666666");

    const xScale = options.scales!.x!;
    const yScale = options.scales!.y!;

    // Scales should be in light mode color
    expect(xScale.grid!.color).toBeUndefined();
    expect(yScale.grid!.color).toBe(GRAY_300);
    expect(xScale.ticks!.color).toBe("#000000");
    expect(yScale.ticks!.color).toBe("#000000");
  });

  test("Chart colors with explicit dark background in light mode", () => {
    const model = createModelFromGrid(grid, { colorScheme: "light" });
    const EXPLICIT_DARK = "#000000";

    createChart(
      model,
      {
        dataSets: [{ dataRange: "B1:B2" }],
        labelRange: "A1:A2",
        type: "bar",
        background: EXPLICIT_DARK,
        title: { text: "Title" },
      },
      "4"
    );

    const runtime = model.getters.getChartRuntime("4") as BarChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"bar">;
    const options = config.options!;

    // Background should be the explicit one
    expect(options.plugins?.background?.color).toBe(EXPLICIT_DARK);

    // Text colors should be light (because background is dark)
    expect(options.plugins!.title!.color).toBe("#C8C8C8");

    const xScale = options.scales!.x!;
    const yScale = options.scales!.y!;

    // Scales should be in dark mode color
    expect(xScale.grid!.color).toBeUndefined();
    expect(yScale.grid!.color).toBe(GRAY_700);
    expect(xScale.ticks!.color).toBe("#FFFFFF");
    expect(yScale.ticks!.color).toBe("#FFFFFF");
  });
});
