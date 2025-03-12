import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class PyramidConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-PyramidConfigPanel";

  get disabledRanges() {
    return this.props.definition.dataSets.map((ds, i) => i > 1);
  }
}
