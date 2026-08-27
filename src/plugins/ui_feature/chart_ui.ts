import { ChartRuntime } from "../../types/chart/chart";
import { UIPlugin } from "../ui_plugin";

export class ChartUIPlugin extends UIPlugin {
  static getters = ["getChartRuntime"] as const;

  getChartRuntime(chartId: string): ChartRuntime {
    return this.getters.getChartRuntimeWithTheme(
      chartId,
      this.getters.getSpreadsheetTheme().colorThemeName
    );
  }
}
