import { Component } from "@odoo/owl";
import { Color, ResizeDirection, SpreadsheetChildEnv, Zone } from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers/css";

const LARGEUR = 40;

css/* scss */ `
  .o-corner {
    position: absolute;
    height: ${LARGEUR}px;
    width: ${LARGEUR}px;
    background: red;
  }

  .o-corner-button {
    border: 1px solid white;
    border-radius: 4px;
    height: 5px;
    width: 5px;
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

// &.o-top {
//   cursor: n-resize;
// }
// &.o-topRight {
//   cursor: ne-resize;
// }
// &.o-right {
//   cursor: e-resize;
// }
// &.o-bottomRight {
//   cursor: se-resize;
// }
// &.o-bottom {
//   cursor: s-resize;
// }
// &.o-bottomLeft {
//   cursor: sw-resize;
// }
// &.o-left {
//   cursor: w-resize;
// }
// &.o-topLeft {
//   cursor: nw-resize;
// }

type Orientation = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

interface Props {
  zone: Zone;
  color: Color;
  orientation: Orientation;
  isResizing: boolean;
  // TODORAR rename this on reSizeZone?
  onResizeHighlight: (dirX: ResizeDirection, dirY: ResizeDirection) => void;
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
  // private isTop = this.props.orientation.includes("n");
  // private isLeft = this.props.orientation.includes("w");

  private dirX!: ResizeDirection;
  private dirY!: ResizeDirection;

  setup(): void {
    const { dirX, dirY } = orientationToDir(this.props.orientation);
    this.dirX = dirX;
    this.dirY = dirY;
  }

  get handlerStyle() {
    const z = this.props.zone;
    // const col = this.isLeft ? z.left : z.right;
    // const row = this.isTop ? z.top : z.bottom;

    // change that rect to an actual rect
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

    return cssPropertiesToCss({
      left: `${leftValue - LARGEUR / 2}px`,
      top: `${topValue - LARGEUR / 2}px`,
    });
  }

  get buttonLook() {
    return cssPropertiesToCss({
      "background-color": this.props.color,
      cursor: `${this.props.orientation}-resize`,
    });
  }

  onMouseDown() {
    this.props.onResizeHighlight(this.dirX, this.dirY);
  }
}

function orientationToDir(or: string): { dirX: ResizeDirection; dirY: ResizeDirection } {
  const dirX = or.includes("w") ? -1 : or.includes("e") ? 1 : 0;
  const dirY = or.includes("n") ? -1 : or.includes("s") ? 1 : 0;

  return { dirX, dirY };
}
