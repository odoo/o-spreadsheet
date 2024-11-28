import { Component, useRef, useState } from "@odoo/owl";
import { DEFAULT_BORDER_DESC } from "../../constants";
import { BorderPosition, BorderStyle, Color, Pixel, Rect, SpreadsheetChildEnv } from "../../types";
import { BorderEditor } from "./border_editor";

interface Props {
  toggleBorderEditor: () => void;
  showBorderEditor: boolean;
  disabled?: boolean;
  dropdownMaxHeight?: Pixel;
  class?: string;
}

interface State {
  currentColor: Color;
  currentStyle: BorderStyle;
  currentPosition: BorderPosition | undefined;
}

export class BorderEditorWidget extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BorderEditorWidget";
  static props = {
    toggleBorderEditor: Function,
    showBorderEditor: Boolean,
    disabled: { type: Boolean, optional: true },
    dropdownMaxHeight: { type: Number, optional: true },
    class: { type: String, optional: true },
  };
  static components = { BorderEditor };

  borderEditorButtonRef = useRef("borderEditorButton");
  state: State = useState({
    currentColor: DEFAULT_BORDER_DESC.color,
    currentStyle: DEFAULT_BORDER_DESC.style,
    currentPosition: undefined,
  });

  get borderEditorAnchorRect(): Rect {
    const button = this.borderEditorButtonRef.el!;
    const buttonRect = button.getBoundingClientRect();
    return {
      x: buttonRect.x,
      y: buttonRect.y,
      width: buttonRect.width,
      height: buttonRect.height,
    };
  }

  onBorderPositionPicked(position: BorderPosition) {
    this.state.currentPosition = position;
    this.updateBorder();
  }

  onBorderColorPicked(color: Color) {
    this.state.currentColor = color;
    this.updateBorder();
  }

  onBorderStylePicked(style: BorderStyle) {
    this.state.currentStyle = style;
    this.updateBorder();
  }

  private updateBorder() {
    if (this.state.currentPosition === undefined) {
      return;
    }
    this.env.model.dispatch("SET_ZONE_BORDERS", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
      border: {
        position: this.state.currentPosition,
        color: this.state.currentColor,
        style: this.state.currentStyle,
      },
    });
  }
}
