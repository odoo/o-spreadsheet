import { Component } from "@odoo/owl";
import { Pixel, SpreadsheetChildEnv, Zone } from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers/css";

css/* scss */ `
  .o-border {
    position: absolute;
    &:hover {
      cursor: grab;
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
  onMoveHighlight: (x: Pixel, y: Pixel) => void;
}

export class Border extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Border";
  static props = {
    zone: Object,
    orientation: String,
    isMoving: Boolean,
    onMoveHighlight: Function,
  };
  get style() {
    const isTop = ["n", "w", "e"].includes(this.props.orientation);
    const isLeft = ["n", "w", "s"].includes(this.props.orientation);
    const isHorizontal = ["n", "s"].includes(this.props.orientation);
    const isVertical = ["w", "e"].includes(this.props.orientation);

    const z = this.props.zone;

    const rect = this.env.model.getters.getVisibleRect(z);

    const left = rect.x;
    const right = rect.x + rect.width;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    const lineWidth = 8;
    const centeringOffset = lineWidth / 2;
    const leftValue = (isLeft ? left : right) - (isVertical ? centeringOffset : 0);
    const topValue = (isTop ? top : bottom) - (isHorizontal ? centeringOffset : 0);
    const widthValue = isHorizontal ? right - left : lineWidth;
    const heightValue = isVertical ? bottom - top : lineWidth;

    return cssPropertiesToCss({
      left: `${leftValue}px`,
      top: `${topValue}px`,
      width: `${widthValue}px`,
      height: `${heightValue}px`,
    });
  }

  onMouseDown(ev: MouseEvent) {
    this.props.onMoveHighlight(ev.clientX, ev.clientY);
  }
}
