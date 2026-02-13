import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";
import { GeoChartRegionSelectSection } from "./geo_chart_region_select_section";

export class GeoChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-GeoChartConfigPanel";
  static components = {
    ...GenericChartConfigPanel.components,
    GeoChartRegionSelectSection,
  };

  getLabelRangeOptions() {
    return []; // Geo charts data cannot be aggregated: override the default options from the generic config panel
  }
}
