import { _t } from "../../../../translation";
import { BarChartDefinition } from "../../../../types/chart";
import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class BarConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-BarConfigPanel";

  get stackedLabel(): string {
    return _t("Stacked barchart");
  }

  getInitialColors() {
    return ((this.props.definition as BarChartDefinition).dataSetDesign ?? []).map(
      (design) => design.backgroundColor
    );
  }

  onUpdateStacked(stacked: boolean) {
    this.props.updateChart(this.props.figureId, {
      stacked,
    });
  }

  onUpdateAggregated(aggregated: boolean) {
    this.props.updateChart(this.props.figureId, {
      aggregated,
    });
  }
}
