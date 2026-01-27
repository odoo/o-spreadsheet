import { Component, onMounted, useRef } from "@odoo/owl";
import { withHttps } from "../../../../../helpers/links";
import { ChartDefinition } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { TextInput } from "../../../../text_input/text_input";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

export class ChartAnnotation extends Component<
  ChartSidePanelProps<ChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet.ChartAnnotation";
  static components = { SidePanelCollapsible, Section, TextInput };
  static props = ChartSidePanelPropsObject;

  private editorRef = useRef("annotationTextarea");

  setup() {
    onMounted(() => {
      if (this.editorRef.el) {
        this.editorRef.el.innerText = this.props.definition.annotationText || "";
      }
    });
  }

  checkLength(ev: Event) {
    const currentLength = (ev.target as HTMLInputElement).innerText.length;
    if (currentLength >= 2000) {
      ev.preventDefault();
    }
  }

  updateAnnotationText(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const text = el.innerText;
    if (text === "") {
      el.replaceChildren();
    }
    if (text.length > 2000) {
      el.innerText = text.substring(0, 2000);
    }
    this.props.updateChart(this.props.chartId, { annotationText: el.innerText });
  }

  updateAnnotationLink(label: string) {
    if (label) {
      label = withHttps(label);
    }
    this.props.updateChart(this.props.chartId, { annotationLink: label });
  }
}
