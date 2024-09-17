import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { GRAY_300 } from "../../../../constants";
import { Rect, SpreadsheetChildEnv } from "../../../../types";
import { ColorPicker } from "../../../color_picker/color_picker";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { css, cssPropertiesToCss } from "../../../helpers";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { Section } from "../section/section";

interface State {
  pickerOpened: boolean;
}

interface Props {
  currentColor?: string;
  onColorPicked: (color: string) => void;
  title?: string;
}

const TRANSPARENT_BACKGROUND_SVG = /*xml*/ `
<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
  <path fill="#d9d9d9" d="M5 5h5v5H5zH0V0h5"/>
</svg>
`;

css/* scss */ `
  .o-round-color-picker-button {
    width: 18px;
    height: 18px;
    cursor: pointer;
    border: 1px solid ${GRAY_300};
    background-position: 1px 1px;
    background-image: url("data:image/svg+xml,${encodeURIComponent(TRANSPARENT_BACKGROUND_SVG)}");
  }
`;

export class RoundColorPicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.RoundColorPicker";
  static components = { ColorPickerWidget, Section, ColorPicker };
  static props = {
    currentColor: { type: String, optional: true },
    title: { type: String, optional: true },
    onColorPicked: Function,
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
