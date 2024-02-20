import { Component, useExternalListener, useState } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../../types";
import { ColorPickerWidget } from "../../../../color_picker/color_picker_widget";
import { Section } from "../../../components/section/section";

interface State {
  pickerOpened: boolean;
}

interface Props {
  currentColor?: string;
  onColorPicked: (color: string) => void;
  title?: string;
}

export class ChartColor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartColor";
  static components = { ColorPickerWidget, Section };
  static props = {
    currentColor: { type: String, optional: true },
    onColorPicked: Function,
    title: { type: String, optional: true },
  };

  private state!: State;

  setup() {
    this.state = useState({ pickerOpened: false });
    useExternalListener(window as any, "click", this.closePicker);
  }

  closePicker() {
    this.state.pickerOpened = false;
  }

  togglePicker() {
    this.state.pickerOpened = !this.state.pickerOpened;
  }
}
