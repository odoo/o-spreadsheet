import { AUTOFILL_EDGE_LENGTH } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";
import { Component } from "@odoo/owl";
import { Color, ResizeDirection, Zone } from "../../../types";
import { cssPropertiesToCss } from "../../helpers/css";

const MOBILE_HANDLER_WIDTH = 40;

type Orientation = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

interface Props {
  zone: Zone;
  color: Color;
  orientation: Orientation;
  isResizing: boolean;
  onResizeHighlight: (ev: PointerEvent, dirX: ResizeDirection, dirY: ResizeDirection) => void;
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
  private dirX!: ResizeDirection;
  private dirY!: ResizeDirection;

  setup(): void {
    const { dirX, dirY } = orientationToDir(this.props.orientation);
    this.dirX = dirX;
    this.dirY = dirY;
  }

  get handlerStyle() {
    const z = this.props.zone;

    const rect = this.env.model.getters.getVisibleRect({
      left: this.dirX === 1 ? z.right : z.left,
      right: this.dirX === -1 ? z.left : z.right,
      top: this.dirY === 1 ? z.bottom : z.top,
      bottom: this.dirY === -1 ? z.top : z.bottom,
    });

    // Don't show if not visible in the viewport
    if (rect.width * rect.height === 0) {
      return `display: none !important;`;
    }

    const leftValue = rect.x + rect.width / 2 + (this.dirX * rect.width) / 2;
    const topValue = rect.y + rect.height / 2 + (this.dirY * rect.height) / 2;

    const edgeLength = this.getHandlerEdgeLength();
    const css = {
      left: `${leftValue - edgeLength / 2}px`,
      top: `${topValue - edgeLength / 2}px`,
      height: `${edgeLength}px`,
      width: `${edgeLength}px`,
    };
    if (this.env.isMobile()) {
      css["border-radius"] = `${edgeLength / 2}px`;
    }

    return cssPropertiesToCss(css);
  }

  getHandlerEdgeLength() {
    return this.env.isMobile() ? MOBILE_HANDLER_WIDTH : AUTOFILL_EDGE_LENGTH;
  }

  get buttonLook() {
    const css = {
      "background-color": this.props.color,
      cursor: `${this.props.orientation}-resize`,
    };
    if (this.env.isMobile()) {
      css["border-radius"] = `${AUTOFILL_EDGE_LENGTH / 2}px`;
    }
    return cssPropertiesToCss(css);
  }

  onMouseDown(ev: PointerEvent) {
    this.props.onResizeHighlight(ev, this.dirX, this.dirY);
  }
}

function orientationToDir(or: Orientation): { dirX: ResizeDirection; dirY: ResizeDirection } {
  const dirX = or.includes("w") ? -1 : or.includes("e") ? 1 : 0;
  const dirY = or.includes("n") ? -1 : or.includes("s") ? 1 : 0;

  return { dirX, dirY };
}
