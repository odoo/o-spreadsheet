import { props, proxy, signal } from "@odoo/owl";
import { Component, useExternalListener } from "../../../../owl3_compatibility_layer";
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

// FIXME Encoding version used in css
// const TRANSPARENT_BACKGROUND_SVG = /*xml*/ `
// <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
//   <path fill="#d9d9d9" d="M5 5h5v5H5zH0V0h5"/>
// </svg>
// `;

export class RoundColorPicker extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.RoundColorPicker";
  static components = { Section, ColorPicker };
  protected props = props({
    currentColor: types.string().optional(),
    title: types.string().optional(),
    onColorPicked: types.function<(color: string) => void>(),
    disableNoColor: types.boolean().optional(),
  });

  colorPickerButtonRef = signal<HTMLElement | null>(null);

  private state!: State;

  setup() {
    this.state = proxy({ pickerOpened: false });
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
    return getElBoundingRect(this.colorPickerButtonRef());
  }

  get buttonStyle() {
    return cssPropertiesToCss({
      background: this.props.currentColor,
    });
  }
}
