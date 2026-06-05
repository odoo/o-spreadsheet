import { props } from "@odoo/owl";
import { GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { DispatchResult } from "../../../../types/commands";
import { UID, ValueAndLabel } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Select } from "../../../select/select";
import { Section } from "../../components/section/section";

import { Component } from "../../../../owl3_compatibility_layer";
import { useModel } from "../../../owl_plugins/model_plugin";
import { types } from "../../../props_validation";
export class GeoChartRegionSelectSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GeoChartRegionSelectSection";
  static components = { Section, Select };

  protected props = props({
    chartId: types.UID(),
    definition: types.GeoChartDefinition(),
    updateChart: types.function<
      [chartId: UID, definition: Partial<GeoChartDefinition>],
      DispatchResult
    >([types.UID(), types.object({})], types.DispatchResult()),
  });

  updateSelectedRegion(value: string) {
    this.props.updateChart(this.props.chartId, { region: value });
  }

  get availableRegions() {
    return this.model().getters.getGeoChartAvailableRegions();
  }

  get selectedRegion() {
    return this.props.definition.region || this.availableRegions[0]?.id;
  }

  get regionOptions(): ValueAndLabel[] {
    return this.availableRegions.map((region) => ({ value: region.id, label: region.label }));
  }

  private model = useModel();
}
