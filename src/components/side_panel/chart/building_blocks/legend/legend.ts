import { props } from "@odoo/owl";
import { _t } from "../../../../../translation";
import { LegendPosition } from "../../../../../types/chart/common_chart";
import { ValueAndLabel } from "../../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Select } from "../../../../select/select";
import { Section } from "../../../components/section/section";

import { Component } from "../../../../../owl3_compatibility_layer";
import { types } from "../../../../props_validation";
import { ChartUpdateFunction } from "../../common";

export class ChartLegend extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartLegend";
  static components = {
    Section,
    Select,
  };

  protected props = props({
    chartId: types.string(),
    definition: types.ChartDefinitionWithDataSource(),
    canUpdateChart: types.function<ChartUpdateFunction>(),
    updateChart: types.function<ChartUpdateFunction>(),
    isDisabled: types.boolean().optional(false),
  });

  updateLegendPosition(value: LegendPosition) {
    this.props.updateChart(this.props.chartId, {
      legendPosition: value,
    });
  }

  get legendValues(): ValueAndLabel[] {
    return [
      { value: "none", label: _t("None") },
      { value: "top", label: _t("Top") },
      { value: "bottom", label: _t("Bottom") },
      { value: "left", label: _t("Left") },
      { value: "right", label: _t("Right") },
    ];
  }
}
