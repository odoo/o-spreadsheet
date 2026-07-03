import { useProps } from "@odoo/owl";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { useStatHighlights } from "./stat_highlights_hook";
import { StatisticItem } from "./statistic_item";

export class GeneralStatsSection extends OSComponent {
  static template = "o-spreadsheet-GeneralStatsSection";
  protected props = useProps({
    items: types.array(types.object<StatValue>()),
  });
  static components = {
    StatisticItem,
  };

  hoverStat!: (stat: StatValue, isHovered: boolean) => void;

  setup() {
    this.hoverStat = useStatHighlights(
      (cell, stat) => (stat.id === "min" || stat.id === "max") && cell.formattedValue === stat.value
    );
  }
}
