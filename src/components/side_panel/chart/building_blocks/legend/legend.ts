import { _t } from "../../../../../translation";
import { ChartWithDataSetDefinition, ValueAndLabel } from "../../../../../types";
import { LegendPosition } from "../../../../../types/chart";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Select } from "../../../../select/select";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

import { Component } from "../../../../../owl3_compatibility_layer";
export class ChartLegend extends Component<
  ChartSidePanelProps<ChartWithDataSetDefinition> & { isDisabled?: boolean },
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ChartLegend";
  static components = {
    Section,
    Select,
  };
  static props = {
    ...ChartSidePanelPropsObject,
    isDisabled: { type: Boolean, optional: true },
  };

  static defaultProps = {
    isDisabled: false,
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
