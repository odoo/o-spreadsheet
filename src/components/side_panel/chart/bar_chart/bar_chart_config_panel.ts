import { BarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class BarConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-BarConfigPanel";

  get stackedLabel(): string {
    const definition = this.props.definition as BarChartDefinition<string>;
    return definition.horizontal
      ? this.chartTerms.StackedBarChart
      : this.chartTerms.StackedColumnChart;
  }

  onUpdateStacked(stacked: boolean) {
    this.props.updateChart(this.props.chartId, {
      stacked,
    });
  }
}
