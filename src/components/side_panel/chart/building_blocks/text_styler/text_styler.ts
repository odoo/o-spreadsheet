import { Component, onWillUpdateProps, useExternalListener, useState } from "@odoo/owl";
import { ActionSpec } from "../../../../../actions/action";
import { GRAY_300 } from "../../../../../constants";
import { _t } from "../../../../../translation";
import { Align, Color, SpreadsheetChildEnv, TitleDesign } from "../../../../../types";
import { ActionButton } from "../../../../action_button/action_button";
import { ColorPickerWidget } from "../../../../color_picker/color_picker_widget";
import { css } from "../../../../helpers";
import { Section } from "../../../components/section/section";

css/* scss */ `
  .o-chart-title-designer {
    > span,
    .o-dropdown > span {
      height: 30px;
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
  text?: string;
  updateText: (title: string) => void;
  label?: string;
  style: TitleDesign;
  updateStyle: (style: TitleDesign) => void;
  defaultStyle?: Partial<TitleDesign>;
}

export interface TextStylerState {
  activeTool: string;
}

export class TextStyler extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.TextStyler";
  static components = { Section, ColorPickerWidget, ActionButton };
  static props = {
    text: { type: String, optional: true },
    updateText: Function,
    label: { type: String, optional: true },
    style: Object,
    updateStyle: { type: Function, optional: true },
    defaultStyle: { type: Object, optional: true },
  };
  openedEl: HTMLElement | null = null;

  setup() {
    useExternalListener(window, "click", this.onExternalClick);
    onWillUpdateProps((nextProps) => {
      console.log("nextProps", nextProps);
    });
  }

  state = useState({
    activeTool: "",
  });

  updateText(ev: InputEvent) {
    this.props.updateText((ev.target as HTMLInputElement).value);
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

  updateAlignment(align: Align) {
    this.props.updateStyle?.({ ...this.props.style, align });
    this.closeMenus();
  }

  toggleBold() {
    console.log("toggleBold", this.props);
    this.props.updateStyle?.({ ...this.props.style, bold: !this.bold });
  }

  toggleItalic() {
    console.log("#### toggleItalic", this.props);
    this.props.updateStyle?.({ ...this.props.style, italic: !this.italic });
  }

  closeMenus() {
    this.state.activeTool = "";
    this.openedEl = null;
  }

  get align() {
    return this.props.style.align || this.props.defaultStyle?.align;
  }

  get bold() {
    return this.props.style.bold || this.props.defaultStyle?.bold;
  }

  get italic() {
    return this.props.style.italic || this.props.defaultStyle?.italic;
  }

  getBoldButtonAction(): ActionSpec {
    return {
      name: _t("Bold"),
      execute: () => this.toggleBold(),
      isActive: () => this.bold || false,
      icon: "o-spreadsheet-Icon.BOLD",
    };
  }

  getItalicButtonAction(): ActionSpec {
    console.log("getItalicButtonAction", this.props);
    return {
      name: _t("Italic"),
      execute: () => this.toggleItalic(),
      isActive: () => this.italic || false,
      icon: "o-spreadsheet-Icon.ITALIC",
      // @ts-ignore
      ntm: Math.random(),
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
}
