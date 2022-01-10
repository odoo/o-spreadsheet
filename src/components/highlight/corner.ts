import { Component, xml } from "@odoo/owl";
import { AUTOFILL_EDGE_LENGTH, HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { SpreadsheetChildEnv, Zone } from "../../types";
import { css } from "../helpers/css";

const TEMPLATE = xml/* xml */ `
    <div class="o-corner"
        t-on-mousedown="onMouseDown"
        t-att-style="style"
        t-att-class="{
          'o-resizing': props.isResizing,
          'o-corner-nw': props.orientation === 'nw',
          'o-corner-ne': props.orientation === 'ne',
          'o-corner-sw': props.orientation === 'sw',
          'o-corner-se': props.orientation === 'se',
        }"
        >
    </div>
`;
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
  color: string;
  orientation: Orientation;
  isResizing: boolean;
  onResizeHighlight: (isLeft: boolean, isRight: boolean) => void;
}

export class Corner extends Component<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;

  private isTop = this.props.orientation[0] === "n";
  private isLeft = this.props.orientation[1] === "w";

  get style() {
    const { offsetX, offsetY } = this.env.model.getters.getActiveViewport();
    const s = this.env.model.getters.getActiveSheet();
    const z = this.props.zone;
    const leftValue = this.isLeft ? s.cols[z.left].start : s.cols[z.right].end;
    const topValue = this.isTop ? s.rows[z.top].start : s.rows[z.bottom].end;
    return `
      left:${leftValue + HEADER_WIDTH - offsetX - AUTOFILL_EDGE_LENGTH / 2}px;
      top:${topValue + HEADER_HEIGHT - offsetY - AUTOFILL_EDGE_LENGTH / 2}px;
      background-color:${this.props.color};
    `;
  }

  onMouseDown(ev: MouseEvent) {
    this.props.onResizeHighlight(this.isLeft, this.isTop);
  }
}
