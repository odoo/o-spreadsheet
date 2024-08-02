import { Component, useRef, useState } from "@odoo/owl";
import { BUTTON_ACTIVE_BG, BUTTON_HOVER_BG, GRAY_300 } from "../../constants";
import {
  BorderPosition,
  BorderStyle,
  Color,
  Pixel,
  Rect,
  SpreadsheetChildEnv,
  borderStyles,
} from "../../types/index";
import { ColorPickerWidget } from "../color_picker/color_picker_widget";
import { css } from "../helpers/css";
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
css/* scss */ `
  .o-border-selector {
    padding: 4px;
    background-color: white;

    .o-divider {
      border-right: 1px solid ${GRAY_300};
      margin: 0 6px;
    }

    .o-border-selector-section {
      .o-dropdown-line {
        height: 30px;
        margin: 1px;
        .o-line-item {
          padding: 4px;
          width: 18px;
          height: 18px;
          &.active {
            background-color: ${BUTTON_ACTIVE_BG};
          }
        }
      }
      .o-border-style-tool {
        padding: 0px 3px;
        margin: 2px;
        height: 25px;
      }
    }
  }

  .o-border-style-dropdown {
    background: #ffffff;
    padding: 4px;
    .o-dropdown-line {
    }
    .o-style-preview {
      margin: 7px 5px 7px 5px;
      width: 60px;
      height: 5px;
    }
    .o-style-thin {
      border-bottom: 1px solid #000000;
    }
    .o-style-medium {
      border-bottom: 2px solid #000000;
    }
    .o-style-thick {
      border-bottom: 3px solid #000000;
    }
    .o-style-dashed {
      border-bottom: 1px dashed #000000;
    }
    .o-style-dotted {
      border-bottom: 1px dotted #000000;
    }
    .o-dropdown-border-type {
      cursor: pointer;
      &:not(.o-disabled):not(.active):hover {
        background-color: ${BUTTON_HOVER_BG};
      }
    }
    .o-dropdown-border-check {
      width: 20px;
      font-size: 12px;
    }
    .o-border-picker-button {
      padding: 0px !important;
      margin: 5px 0px 0px 0px !important;
      height: 25px !important;
    }
  }
`;

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
      positioning: "BottomLeft",
      verticalOffset: 0,
    };
  }

  get popoverProps(): PopoverProps {
    return {
      anchorRect: this.props.anchorRect,
      maxHeight: this.props.maxHeight,
      positioning: "BottomLeft",
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
