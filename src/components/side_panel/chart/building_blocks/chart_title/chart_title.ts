import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv, TitleDesign } from "../../../../../types";
import { StandaloneComposer } from "../../../../composer/standalone_composer/standalone_composer";
import { Section } from "../../../components/section/section";
import { TextStyler } from "../text_styler/text_styler";

type TitleMode = "static" | "dynamic";

interface Props {
  title?: string;
  placeholder?: string;
  updateTitle: (title: string) => void;
  name?: string;
  style: TitleDesign;
  defaultStyle?: Partial<TitleDesign>;
  updateStyle: (style: TitleDesign) => void;
  titleMode?: TitleMode;
}

export class ChartTitle extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartTitle";
  static components = { Section, TextStyler, StandaloneComposer };
  static props = {
    title: { type: String, optional: true },
    placeholder: { type: String, optional: true },
    updateTitle: Function,
    name: { type: String },
    style: Object,
    defaultStyle: { type: Object, optional: true },
    updateStyle: Function,
    titleMode: { type: String, optional: true },
  };
  static defaultProps = {
    title: "",
    placeholder: "",
    titleMode: "static",
  };

  updateTitle(newTitle: string) {
    this.props.updateTitle(newTitle);
  }

  /**
   * TODO: Chart Title is also used inside the scorecard.
   * If we use composer here, then we need to handle that part as well.
   */
}
