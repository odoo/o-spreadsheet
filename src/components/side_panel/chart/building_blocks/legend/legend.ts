import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition } from "../../../../../types";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

interface Props extends ChartSidePanelProps<ChartWithDataSetDefinition> {
  disabled?: boolean;
}

export class ChartLegend extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartLegend";
  static components = {
    Section,
  };
  static props = {
    ...ChartSidePanelPropsObject,
    disabled: { type: Boolean, optional: true },
  };

  updateLegendPosition(ev) {
    this.props.updateChart(this.props.chartId, {
      legendPosition: ev.target.value,
    });
  }
}
