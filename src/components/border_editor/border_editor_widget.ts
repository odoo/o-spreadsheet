import { DEFAULT_BORDER_DESC } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";
import { Component, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { BorderPosition, BorderStyle, Color, Pixel, Rect } from "../../types";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../helpers/top_bar_tool_hook";
import { BorderEditor } from "./border_editor";

interface Props {
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
    disabled: { type: Boolean, optional: true },
    dropdownMaxHeight: { type: Number, optional: true },
    class: { type: String, optional: true },
  };
  static components = { BorderEditor };
  topBarToolStore!: ToolBarDropdownStore;

  borderEditorButtonRef = useRef("borderEditorButton");
  state: State = useState({
    currentColor: DEFAULT_BORDER_DESC.color,
    currentStyle: DEFAULT_BORDER_DESC.style,
    currentPosition: undefined,
  });

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
    onWillUpdateProps(() => {
      if (!this.isActive) {
        this.state.currentPosition = undefined;
      }
    });
  }

  get dropdownMaxHeight(): Pixel {
    return this.env.model.getters.getSheetViewDimension().height;
  }

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

  get isActive(): boolean {
    return this.topBarToolStore.isActive;
  }

  toggleBorderEditor() {
    if (this.isActive) {
      this.topBarToolStore.closeDropdowns();
    } else {
      this.topBarToolStore.openDropdown();
    }
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
