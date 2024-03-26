import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class WaterfallChartConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-WaterfallConfigPanel";

  onUpdateStacked(stacked: boolean) {
    this.props.updateChart(this.props.figureId, {
      stacked,
    });
  }

  onUpdateAggregated(aggregated: boolean) {
    this.props.updateChart(this.props.figureId, {
      aggregated,
    });
  }
}
