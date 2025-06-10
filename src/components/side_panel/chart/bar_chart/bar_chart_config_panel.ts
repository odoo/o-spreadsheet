import { BarChartDefinition } from "../../../../types/chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class BarConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-BarConfigPanel";

  get stackedLabel(): string {
    const definition = this.props.definition as BarChartDefinition;
    return definition.horizontal
      ? this.chartTerms.StackedBarChart
      : this.chartTerms.StackedColumnChart;
  }

  onUpdateStacked(stacked: boolean) {
    this.props.updateChart(this.props.figureId, {
      stacked,
    });
  }

  onToggleZoom(enabled: boolean) {
    const definition = this.props.definition as BarChartDefinition;
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
