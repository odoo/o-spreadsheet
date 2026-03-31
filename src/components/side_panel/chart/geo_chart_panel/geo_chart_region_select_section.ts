import { Component } from "@odoo/owl";
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { DispatchResult, UID, ValueAndLabel } from "../../../../types/index";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Select } from "../../../select/select";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
import { DispatchResult, UID } from "../../../../types/index";
=======
import { GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { DispatchResult, UID } from "../../../../types/index";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { Section } from "../../components/section/section";

interface Props {
  chartId: UID;
  definition: GeoChartDefinition;
  updateChart: (chartId: UID, definition: Partial<GeoChartDefinition>) => DispatchResult;
}

export class GeoChartRegionSelectSection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GeoChartRegionSelectSection";
  static components = { Section, Select };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
  };

  updateSelectedRegion(value: string) {
    this.props.updateChart(this.props.chartId, { region: value });
  }

  get availableRegions() {
    return this.env.model.getters.getGeoChartAvailableRegions();
  }

  get selectedRegion() {
    return this.props.definition.region || this.availableRegions[0]?.id;
  }

  get regionOptions(): ValueAndLabel[] {
    return this.availableRegions.map((region) => ({ value: region.id, label: region.label }));
  }
}
