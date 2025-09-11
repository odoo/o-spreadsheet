import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition, SpreadsheetChildEnv } from "../../../../../types";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

export class ChartLegend extends Component<
  ChartSidePanelProps<ChartWithDataSetDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ChartLegend";
  static components = {
    Section,
  };
  static props = ChartSidePanelPropsObject;

  updateLegendPosition(ev) {
    this.props.updateChart(this.props.chartId, {
      legendPosition: ev.target.value,
    });
  }
}
