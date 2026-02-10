import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import {
  BarController,
  BarControllerChartOptions,
  BarControllerDatasetOptions,
  CartesianParsedData,
  CartesianScaleTypeRegistry,
  Chart,
  ChartComponent,
} from "chart.js";

export function getCalendarChartController(): ChartComponent & {
  prototype: BarController;
  new (chart: Chart, datasetIndex: number): BarController;
} {
  if (!globalThis.Chart) {
    throw new Error("Chart.js library is not loaded");
  }
  return class CalendarChartController extends globalThis.Chart.BarController {
    static id = "calendar";
    static defaults = {
      ...globalThis.Chart?.BarController.defaults,
      dataElementType: "bar",
      animations: {
        numbers: { type: "number", properties: [] }, // Disable number animations (width, height, ...)
      },
    };

    updateElements(rects, start, count, mode) {
      super.updateElements(rects, start, count, mode);

      // Remove the element background at the start of an animation
      const chartBackground = this.chart.config.options?.plugins?.background?.color;
      const backgroundColor = chartBackground || BACKGROUND_CHART_COLOR;
      for (let i = start; i < start + count; i++) {
        if (mode === "reset") {
          this.updateElement(rects[i], i, { options: { backgroundColor } }, mode);
        }
      }
    }
  };
}

declare module "chart.js" {
  interface ChartTypeRegistry {
    calendar: {
      chartOptions: BarControllerChartOptions;
      datasetOptions: BarControllerDatasetOptions & { values: number[] };
      defaultDataPoint: number | null;
      metaExtensions: {};
      parsedDataType: CartesianParsedData;
      scales: keyof CartesianScaleTypeRegistry;
    };
  }
}
