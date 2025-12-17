import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class HierarchicalChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-HierarchicalChartConfigPanel";
  static components = { ...GenericChartConfigPanel.components };

  getLabelRangeOptions() {
    return [
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: this.props.definition.dataSource.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }
}
