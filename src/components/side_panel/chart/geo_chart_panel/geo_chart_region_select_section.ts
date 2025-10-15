import { GeoChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { DispatchResult, UID } from "../../../../types/index";
import { Section } from "../../components/section/section";

interface Props {
  chartId: UID;
  definition: GeoChartDefinition;
  updateChart: (chartId: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
}

export class GeoChartRegionSelectSection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GeoChartRegionSelectSection";
  static components = { Section };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
  };

  updateSelectedRegion(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value;
    this.props.updateChart(this.props.chartId, { region: value });
  }

  get availableRegions() {
    return this.env.model.getters.getGeoChartAvailableRegions();
  }

  get selectedRegion() {
    return this.props.definition.region || this.availableRegions[0]?.id;
  }
}
