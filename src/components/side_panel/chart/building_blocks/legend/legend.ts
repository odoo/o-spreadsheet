import { _t, ValueAndLabel } from "@odoo/o-spreadsheet-engine";
import { LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition } from "../../../../../types";
import { Select } from "../../../../select/select";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

interface Props extends ChartSidePanelProps<ChartWithDataSetDefinition> {
  disabled?: boolean;
}

export class ChartLegend extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartLegend";
  static components = {
    Section,
    Select,
  };
  static props = {
    ...ChartSidePanelPropsObject,
    disabled: { type: Boolean, optional: true },
  };

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
