import { withHttps } from "@odoo/o-spreadsheet-engine/helpers/links";
import { ChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, useRef } from "@odoo/owl";
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

  private editorRef = useRef("annotationTextarea");

  setup() {
    onMounted(() => {
      if (this.editorRef.el) {
        this.editorRef.el.innerText = this.props.definition.annotationText || "";
      }
    });
  }

  updateAnnotationText(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const text = el.innerText;
    if (text === "") {
      el.replaceChildren();
    }
    this.props.updateChart(this.props.chartId, { annotationText: text });
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
}
