import { props, proxy, signal } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { BorderPosition, BorderStyle, Color, borderStyles } from "../../types/misc";
import { PropsOf } from "../../types/props_of";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { ColorPickerWidget } from "../color_picker/color_picker_widget";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

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

export class BorderEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BorderEditor";
  static components = { ColorPickerWidget, Popover };

  protected props = props({
    "class?": types.string(),
    currentBorderColor: types.Color(),
    currentBorderStyle: types.BorderStyle(),
    "currentBorderPosition?": types.BorderPosition(),
    onBorderColorPicked: types.function<[color: Color]>([types.Color()]),
    onBorderStylePicked: types.function<[style: BorderStyle]>([types.BorderStyle()]),
    onBorderPositionPicked: types.function<[position: BorderPosition]>([types.BorderPosition()]),
    "maxHeight?": types.Pixel(),
    anchorRect: types.Rect(),
  });
  BORDER_POSITIONS = BORDER_POSITIONS;

  lineStyleButtonRef = signal<HTMLElement | null>(null);
  borderStyles = borderStyles;
  state: State = proxy({
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

  get lineStylePickerPopoverProps(): PropsOf<Popover> {
    return {
      anchorRect: this.lineStylePickerAnchorRect,
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  get popoverProps(): PropsOf<Popover> {
    return {
      anchorRect: this.props.anchorRect,
      maxHeight: this.props.maxHeight,
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  get lineStylePickerAnchorRect(): Rect {
    const button = this.lineStyleButtonRef();
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
