import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";
import { GeoChartRegionSelectSection } from "./geo_chart_region_select_section";

export class GeoChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-GeoChartConfigPanel";
  static components = {
    ...GenericChartConfigPanel.components,
    GeoChartRegionSelectSection,
  };

  get dataRanges() {
    return this.getDataSeriesRanges();
  }

  // get disabledRanges() {
  //   return this.props.definition.dataSetStyles.map((ds, i) => i > 0);
  // }

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
