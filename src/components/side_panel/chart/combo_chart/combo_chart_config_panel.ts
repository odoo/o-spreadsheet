import { _t } from "../../../../translation";
import { GenericChartConfigPanel } from "../line_bar_pie_panel/config_panel";

export class ComboChartConfigPanel extends GenericChartConfigPanel {
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
