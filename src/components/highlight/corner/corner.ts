import { Component } from "@odoo/owl";
import { Color, SpreadsheetChildEnv, Zone } from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers/css";

css/* scss */ `
  .o-corner {
    position: absolute;
    height: 20px;
    width: 20px;
    border: 1px solid white;
    border-radius: 4px;
  }
  .o-corner-nw,
  .o-corner-se {
    &:hover {
      cursor: nwse-resize;
    }
  }
  .o-corner-ne,
  .o-corner-sw {
    &:hover {
      cursor: nesw-resize;
    }
  }
  .o-resizing {
    cursor: grabbing;
  }
`;

type Orientation = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

interface Props {
  zone: Zone;
  color: Color;
  orientation: Orientation;
  isResizing: boolean;
  // TODORAR rename this on reSizeZone?
  onResizeHighlight: (isLeft: boolean, isRight: boolean, ev: TouchEvent) => void;
}

export class Corner extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-mobile-Corner";
  static props = {
    zone: Object,
    color: String,
    orientation: {
      type: String,
      validate: (value: string) => ["nw", "ne", "sw", "se", "n", "s", "e", "w"].includes(value),
    },
    isResizing: Boolean,
    onResizeHighlight: Function,
  };
  private isTop = this.props.orientation.includes("n");
  private isLeft = this.props.orientation.includes("w");

  get style() {
    const z = this.props.zone;
    const col = this.isLeft ? z.left : z.right;
    const row = this.isTop ? z.top : z.bottom;

    const rect = this.env.model.getters.getVisibleRect({
      left: col,
      right: col,
      top: row,
      bottom: row,
    });

    // Don't show if not visible in the viewport
    if (rect.width * rect.height === 0) {
      return `display:none`;
    }

    const leftValue = this.isLeft ? rect.x : rect.x + rect.width;
    const topValue = this.isTop ? rect.y : rect.y + rect.height;

    return cssPropertiesToCss({
      left: `${leftValue - 20 / 2}px`,
      top: `${topValue - 20 / 2}px`,
      "background-color": this.props.color,
    });
  }

  onMouseDown(ev: TouchEvent) {
    this.props.onResizeHighlight(this.isLeft, this.isTop, ev);
  }
}
