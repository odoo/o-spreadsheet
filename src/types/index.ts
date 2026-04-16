/**
 * State
 *
 * This file defines the basic types involved in maintaining the running state
 * of a o-spreadsheet.
 *
 * The most important exported values are:
 * - interface GridState: the internal type of the state managed by the model
 */

import { Chart } from "chart.js";
import * as ChartGeo from "chartjs-chart-geo";

export type * from "./autofill";
export * from "./cells";
export * from "./chart/chart";
export * from "./clipboard";
export type * from "./collaborative/revisions";
export type * from "./collaborative/session";
export * from "./commands";
export type * from "./conditional_formatting";
export type * from "./currency";
export type * from "./data_validation";
export type * from "./env";
export type * from "./figure";
export type * from "./format";
export type * from "./functions";
export type * from "./getters";
export type * from "./history";
export * from "./locale";
export * from "./misc";
export type * from "./pivot";
export type * from "./pivot_runtime";
export type * from "./range";
export * from "./rendering";
export type * from "./table";
export type * from "./workbook_data";

declare global {
  interface Window {
    Chart: typeof Chart;
    ChartGeo: typeof ChartGeo;
  }
}
