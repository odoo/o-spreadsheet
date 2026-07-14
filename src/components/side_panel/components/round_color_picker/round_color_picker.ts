import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { Rect } from "../../../../types";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { ColorPicker } from "../../../color_picker/color_picker";
import { cssPropertiesToCss } from "../../../helpers";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { Section } from "../section/section";

interface State {
  pickerOpened: boolean;
}

interface Props {
  currentColor?: string;
  onColorPicked: (color: string) => void;
  title?: string;
  disableNoColor?: boolean;
}

export class RoundColorPicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.RoundColorPicker";
  static components = { Section, ColorPicker };
  static props = {
    currentColor: { type: String, optional: true },
    title: { type: String, optional: true },
    onColorPicked: Function,
    disableNoColor: { type: Boolean, optional: true },
  };

  colorPickerButtonRef = useRef("colorPickerButton");

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

  onColorPicked(color: string) {
    this.props.onColorPicked(color);
    this.state.pickerOpened = false;
  }

  get colorPickerAnchorRect(): Rect {
    const button = this.colorPickerButtonRef.el!;
    return getBoundingRectAsPOJO(button);
  }

  get buttonStyle() {
    return cssPropertiesToCss({
      background: this.props.currentColor,
    });
  }
}
