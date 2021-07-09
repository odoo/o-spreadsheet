import * as owl from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { SpreadsheetEnv, Zone } from "../../types";

const { Component } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
    <div class="o-border"
        t-on-mousedown="onMouseDown"
        t-att-style="style"
        t-att-class="{
          'o-moving': props.isMoving,
          'o-border-n': props.orientation === 'n',
          'o-border-s': props.orientation === 's',
          'o-border-w': props.orientation === 'w',
          'o-border-e': props.orientation === 'e',
        }"
        >
    </div>
`;
const CSS = css/* scss */ `
  .o-border {
    position: absolute;
    &:hover {
      cursor: grab;
    }
  }
  }
  .o-moving {
    cursor: grabbing;
  }
`;

type Orientation = "n" | "s" | "w" | "e";

interface Props {
  zone: Zone;
  orientation: Orientation;
  isMoving: boolean;
}

export class Border extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;

  get style() {
    const isTop = ["n", "w", "e"].includes(this.props.orientation);
    const isLeft = ["n", "w", "s"].includes(this.props.orientation);
    const isHorizontal = ["n", "s"].includes(this.props.orientation);
    const isVertical = ["w", "e"].includes(this.props.orientation);

    const s = this.env.getters.getActiveSheet();
    const z = this.props.zone;
    const margin = 2;

    const left = s.cols[z.left].start + margin;
    const right = s.cols[z.right].end - 2 * margin;
    const top = s.rows[z.top].start + margin;
    const bottom = s.rows[z.bottom].end - 2 * margin;

    const lineWidth = 4;
    const leftValue = isLeft ? left : right;
    const topValue = isTop ? top : bottom;
    const widthValue = isHorizontal ? right - left : lineWidth;
    const heightValue = isVertical ? bottom - top : lineWidth;

    const { offsetX, offsetY } = this.env.getters.getActiveSnappedViewport();
    return `
        left:${leftValue + HEADER_WIDTH - offsetX}px;
        top:${topValue + HEADER_HEIGHT - offsetY}px;
        width:${widthValue}px;
        height:${heightValue}px;
    `;
  }

  onMouseDown(ev: MouseEvent) {
    this.trigger("move-highlight", { clientX: ev.clientX, clientY: ev.clientY });
  }
}
