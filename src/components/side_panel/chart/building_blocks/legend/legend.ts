import { _t, ValueAndLabel } from "@odoo/o-spreadsheet-engine";
import { LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition } from "../../../../../types";
import { Select } from "../../../../select/select";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

const VALUES = {
  none: _t("None"),
  top: _t("Top"),
  bottom: _t("Bottom"),
  left: _t("Left"),
  right: _t("Right"),
};

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
    return Object.keys(VALUES).map((key) => ({
      value: key,
      label: VALUES[key as keyof typeof VALUES],
    }));
  }
}
