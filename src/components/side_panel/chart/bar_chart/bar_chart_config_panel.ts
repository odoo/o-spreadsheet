import { _t } from "../../../../translation";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class BarConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-BarConfigPanel";

  get stackedLabel(): string {
    return _t("Stacked barchart");
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
