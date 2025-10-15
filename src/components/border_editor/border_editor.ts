import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef, useState } from "@odoo/owl";
import { BorderPosition, BorderStyle, Color, Pixel, Rect, borderStyles } from "../../types/index";
import { ColorPickerWidget } from "../color_picker/color_picker_widget";
import { Popover, PopoverProps } from "../popover/popover";

type Tool = "borderColorTool" | "borderTypeTool";

interface State {
  activeTool: Tool | undefined;
}

/**
 * List the available borders positions and the corresponding icons.
 * The structure of this array is defined to match the order/lines we want
 * to display in the topbar's border tool.
 */
const BORDER_POSITIONS: [BorderPosition, string][][] = [
  [
    ["all", "o-spreadsheet-Icon.BORDERS"],
    ["hv", "o-spreadsheet-Icon.BORDER_HV"],
    ["h", "o-spreadsheet-Icon.BORDER_H"],
    ["v", "o-spreadsheet-Icon.BORDER_V"],
    ["external", "o-spreadsheet-Icon.BORDER_EXTERNAL"],
  ],
  [
    ["left", "o-spreadsheet-Icon.BORDER_LEFT"],
    ["top", "o-spreadsheet-Icon.BORDER_TOP"],
    ["right", "o-spreadsheet-Icon.BORDER_RIGHT"],
    ["bottom", "o-spreadsheet-Icon.BORDER_BOTTOM"],
    ["clear", "o-spreadsheet-Icon.BORDER_CLEAR"],
  ],
];

export interface BorderEditorProps {
  class?: string;
  currentBorderColor: Color;
  currentBorderStyle: BorderStyle;
  currentBorderPosition: BorderPosition | undefined;
  onBorderColorPicked: (color: Color) => void;
  onBorderStylePicked: (style: BorderStyle) => void;
  onBorderPositionPicked: (position: BorderPosition) => void;
  maxHeight?: Pixel;
  anchorRect: Rect;
}

// -----------------------------------------------------------------------------
// Border Editor
// -----------------------------------------------------------------------------

export class BorderEditor extends Component<BorderEditorProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BorderEditor";
  static props = {
    class: { type: String, optional: true },
    currentBorderColor: { type: String, optional: false },
    currentBorderStyle: { type: String, optional: false },
    currentBorderPosition: { type: String, optional: true },
    onBorderColorPicked: Function,
    onBorderStylePicked: Function,
    onBorderPositionPicked: Function,
    maxHeight: { type: Number, optional: true },
    anchorRect: Object,
  };
  static components = { ColorPickerWidget, Popover };
  BORDER_POSITIONS = BORDER_POSITIONS;

  lineStyleButtonRef = useRef("lineStyleButton");
  borderStyles = borderStyles;
  state: State = useState({
    activeTool: undefined,
  });

  toggleDropdownTool(tool: Tool) {
    const isOpen = this.state.activeTool === tool;
    this.state.activeTool = isOpen ? undefined : tool;
  }

  closeDropdown() {
    this.state.activeTool = undefined;
  }

  setBorderPosition(position: BorderPosition) {
    this.props.onBorderPositionPicked(position);
    this.closeDropdown();
  }

  setBorderColor(color: Color) {
    this.props.onBorderColorPicked(color);
    this.closeDropdown();
  }

  setBorderStyle(style: BorderStyle) {
    this.props.onBorderStylePicked(style);
    this.closeDropdown();
  }

  get lineStylePickerPopoverProps(): PopoverProps {
    return {
      anchorRect: this.lineStylePickerAnchorRect,
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  get popoverProps(): PopoverProps {
    return {
      anchorRect: this.props.anchorRect,
      maxHeight: this.props.maxHeight,
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  get lineStylePickerAnchorRect(): Rect {
    const button = this.lineStyleButtonRef.el;
    if (button === null) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const buttonRect = button.getBoundingClientRect();
    return {
      x: buttonRect.x,
      y: buttonRect.y,
      width: buttonRect.width,
      height: buttonRect.height,
    };
  }
}
