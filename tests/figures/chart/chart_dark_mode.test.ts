import { GRAY_200_DARK, GRAY_300, GRAY_700 } from "@odoo/o-spreadsheet-engine/constants";
import { BarChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/bar_chart";
import { ChartConfiguration } from "chart.js";
import { Model } from "../../../src";

import { createChart } from "../../test_helpers/commands_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";

const grid = {
  A1: "1",
  A2: "2",
  B1: "10",
  B2: "20",
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

    // Background
    expect(options.plugins?.background?.color).toBe("#FFFFFF");

    // Title
    expect(options.plugins!.title!.color).toBe("#666666");

    // Scales
    const xScale = options.scales!.x!;
    const yScale = options.scales!.y!;

    // Grid lines default color
    expect(xScale.grid!.color).toBeUndefined();
    expect(yScale.grid!.color).toBe(GRAY_300);

    // Ticks color
    expect(xScale.ticks!.color).toBe("#000000");
    expect(yScale.ticks!.color).toBe("#000000");

    // Axis titles color
    // @ts-ignore
    expect(xScale.title!.color).toBeUndefined(); // helper returns undefined if not set, falls back to default
    // @ts-ignore
    expect(yScale.title!.color).toBeUndefined();
  });

  test("Chart colors in dark mode", () => {
    const model = createModelFromGrid(grid, { colorScheme: "dark" });
    // We need to recreate the model/chart because background is resolved at creation time
    // or we can just create a new chart on the existing model
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

    // Background
    expect(options.plugins?.background?.color).toBe(GRAY_200_DARK);

    // Title
    expect(options.plugins!.title!.color).toBe("#C8C8C8");

    // Scales
    const xScale = options.scales!.x!;
    const yScale = options.scales!.y!;

    // Grid lines dark mode color
    expect(xScale.grid!.color).toBeUndefined();
    expect(yScale.grid!.color).toBe(GRAY_700);

    // Ticks color
    expect(xScale.ticks!.color).toBe("#FFFFFF");
    expect(yScale.ticks!.color).toBe("#FFFFFF");
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

    // Grid lines should be light mode color
    expect(xScale.grid!.color).toBeUndefined();
    expect(yScale.grid!.color).toBe(GRAY_300);

    // Ticks color
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

    // Grid lines should be dark mode color
    expect(xScale.grid!.color).toBeUndefined();
    expect(yScale.grid!.color).toBe(GRAY_700);

    // Ticks color
    expect(xScale.ticks!.color).toBe("#FFFFFF");
    expect(yScale.ticks!.color).toBe("#FFFFFF");
  });
});
