import { _t } from "../../../../translation";
import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class WaterfallChartConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-WaterfallConfigPanel";

  onUpdateShowSubTotals(showSubTotals: boolean) {
    this.props.updateChart(this.props.figureId, {
      showSubTotals,
    });
  }

  onUpdateAggregated(aggregated: boolean) {
    this.props.updateChart(this.props.figureId, {
      aggregated,
    });
  }

  get showSubTotalsLabel(): string {
    return _t("Show subtotals at the end of series");
  }
}
