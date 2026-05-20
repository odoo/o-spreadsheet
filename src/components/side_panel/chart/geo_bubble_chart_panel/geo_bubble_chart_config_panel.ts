import { _t } from "../../../../translation";
import { GeoChartConfigPanel } from "../geo_chart_panel/geo_chart_config_panel";

export class GeoBubbleChartConfigPanel extends GeoChartConfigPanel {
  static template = "o-spreadsheet-GeoChartConfigPanel";

  get labelRangeTitle() {
    return _t("Cities");
  }
}
