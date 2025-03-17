import { canChartParseLabels } from "../../../../helpers/figures/charts/runtime";
import { ScatterChart } from "../../../../helpers/figures/charts/scatter_chart";
import { LineChartDefinition, ScatterChartDefinition } from "../../../../types/chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class ScatterConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-ScatterConfigPanel";

  get canTreatLabelsAsText() {
    const chart = this.env.model.getters.getChart(this.props.figureId);
    if (chart && chart instanceof ScatterChart) {
      return canChartParseLabels(
        chart.getDefinition(),
        chart.dataSets,
        chart.labelRange,
        this.env.model.getters
      );
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

  onToggleZoom(enabled: boolean) {
    const definition = this.props.definition as ScatterChartDefinition;
    const zoom = {
      ...definition.zoom,
      enabled,
    };
    if (enabled) {
      zoom.sliceable = true;
    }
    this.props.updateChart(this.props.figureId, {
      zoom,
    });
  }
}
