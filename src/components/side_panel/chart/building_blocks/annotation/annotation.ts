import { props, proxy, signal } from "@odoo/owl";
import { withHttps } from "../../../../../helpers/links";
import { Component, useLayoutEffect } from "../../../../../owl3_compatibility_layer";
import { _t } from "../../../../../translation";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { TextInput } from "../../../../text_input/text_input";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";

interface annotationState {
  annotationTextInput: string;
  isOverflowing: boolean;
}

export class ChartAnnotation extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartAnnotation";
  static components = { SidePanelCollapsible, Section, TextInput };
  protected props = props(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<any>;

  private editorRef = signal<HTMLElement | null>(null);

  private state: annotationState = proxy({
    annotationTextInput: this.props.definition.annotationText || "",
    isOverflowing: false,
  });

  setup() {
    useLayoutEffect(
      (el, annotationText) => {
        if (el && !el.matches(":focus") && el.innerText !== (annotationText || "")) {
          el.innerText = annotationText || "";
          this.state.annotationTextInput = annotationText || "";
          this.updateOverflowState(el);
        }
      },
      () => [this.editorRef(), this.props.definition.annotationText]
    );
    useLayoutEffect(
      (el) => {
        if (!el) {
          return;
        }
        const observer = new ResizeObserver(() => this.updateOverflowState(el));
        observer.observe(el);
        this.updateOverflowState(el);
        return () => observer.disconnect();
      },
      () => [this.editorRef()]
    );
  }

  private updateOverflowState(el: HTMLElement) {
    this.state.isOverflowing = el.scrollHeight > el.clientHeight;
  }

  get annotationPlaceholder() {
    return _t("Add a description text");
  }

  checkLength(ev: InputEvent) {
    const currentLength = (ev.target as HTMLInputElement).innerText.length;
    if (currentLength >= 2000 && !ev.inputType.startsWith("delete")) {
      ev.preventDefault();
    }
  }

  onInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const text = el.innerText.trim();
    if (text === "") {
      // Clear all DOM children (like <br> or empty spans) to ensure the CSS :empty selector triggers and shows the placeholder.
      el.replaceChildren();
      this.state.annotationTextInput = "";
    } else if (text.length > 2000) {
      el.innerText = text.substring(0, 2000);
      this.state.annotationTextInput = el.innerText.trim();
    } else {
      this.state.annotationTextInput = text;
    }
    this.updateOverflowState(el);
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
