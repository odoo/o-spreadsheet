import { withHttps } from "@odoo/o-spreadsheet-engine/helpers/links";
import { ChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

export class ChartAnnotation extends Component<
  ChartSidePanelProps<ChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet.ChartAnnotation";
  static components = { SidePanelCollapsible, Section };
  static props = ChartSidePanelPropsObject;

  updateAnnotationText(ev: Event) {
    const label = (ev.target as HTMLInputElement).value;
    this.props.updateChart(this.props.chartId, { annotationText: label });
  }

  updateAnnotationLink(ev: Event) {
    let label = (ev.target as HTMLInputElement).value;
    if (label) {
      label = withHttps(label);
    }
    this.props.updateChart(this.props.chartId, { annotationLink: label });
  }
}
