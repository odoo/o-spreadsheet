import { props } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../helpers/css";
import { types } from "../../props_validation";

import { Component } from "../../../owl3_compatibility_layer";

export class Border extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Border";

  protected props = props({
    zone: types.Zone(),
    orientation: types.or([
      types.literal("n"),
      types.literal("s"),
      types.literal("w"),
      types.literal("e"),
    ]),
    isMoving: types.boolean(),
    onMoveHighlight: types.function<[ev: PointerEvent]>([types.instanceOf(PointerEvent)]),
  });
  get style() {
    const isTop = ["n", "w", "e"].includes(this.props.orientation);
    const isLeft = ["n", "w", "s"].includes(this.props.orientation);
    const isHorizontal = ["n", "s"].includes(this.props.orientation);
    const isVertical = ["w", "e"].includes(this.props.orientation);

    const z = this.props.zone;
    const margin = 2;

    const rect = this.env.model.getters.getVisibleRect(z);

    const left = rect.x;
    const right = rect.x + rect.width - 2 * margin;
    const top = rect.y;
    const bottom = rect.y + rect.height - 2 * margin;

    const lineWidth = 4;
    const leftValue = isLeft ? left : right;
    const topValue = isTop ? top : bottom;
    const widthValue = isHorizontal ? right - left : lineWidth;
    const heightValue = isVertical ? bottom - top : lineWidth;

    return cssPropertiesToCss({
      left: `${leftValue}px`,
      top: `${topValue}px`,
      width: `${widthValue}px`,
      height: `${heightValue}px`,
    });
  }

  onMouseDown(ev: PointerEvent) {
    this.props.onMoveHighlight(ev);
  }
}
