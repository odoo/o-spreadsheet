import { canChartParseLabels } from "../../../../helpers/figures/charts/chart_common_line_scatter";
import { ScatterChart } from "../../../../helpers/figures/charts/scatter_chart";
import { LineChartDefinition } from "../../../../types/chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class ScatterConfigPanel extends GenericChartConfigPanel {
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
        label: this.chartTerms.TreatLabelsAsText,
        onChange: this.onUpdateLabelsAsText.bind(this),
      });
    }
    return options;
  }
}
