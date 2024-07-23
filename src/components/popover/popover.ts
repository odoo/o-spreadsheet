import { Component } from "@odoo/owl";
import {
  BOTTOMBAR_HEIGHT,
  ComponentsImportance,
  SCROLLBAR_WIDTH,
  TOPBAR_HEIGHT,
} from "../../constants";
import { DOMCoordinates, DOMDimension, Pixel, SpreadsheetChildEnv } from "../../types";
import { useSpreadsheetRect } from "../helpers/position_hook";

interface Props {
  /**
   * Coordinates are expressed relative to the "body" element.
   */
  position: DOMCoordinates;
  marginTop: Pixel;
  childWidth: Pixel;
  childHeight: Pixel;
  /**
   * The component is moved by this amount to the left when
   * it is rendered on the left.
   */
  flipHorizontalOffset: Pixel;
  /**
   * The component is moved by this amount to the top when
   * it is rendered on the top.
   */
  flipVerticalOffset: Pixel;
  onMouseWheel: (ev: WheelEvent) => void;
  zIndex: Number;
}

export class Popover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Popover";
  static defaultProps = {
    flipHorizontalOffset: 0,
    flipVerticalOffset: 0,
    verticalOffset: 0,
    marginTop: 0,
    onMouseWheel: () => {},
    zIndex: ComponentsImportance.Popover,
  };

  private spreadsheetRect = useSpreadsheetRect();

  get maxHeight(): number {
    return Math.max(0, this.viewportDimension.height - BOTTOMBAR_HEIGHT - SCROLLBAR_WIDTH);
  }

  get style() {
    // the props's position is expressed relative to the "body" element
    // but we teleport the element in ".o-spreadsheet" to keep everything
    // within our control and to avoid leaking into external DOM
    const horizontalPosition = `left:${this.horizontalPosition() - this.spreadsheetRect.x}`;
    const verticalPosition = `top:${this.verticalPosition() - this.spreadsheetRect.y}`;
    const maxHeight = this.maxHeight;
    const height = `max-height:${maxHeight}`;
    const shadow = maxHeight !== 0 ? "box-shadow: 1px 2px 5px 2px rgb(51 51 51 / 15%);" : "";
    return `
      position: absolute;
      z-index: ${this.props.zIndex};
      ${verticalPosition}px;
      ${horizontalPosition}px;
      ${height}px;
      width:${this.props.childWidth}px;
      overflow-y: auto;
      overflow-x: hidden;
      ${shadow}
    `;
  }

  private get viewportDimension(): DOMDimension {
    return this.env.model.getters.getSheetViewDimensionWithHeaders();
  }

  private get shouldRenderRight(): boolean {
    const { x } = this.props.position;
    return x + this.props.childWidth < this.viewportDimension.width;
  }

  private get shouldRenderBottom(): boolean {
    const { y } = this.props.position;
    return (
      y + Math.min(this.props.childHeight, this.maxHeight) <
      this.viewportDimension.height + (this.env.isDashboard() ? 0 : TOPBAR_HEIGHT)
    );
  }

  private horizontalPosition(): Pixel {
    const { x } = this.props.position;
    if (this.shouldRenderRight) {
      return x;
    }
    return x - this.props.childWidth - this.props.flipHorizontalOffset;
  }

  private verticalPosition(): Pixel {
    const { y } = this.props.position;
    if (this.shouldRenderBottom) {
      return y;
    }
    return Math.max(
      y - this.props.childHeight + this.props.flipVerticalOffset,
      this.props.marginTop
    );
  }
}
