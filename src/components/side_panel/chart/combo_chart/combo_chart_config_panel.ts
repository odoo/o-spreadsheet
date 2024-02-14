import { _t } from "../../../../translation";
import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class ComboChartConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-ComboChartConfigPanel";

  get shouldUseRightAxis(): string {
    return _t("Use right axis for line series");
  }

  onUpdateUseRightAxis(useBothYAxis: boolean) {
    this.props.updateChart(this.props.figureId, {
      useBothYAxis,
    });
  }
}
