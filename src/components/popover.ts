import * as owl from "@odoo/owl";
import { BOTTOMBAR_HEIGHT, SCROLLBAR_WIDTH, TOPBAR_HEIGHT } from "../constants";
import { BoxDims, GridDimension, SpreadsheetEnv } from "../types";
const { Component, tags } = owl;
const { Portal } = owl.misc;
const { xml } = tags;

const TEMPLATE = xml/* xml */ `
  <Portal target="'.o-spreadsheet'">
    <div class="o-spreadsheet-popover" t-att-style="style">
      <t t-slot="default"/>
    </div>
  </Portal>
`;

interface Position {
  border: "top" | "bottom" | "left" | "right";
  coord: number;
}

interface Props {
  /**
   * Rectangle beside which the popover is displayed.
   * Coordinates are expressed relative to the ".o-spreadsheet" element.
   */
  anchorRect: BoxDims;

  /** The popover can be positioned below the anchor Rectangle, or to the right of the rectangle */
  positioning: "bottom" | "right";

  /** Minimum margin between the top of the screen and the popover */
  marginTop: number;

  childMaxWidth: number;
  childMaxHeight: number;

  /** If false, the popover have a fixed width = childMaxWidth. Else it has a dynamic width that can go up to childMaxWidth */
  dynamicWidth: boolean;
  /** If false, the popover have a fixed height = childMaxHeight. Else it has a dynamic height that can go up to childMaxHeight */
  dynamicHeight: boolean;

  /** Offset to apply to the vertical position of the popover. Useful to not take padding into account when positioning
   * the Component for example.
   */
  verticalOffset: number;
}

export class Popover extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { Portal };
  static defaultProps = {
    positioning: "bottom",
    dynamicHeight: false,
    dynamicWidth: false,
    verticalOffset: 0,
    marginTop: 0,
  };
  private getters = this.env.getters;

  get style() {
    const horizontalPosition = this.horizontalPosition();
    const verticalPosition = this.verticalPosition();

    const height = `${this.props.dynamicHeight ? "max-height" : "height"}:${Math.min(
      this.viewportDimension.height - BOTTOMBAR_HEIGHT - SCROLLBAR_WIDTH,
      this.props.childMaxHeight
    )}px`;
    const width = `${this.props.dynamicWidth ? "max-width" : "width"}:${
      this.props.childMaxWidth
    }px`;

    return `
      position: absolute;
      z-index: 5;
      ${verticalPosition.border}:${verticalPosition.coord}px;
      ${horizontalPosition.border}:${horizontalPosition.coord}px;
      ${height};
      ${width};
      overflow-y: auto;
      overflow-x: hidden;
      box-shadow: 1px 2px 5px 2px rgb(51 51 51 / 15%);
    `;
  }

  private get viewportDimension(): GridDimension {
    return this.getters.getViewportDimension();
  }

  private get shouldRenderRight(): boolean {
    const { x } = this.props.anchorRect;
    return this.props.positioning === "bottom"
      ? x + this.props.childMaxWidth < this.viewportDimension.width
      : x + this.props.childMaxWidth + this.props.anchorRect.width < this.viewportDimension.width;
  }

  private get shouldRenderBottom(): boolean {
    const { y } = this.props.anchorRect;
    const maxY = this.viewportDimension.height + TOPBAR_HEIGHT;
    return this.props.positioning === "bottom"
      ? y + this.props.childMaxHeight + this.props.anchorRect.height < maxY
      : y + this.props.childMaxHeight < maxY;
  }

  private horizontalPosition(): Position {
    const { x, width } = this.props.anchorRect;

    if (this.props.positioning === "right") {
      if (this.shouldRenderRight) {
        return { coord: x + width, border: "left" }; // left border at right of anchorRect
      } else {
        // in CSS, right is the distance between right of the page and right of element, not coordinate of right
        return { coord: window.innerWidth - x, border: "right" }; // right border at left of anchorRect
      }
    } else {
      if (this.shouldRenderRight) {
        return { coord: x, border: "left" }; // left border at left anchorRect
      } else {
        return { coord: window.innerWidth - x - width, border: "right" }; // right border at right of anchorRect
      }
    }
  }

  private verticalPosition(): Position {
    let verticalPosition: Position;
    const { y, height } = this.props.anchorRect;

    if (this.props.positioning === "right") {
      if (this.shouldRenderBottom) {
        verticalPosition = { coord: y, border: "top" }; // top border at top of anchorRect
      } else {
        // in CSS, bottom is the distance between bottom of the page and bottom of element, not coordinate of bottom
        verticalPosition = { coord: window.innerHeight - y - height, border: "bottom" }; // bottom border at bottom of anchorRect
      }
    } else {
      if (this.shouldRenderBottom) {
        verticalPosition = { coord: y + height, border: "top" }; // top border at bottom of anchorRect
      } else {
        verticalPosition = { coord: window.innerHeight - y, border: "bottom" }; // bottom border at top of anchorRect
      }
    }

    verticalPosition.coord -= this.props.verticalOffset;

    if (this.props.marginTop && verticalPosition.border === "bottom") {
      const topCoordinate =
        window.innerHeight - (verticalPosition.coord + this.props.childMaxHeight);
      const overflowInTopMargin = this.props.marginTop - topCoordinate;
      if (overflowInTopMargin > 0) {
        verticalPosition.coord -= overflowInTopMargin;
      }
    }

    return verticalPosition;
  }
}
