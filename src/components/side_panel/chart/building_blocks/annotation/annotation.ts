import { withHttps } from "@odoo/o-spreadsheet-engine/helpers/links";
import { ChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, onPatched, useRef } from "@odoo/owl";
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

  setup() {
    onMounted(() => this.autoResize());
    onPatched(() => this.autoResize());
  }

  private annotationTextarea = useRef("annotationTextarea");

  updateAnnotationText(ev: Event) {
    const label = (ev.target as HTMLInputElement).value;
    this.props.updateChart(this.props.chartId, { annotationText: label });
    this.autoResize();
  }

  updateAnnotationLink(ev: Event) {
    let label = (ev.target as HTMLInputElement).value;
    if (label) {
      label = withHttps(label);
    }
    this.props.updateChart(this.props.chartId, { annotationLink: label });
  }

  onKeyDown(ev: KeyboardEvent) {
    const target = ev.target as HTMLInputElement;
    if (ev.key === "Enter") {
      target.blur();
    }
    if (ev.key === "Escape") {
      target.value = this.props.definition.annotationLink || "";
      target.blur();
    }
  }

  autoResize() {
    const textarea = this.annotationTextarea?.el;
    if (!textarea) {
      return;
    }
    const maxHeight = 200;
    textarea.style.height = "0px";
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = maxHeight + "px";
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.height = textarea.scrollHeight + "px";
      textarea.style.overflowY = "hidden";
    }
  }
}
