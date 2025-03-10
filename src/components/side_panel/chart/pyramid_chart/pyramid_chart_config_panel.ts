import { BarConfigPanel } from "../bar_chart/bar_chart_config_panel";

export class PyramidConfigPanel extends BarConfigPanel {
  static template = "o-spreadsheet-PyramidConfigPanel";

  get disabledRanges() {
    return this.props.definition.dataSets.map((ds, i) => i > 1);
  }
}
