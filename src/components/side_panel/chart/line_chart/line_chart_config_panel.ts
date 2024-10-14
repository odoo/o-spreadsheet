import { LineChart } from "../../../../helpers/figures/charts";
import { canChartParseLabels } from "../../../../helpers/figures/charts/chart_common_line_scatter";
import { LineChartDefinition } from "../../../../types/chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class LineConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-LineConfigPanel";

  get canTreatLabelsAsText() {
    const chart = this.env.model.getters.getChart(this.props.figureId);
    if (chart && chart instanceof LineChart) {
      return canChartParseLabels(chart.labelRange, this.env.model.getters);
    }
    return false;
  }

  get stackedLabel(): string {
    const definition = this.props.definition as LineChartDefinition;
    return definition.fillArea ? this.chartTerms.StackedAreaChart : this.chartTerms.StackedBarChart;
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

  onUpdateLabelsAsText(labelsAsText: boolean) {
    this.props.updateChart(this.props.figureId, {
      labelsAsText,
    });
  }

  onUpdateStacked(stacked: boolean) {
    this.props.updateChart(this.props.figureId, {
      stacked,
    });
  }

  onUpdateCumulative(cumulative: boolean) {
    this.props.updateChart(this.props.figureId, {
      cumulative,
    });
  }
}
