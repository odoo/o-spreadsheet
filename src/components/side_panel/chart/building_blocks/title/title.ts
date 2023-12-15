import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../../types";
import { ColorPickerWidget } from "../../../../color_picker/color_picker_widget";
import { Section } from "../../../components/section/section";

interface Props {
  title: string;
  update: (title: string) => void;
}

export class ChartTitle extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartTitle";
  static components = { ColorPickerWidget, Section };

  updateTitle(ev: InputEvent) {
    this.props.update((ev.target as HTMLInputElement).value);
  }
}

ChartTitle.props = {
  title: String,
  update: Function,
};
