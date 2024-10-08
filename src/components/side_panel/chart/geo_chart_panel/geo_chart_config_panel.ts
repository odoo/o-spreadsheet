import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class GeoChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-GeoChartConfigPanel";

  get dataRanges() {
    return this.getDataSeriesRanges().slice(0, 1);
  }

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
