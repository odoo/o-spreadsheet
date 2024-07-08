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

export * from "./autofill";
export * from "./cells";
export * from "./chart/chart";
export * from "./clipboard";
export * from "./collaborative/revisions";
export * from "./collaborative/session";
export * from "./commands";
export * from "./conditional_formatting";
export * from "./currency";
export * from "./data_validation";
export * from "./env";
export * from "./figure";
export * from "./format";
export * from "./functions";
export * from "./getters";
export * from "./history";
export * from "./locale";
export * from "./misc";
export * from "./pivot";
export * from "./pivot_runtime";
export * from "./range";
export * from "./rendering";
export * from "./table";
export * from "./workbook_data";

declare global {
  interface Window {
    Chart: typeof Chart;
  }
}
