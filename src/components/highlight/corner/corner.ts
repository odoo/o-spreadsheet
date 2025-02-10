import { Component } from "@odoo/owl";
import { AUTOFILL_EDGE_LENGTH } from "../../../constants";
import { Color, SpreadsheetChildEnv, Zone } from "../../../types";
import { cssPropertiesToCss } from "../../helpers/css";

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
  static props = {
    zone: Object,
    color: String,
    orientation: String,
    isResizing: Boolean,
    onResizeHighlight: Function,
  };
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
