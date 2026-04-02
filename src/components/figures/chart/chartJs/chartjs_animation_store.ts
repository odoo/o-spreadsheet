import { SpreadsheetStore } from "../../../../stores/spreadsheet_store";
import { ChartType } from "../../../../types/chart/chart";
import { UID } from "../../../../types/misc";

export class ChartAnimationStore extends SpreadsheetStore {
  mutators = ["disableAnimationForChart", "enableAnimationForChart"] as const;

  animationPlayed = {};

  disableAnimationForChart(chartId: UID, chartType: ChartType) {
    this.animationPlayed[chartId] = chartType;
    return "noStateChange";
  }

  enableAnimationForChart(chartId: UID) {
    this.animationPlayed[chartId] = undefined;
    return "noStateChange";
  }
}
