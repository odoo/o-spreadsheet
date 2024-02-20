import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../../types";
import { Section } from "../../../components/section/section";

interface Props {
  title: string;
  update: (title: string) => void;
  name?: string;
  class?: string;
}

export class ChartTitle extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartTitle";
  static components = { Section };
  static props = {
    title: String,
    update: Function,
    name: { type: String, optional: true },
    class: { type: String, optional: true },
  };

  updateTitle(ev: InputEvent) {
    this.props.update((ev.target as HTMLInputElement).value);
  }
}
