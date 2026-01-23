import { LineChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { canChartParseLabels } from "../../../../helpers/figures/charts/runtime";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class LineConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-LineConfigPanel";

  get canTreatLabelsAsText() {
    const chart = this.env.model.getters.getChart(this.props.chartId);
    const definition = chart?.getRangeDefinition();
    const sheetId = chart?.sheetId;
    if (sheetId && definition?.type === "line") {
      return canChartParseLabels(this.env.model.getters, sheetId, definition);
    }
    return false;
  }

  get stackedLabel(): string {
    const definition = this.props.definition as LineChartDefinition<string>;
    return definition.fillArea
      ? this.chartTerms.StackedAreaChart
      : this.chartTerms.StackedLineChart;
  }

  getLabelRangeOptions() {
    const options = super.getLabelRangeOptions();
    if (this.canTreatLabelsAsText) {
      options.push({
        name: "labelsAsText",
        value: (this.props.definition as LineChartDefinition<string>).labelsAsText,
        label: this.chartTerms.TreatLabelsAsText,
        onChange: this.onUpdateLabelsAsText.bind(this),
      });
    }
    return options;
  }

  onUpdateLabelsAsText(labelsAsText: boolean) {
    this.props.updateChart(this.props.chartId, {
      labelsAsText,
    });
  }

  onUpdateStacked(stacked: boolean) {
    this.props.updateChart(this.props.chartId, {
      stacked,
    });
  }

  onUpdateCumulative(cumulative: boolean) {
    this.props.updateChart(this.props.chartId, {
      cumulative,
    });
  }
}
