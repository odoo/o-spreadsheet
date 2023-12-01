import { canChartParseLabels } from "../../../../helpers/figures/charts/chart_common_line_scatter";
import { ScatterChart } from "../../../../helpers/figures/charts/scatter_chart";
import { _t } from "../../../../translation";
import { LineChartDefinition } from "../../../../types/chart";
import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class ScatterConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-ScatterConfigPanel";

  get canTreatLabelsAsText() {
    const chart = this.env.model.getters.getChart(this.props.figureId);
    if (chart && chart instanceof ScatterChart) {
      return canChartParseLabels(chart.labelRange, this.env.model.getters);
    }
    return false;
  }

  onUpdateLabelsAsText(labelsAsText: boolean) {
    this.props.updateChart(this.props.figureId, {
      labelsAsText,
    });
  }

  getLabelRangeOptions() {
    const options = super.getLabelRangeOptions();
    if (this.canTreatLabelsAsText) {
      options.push({
        name: "labelsAsText",
        value: (this.props.definition as LineChartDefinition).labelsAsText,
        label: _t("Treat labels as text"),
        onChange: this.onUpdateLabelsAsText.bind(this),
      });
    }
    return options;
  }
}
