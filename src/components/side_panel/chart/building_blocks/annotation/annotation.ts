import { withHttps } from "@odoo/o-spreadsheet-engine/helpers/links";
import { ChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, useRef } from "@odoo/owl";
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

  updateAnnotationText(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const text = el.innerText;
    if (text === "") {
      el.replaceChildren();
    }
    this.props.updateChart(this.props.chartId, { annotationText: text });
  }

  updateAnnotationLink(label: string) {
    if (label) {
      label = withHttps(label);
    }
    this.props.updateChart(this.props.chartId, { annotationLink: label });
  }
}
