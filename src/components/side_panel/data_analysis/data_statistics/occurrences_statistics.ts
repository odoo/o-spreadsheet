import { useProps } from "@odoo/owl";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { generateItemIdFromValue } from "../../../../helpers/data_statistics/statistics_suggestion";
import { Store } from "../../../../types/store_engine";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { DataAnalysisStore } from "../data_analysis_store";
import { useStatHighlights } from "./stat_highlights_hook";
import { StatisticItem } from "./statistic_item";

export class OccurrencesStatistics extends OSComponent {
  static template = "o-spreadsheet-OccurrencesStatistics";
  protected props = useProps({
    store: types.Store<DataAnalysisStore>(),
  });
  static components = {
    StatisticItem,
  };

  onStatHovered!: (stat: StatValue, isHovered: boolean) => void;

  setup() {
    this.onStatHovered = useStatHighlights(
      this.store.mainColumnZone,
      (cell, stat) => generateItemIdFromValue(cell.value) === generateItemIdFromValue(stat.id),
      this.store.hasHeader
    );
  }

  get store(): Store<DataAnalysisStore> {
    return this.props.store;
  }
}
