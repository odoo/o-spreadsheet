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
      const chartBackground = (this.chart.config as any).options?.chartBackground;
      const backgroundColor = chartBackground || "#ffffff";
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
      chartOptions: BarControllerChartOptions & { chartBackground: string };
      datasetOptions: BarControllerDatasetOptions & { values: number[] };
      defaultDataPoint: number | null;
      metaExtensions: {};
      parsedDataType: CartesianParsedData;
      scales: keyof CartesianScaleTypeRegistry;
    };
  }
}
