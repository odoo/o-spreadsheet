import {
  BarControllerChartOptions,
  BarControllerDatasetOptions,
  CartesianParsedData,
  CartesianScaleTypeRegistry,
} from "chart.js";

console.log("REGISTY");

// @ts-ignore
const BarController = window.Chart?.BarController;

export class FunnelChartController extends BarController {
  static id = "funnel";
  static defaults = {};
  id = "funnel";
  //   update(mode) {}

  //   updateElements(rects, start, count, mode) {}

  //   draw() {}
}

declare module "chart.js" {
  interface ChartTypeRegistry {
    funnel: {
      chartOptions: BarControllerChartOptions;
      datasetOptions: BarControllerDatasetOptions;
      defaultDataPoint: number | [number, number] | null;
      metaExtensions: {};
      parsedDataType: CartesianParsedData;
      scales: keyof CartesianScaleTypeRegistry;
    };
  }
}
