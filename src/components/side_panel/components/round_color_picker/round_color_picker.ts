import { proxy, signal, useListener, useProps } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { Rect } from "../../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { ColorPicker } from "../../../color_picker/color_picker";
import { cssPropertiesToCss } from "../../../helpers/css";
import { getElBoundingRect } from "../../../helpers/dom_helpers";
import { types } from "../../../props_validation";
import { Section } from "../section/section";

interface State {
  pickerOpened: boolean;
}

export class RoundColorPicker extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.RoundColorPicker";
  static components = { Section, ColorPicker };
  protected props = useProps({
    currentColor: types.string().optional(),
    title: types.string().optional(),
    onColorPicked: types.function<(color: string) => void>(),
    disableNoColor: types.boolean().optional(),
  });

  colorPickerButtonRef = signal.ref();

  private state!: State;

  setup() {
    this.state = proxy({ pickerOpened: false });
    useListener(window as any, "click", this.closePicker.bind(this));
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
    return getElBoundingRect(this.colorPickerButtonRef());
  }

  get buttonStyle() {
    return cssPropertiesToCss({
      background: this.props.currentColor,
    });
  }
}
