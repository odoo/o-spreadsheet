import { spreadRange } from "../../../../helpers";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";
import { GeoChartRegionSelectSection } from "./geo_chart_region_select_section";

export class GeoChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-GeoChartConfigPanel";
  static components = { ...GenericChartConfigPanel.components, GeoChartRegionSelectSection };

  get dataRanges() {
    return this.getDataSeriesRanges().slice(0, 1);
  }

  onDataSeriesConfirmed() {
    this.dataSets = spreadRange(this.env.model.getters, this.dataSets).slice(0, 1);
    this.state.datasetDispatchResult = this.props.updateChart(this.props.figureId, {
      dataSets: this.dataSets,
    });
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
