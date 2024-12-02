import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class ComboChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-ComboChartConfigPanel";

  onswitchAxesToggled(switchAxes: boolean) {
    this.props.updateChart(this.props.figureId, {
      switchAxes,
    });
  }
}
