import { _t } from "../../../../translation";
import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class ComboConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-ComboConfigPanel";

  get stackedLabel(): string {
    return _t("Stacked combochart");
  }

  get shouldUseRightAxis(): string {
    return _t("Use right axis for line series");
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

  onUpdateUseRightAxis(useBothYAxis: boolean) {
    this.props.updateChart(this.props.figureId, {
      useBothYAxis,
    });
  }
}
