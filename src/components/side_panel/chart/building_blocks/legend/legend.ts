import { Component } from "@odoo/owl";
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { _t } from "../../../../../translation";
import { ChartWithDataSetDefinition, ValueAndLabel } from "../../../../../types";
import { LegendPosition } from "../../../../../types/chart";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Select } from "../../../../select/select";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
import { ChartWithDataSetDefinition } from "../../../../../types";
=======
import { ChartWithDataSetDefinition } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

export class ChartLegend extends Component<
  ChartSidePanelProps<ChartWithDataSetDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ChartLegend";
  static components = {
    Section,
    Select,
  };
  static props = ChartSidePanelPropsObject;

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
