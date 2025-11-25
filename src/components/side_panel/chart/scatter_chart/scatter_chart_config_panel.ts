import { LineChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { canChartParseLabels } from "../../../../helpers/figures/charts/runtime";
import { ScatterChart } from "../../../../helpers/figures/charts/scatter_chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class ScatterConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-ScatterConfigPanel";

  get canTreatLabelsAsText() {
    const chart = this.env.model.getters.getChart(this.props.chartId);
    if (chart && chart instanceof ScatterChart) {
      return canChartParseLabels(this.env.model.getters, chart.sheetId, chart.getDefinition());
    }
    return false;
  }

  onUpdateLabelsAsText(labelsAsText: boolean) {
    this.props.updateChart(this.props.chartId, {
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
