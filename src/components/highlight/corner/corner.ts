import { Component } from "@odoo/owl";
import { AUTOFILL_EDGE_LENGTH } from "../../../constants";
import type { Color, SpreadsheetChildEnv, Zone } from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers/css";

css/* scss */ `
  .o-corner {
    position: absolute;
    height: 6px;
    width: 6px;
    border: 1px solid white;
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

type Orientation = "nw" | "ne" | "sw" | "se";

interface Props {
  zone: Zone;
  color: Color;
  orientation: Orientation;
  isResizing: boolean;
  onResizeHighlight: (isLeft: boolean, isRight: boolean) => void;
}

export class Corner extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Corner";
  private isTop = this.props.orientation[0] === "n";
  private isLeft = this.props.orientation[1] === "w";

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
      left: `${leftValue - AUTOFILL_EDGE_LENGTH / 2}px`,
      top: `${topValue - AUTOFILL_EDGE_LENGTH / 2}px`,
      "background-color": this.props.color,
    });
  }

  onMouseDown(ev: MouseEvent) {
    this.props.onResizeHighlight(this.isLeft, this.isTop);
  }
}

Corner.props = {
  zone: Object,
  color: String,
  orientation: String,
  isResizing: Boolean,
  onResizeHighlight: Function,
};
