import { Component, useExternalListener, useState } from "@odoo/owl";
import { ActionSpec } from "../../../../../actions/action";
import { DEFAULT_STYLE, GRAY_300 } from "../../../../../constants";
import { _t } from "../../../../../translation";
import { Align, ChartStyle, Color, SpreadsheetChildEnv, VerticalAlign } from "../../../../../types";
import { ActionButton } from "../../../../action_button/action_button";
import { ColorPickerWidget } from "../../../../color_picker/color_picker_widget";
import { FontSizeEditor } from "../../../../font_size_editor/font_size_editor";
import { css } from "../../../../helpers";

css/* scss */ `
  .o-chart-title-designer {
    .o-hoverable-button {
      height: 30px;
    }
    .o-dropdown-content .o-hoverable-button {
      height: fit-content;
    }

    .o-divider {
      border-right: 1px solid ${GRAY_300};
      margin: 0px 4px;
      height: 14px;
    }

    .o-menu-item-button.active {
      background-color: #e6f4ea;
      color: #188038;
    }

    .o-dropdown-content {
      overflow-y: auto;
      overflow-x: hidden;
      padding: 2px;
      z-index: 100;
      box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);

      .o-dropdown-line {
        > span {
          padding: 4px;
        }
      }
    }
  }
`;

interface Props {
  class?: string;
  style: ChartStyle;
  updateStyle: (style: ChartStyle) => void;
  defaultStyle?: Partial<ChartStyle>;
  hasVerticalAlign?: boolean;
  hasHorizontalAlign?: boolean;
  hasBackgroundColor?: boolean;
}

export interface TextStylerState {
  activeTool: string;
}

export class TextStyler extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.TextStyler";
  static components = { ColorPickerWidget, ActionButton, FontSizeEditor };
  static props = {
    style: Object,
    updateStyle: { type: Function, optional: true },
    defaultStyle: { type: Object, optional: true },
    hasVerticalAlign: { type: Boolean, optional: true },
    hasHorizontalAlign: { type: Boolean, optional: true },
    hasBackgroundColor: { type: Boolean, optional: true },
    class: { type: String, optional: true },
  };
  openedEl: HTMLElement | null = null;

  setup() {
    useExternalListener(window, "click", this.onExternalClick);
  }

  state = useState({
    activeTool: "",
  });

  updateFontSize(fontSize: number) {
    this.props.updateStyle?.({ ...this.props.style, fontSize });
  }

  toggleDropdownTool(tool: string, ev: MouseEvent) {
    const isOpen = this.state.activeTool === tool;
    this.closeMenus();
    this.state.activeTool = isOpen ? "" : tool;
    this.openedEl = isOpen ? null : (ev.target as HTMLElement);
  }

  /**
   * TODO: This is clearly not a goot way to handle external click, but
   * we currently have no other way to do it ... Should be done in
   * another task to handle the fact we want only one menu opened at a
   * time with something like a menuStore ?
   */
  onExternalClick(ev: MouseEvent) {
    if (this.openedEl === ev.target) {
      return;
    }
    this.closeMenus();
  }

  onTextColorChange(color: Color) {
    this.props.updateStyle?.({ ...this.props.style, color });
    this.closeMenus();
  }

  onFillColorChange(color: Color) {
    this.props.updateStyle?.({ ...this.props.style, fillColor: color });
    this.closeMenus();
  }

  updateAlignment(align: Align) {
    this.props.updateStyle?.({ ...this.props.style, align });
    this.closeMenus();
  }

  updateVerticalAlignment(verticalAlign: VerticalAlign) {
    this.props.updateStyle?.({ ...this.props.style, verticalAlign });
    this.closeMenus();
  }

  toggleBold() {
    this.props.updateStyle?.({ ...this.props.style, bold: !this.bold });
  }

  toggleItalic() {
    this.props.updateStyle?.({ ...this.props.style, italic: !this.italic });
  }

  closeMenus() {
    this.state.activeTool = "";
    this.openedEl = null;
  }

  get align() {
    return this.props.style.align ?? this.props.defaultStyle?.align;
  }

  get verticalAlign() {
    return this.props.style.verticalAlign || this.props.defaultStyle?.verticalAlign;
  }

  get bold() {
    return this.props.style.bold ?? this.props.defaultStyle?.bold;
  }

  get italic() {
    return this.props.style.italic ?? this.props.defaultStyle?.italic;
  }

  get currentFontSize() {
    return this.props.style.fontSize ?? this.props.defaultStyle?.fontSize ?? DEFAULT_STYLE.fontSize;
  }

  get boldButtonAction(): ActionSpec {
    return {
      name: _t("Bold"),
      execute: () => this.toggleBold(),
      isActive: () => this.bold || false,
      icon: "o-spreadsheet-Icon.BOLD",
    };
  }

  get italicButtonAction(): ActionSpec {
    return {
      name: _t("Italic"),
      execute: () => this.toggleItalic(),
      isActive: () => this.italic || false,
      icon: "o-spreadsheet-Icon.ITALIC",
    };
  }

  get horizontalAlignButtonAction(): ActionSpec {
    let icon = "o-spreadsheet-Icon.ALIGN_LEFT";
    if (this.align === "center") {
      icon = "o-spreadsheet-Icon.ALIGN_CENTER";
    } else if (this.align === "right") {
      icon = "o-spreadsheet-Icon.ALIGN_RIGHT";
    }
    return { name: _t("Horizontal alignment"), icon };
  }

  get horizontalAlignActions(): ActionSpec[] {
    return [
      {
        name: _t("Left"),
        execute: () => this.updateAlignment("left"),
        isActive: () => this.align === "left",
        icon: "o-spreadsheet-Icon.ALIGN_LEFT",
      },
      {
        name: _t("Center"),
        execute: () => this.updateAlignment("center"),
        isActive: () => this.align === "center",
        icon: "o-spreadsheet-Icon.ALIGN_CENTER",
      },
      {
        name: _t("Right"),
        execute: () => this.updateAlignment("right"),
        isActive: () => this.align === "right",
        icon: "o-spreadsheet-Icon.ALIGN_RIGHT",
      },
    ];
  }

  get verticalAlignButtonAction(): ActionSpec {
    let icon = "o-spreadsheet-Icon.ALIGN_MIDDLE";
    if (this.verticalAlign === "top") {
      icon = "o-spreadsheet-Icon.ALIGN_TOP";
    } else if (this.verticalAlign === "bottom") {
      icon = "o-spreadsheet-Icon.ALIGN_BOTTOM";
    }
    return { name: _t("Vertical alignment"), icon };
  }

  get verticalAlignActions(): ActionSpec[] {
    return [
      {
        name: _t("Top"),
        execute: () => this.updateVerticalAlignment("top"),
        isActive: () => this.verticalAlign === "top",
        icon: "o-spreadsheet-Icon.ALIGN_TOP",
      },
      {
        name: _t("Middle"),
        execute: () => this.updateVerticalAlignment("middle"),
        isActive: () => this.verticalAlign === "middle",
        icon: "o-spreadsheet-Icon.ALIGN_MIDDLE",
      },
      {
        name: _t("Bottom"),
        execute: () => this.updateVerticalAlignment("bottom"),
        isActive: () => this.verticalAlign === "bottom",
        icon: "o-spreadsheet-Icon.ALIGN_BOTTOM",
      },
    ];
  }
}
