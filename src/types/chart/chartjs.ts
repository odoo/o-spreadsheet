import * as ChartJs from "chart.js";

export type GlobalChart = typeof ChartJs & typeof ChartJs.Chart;

declare global {
  var Chart: GlobalChart | undefined;
}
