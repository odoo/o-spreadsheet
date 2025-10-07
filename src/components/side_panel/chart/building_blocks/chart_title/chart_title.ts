import { Component } from "@odoo/owl";
import { TitleDesign } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheetChildEnv";
import { Section } from "../../../components/section/section";
import { TextStyler } from "../text_styler/text_styler";

interface Props {
  title?: string;
  placeholder?: string;
  updateTitle: (title: string) => void;
  name?: string;
  style: TitleDesign;
  defaultStyle?: Partial<TitleDesign>;
  updateStyle: (style: TitleDesign) => void;
}

export class ChartTitle extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartTitle";
  static components = { Section, TextStyler };
  static props = {
    title: { type: String, optional: true },
    placeholder: { type: String, optional: true },
    updateTitle: Function,
    name: { type: String },
    style: Object,
    defaultStyle: { type: Object, optional: true },
    updateStyle: Function,
  };
  static defaultProps = {
    title: "",
    placeholder: "",
  };

  updateTitle(ev: InputEvent) {
    this.props.updateTitle((ev.target as HTMLInputElement).value);
  }
}
