import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class ComboChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-ComboChartConfigPanel";

  onInvertAxesToggled(invertAxes: boolean) {
    this.props.updateChart(this.props.figureId, {
      invertAxes,
    });
  }
}
