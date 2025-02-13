import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class SunburstChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-SunburstChartConfigPanel";
  static components = { ...GenericChartConfigPanel.components };

  getLabelRangeOptions() {
    return [
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: this.props.definition.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }
}
