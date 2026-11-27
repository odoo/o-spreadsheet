import { usePlugin } from "@odoo/owl";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { generateItemIdFromValue } from "../../../../helpers/data_statistics/statistics_suggestion";
import { OSComponent } from "../../../os_component";
import { DataAnalysisPlugin } from "../data_analysis_plugin";
import { useStatHighlights } from "./stat_highlights_hook";
import { StatisticItem } from "./statistic_item";

export class OccurrencesStatistics extends OSComponent {
  static template = "o-spreadsheet-OccurrencesStatistics";
  static components = {
    StatisticItem,
  };

  private dataAnalysisPlugin = usePlugin(DataAnalysisPlugin);

  onStatHovered!: (stat: StatValue, isHovered: boolean) => void;

  setup() {
    this.onStatHovered = useStatHighlights(
      (cell, stat) => generateItemIdFromValue(cell.value) === generateItemIdFromValue(stat.id),
      this.dataAnalysisPlugin.hasHeader()
    );
  }
}
