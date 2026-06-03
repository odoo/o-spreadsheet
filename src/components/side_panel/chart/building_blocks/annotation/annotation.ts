import { props, proxy, signal } from "@odoo/owl";
import { withHttps } from "../../../../../helpers/links";
import { Component, useLayoutEffect } from "../../../../../owl3_compatibility_layer";
import { _t } from "../../../../../translation";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { ContentEditableHelper } from "../../../../composer/content_editable_helper";
import { TextInput } from "../../../../text_input/text_input";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";

interface annotationState {
  annotationTextInput: string;
}
export class ChartAnnotation extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartAnnotation";
  static components = { SidePanelCollapsible, Section, TextInput };
  protected props = props(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<any>;

  private editorRef = signal<HTMLElement | null>(null);

  contentHelper: ContentEditableHelper = new ContentEditableHelper(
    this.editorRef() as unknown as HTMLElement
  );

  private state: annotationState = proxy({
    annotationTextInput: this.props.definition.annotationText || "",
  });

  get annotationPlaceholder() {
    return _t("Add a description text");
  }

  setup() {
    useLayoutEffect(
      (el, annotationText) => {
        if (el && !el.matches(":focus") && el.innerText !== (annotationText || "")) {
          el.innerText = annotationText || "";
          this.state.annotationTextInput = annotationText || "";
        }
      },
      () => [this.editorRef(), this.props.definition.annotationText]
    );
  }

  checkLength(ev: InputEvent) {
    const currentLength = (ev.target as HTMLInputElement).innerText.length;
    if (currentLength >= 2000 && !ev.inputType.startsWith("delete")) {
      ev.preventDefault();
    }
  }

  onInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const text = el.innerText;
    if (text.trim() === "") {
      // Clear all DOM children (like <br> or empty spans) to ensure the CSS :empty selector triggers and shows the placeholder.
      el.replaceChildren();
      this.state.annotationTextInput = "";
    } else if (text.length > 2000) {
      el.innerText = text.substring(0, 2000);
      this.state.annotationTextInput = el.innerText;
    } else {
      this.state.annotationTextInput = text;
    }
  }

  onBlur() {
    this.props.updateChart(this.props.chartId, { annotationText: this.state.annotationTextInput });
  }

  updateAnnotationLink(label: string) {
    if (label) {
      label = withHttps(label);
    }
    this.props.updateChart(this.props.chartId, { annotationLink: label });
  }
}
