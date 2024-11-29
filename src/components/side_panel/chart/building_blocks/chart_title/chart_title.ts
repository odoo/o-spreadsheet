import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv, TitleDesign } from "../../../../../types";
import { css } from "../../../../helpers";
import { Section } from "../../../components/section/section";
import { TextStyler } from "../text_styler/text_styler";

css/* scss */ `
  .o-chart-title-designer {
    > span {
      height: 30px;
    }
  }
`;

interface Props {
  title?: string;
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
    updateTitle: Function,
    name: { type: String, optional: true },
    style: Object,
    defaultStyle: { type: Object, optional: true },
    updateStyle: Function,
  };
  static defaultProps = {
    title: "",
  };

  updateTitle(ev: InputEvent) {
    this.props.updateTitle((ev.target as HTMLInputElement).value);
  }
}
