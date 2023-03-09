import { Component, misc, tags } from "@odoo/owl";
import { BOTTOMBAR_HEIGHT, SCROLLBAR_WIDTH, TOPBAR_HEIGHT } from "../constants";
import { DOMCoordinates, GridDimension, SpreadsheetEnv } from "../types";

const { Portal } = misc;
const { xml } = tags;

const TEMPLATE = xml/* xml */ `
  <Portal target="'.o-spreadsheet'">
    <div class="o-popover" t-att-style="style">
      <t t-slot="default"/>
    </div>
  </Portal>
`;

interface Props {
  /**
   * Coordinates are expressed relative to the ".o-spreadsheet" element.
   */
  position: DOMCoordinates;
  marginTop: number;
  childWidth: number;
  childHeight: number;
  /**
   * The component is moved by this amount to the left when
   * it is rendered on the left.
   */
  flipHorizontalOffset: number;
  /**
   * The component is moved by this amount to the top when
   * it is rendered on the top.
   */
  flipVerticalOffset: number;
}

export class Popover extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { Portal };
  static defaultProps = {
    flipHorizontalOffset: 0,
    flipVerticalOffset: 0,
    verticalOffset: 0,
    marginTop: 0,
  };
  private getters = this.env.getters;

  get style() {
    const horizontalPosition = `left:${this.horizontalPosition()}`;
    const verticalPosition = `top:${this.verticalPosition()}`;
    const height = `max-height:${
      this.viewportDimension.height - BOTTOMBAR_HEIGHT - SCROLLBAR_WIDTH
    }`;
    return `
      position: absolute;
      z-index: 5;
      ${verticalPosition}px;
      ${horizontalPosition}px;
      ${height}px;
      width:${this.props.childWidth}px;
      overflow-y: auto;
      overflow-x: hidden;
      box-shadow: 1px 2px 5px 2px rgb(51 51 51 / 15%);
    `;
  }

  private get viewportDimension(): GridDimension {
    return this.getters.getViewportDimensionWithHeaders();
  }

  private get shouldRenderRight(): boolean {
    const { x } = this.props.position;
    return x + this.props.childWidth < this.viewportDimension.width;
  }

  private get shouldRenderBottom(): boolean {
    const { y } = this.props.position;
    return y + this.props.childHeight < this.viewportDimension.height + TOPBAR_HEIGHT;
  }

  private horizontalPosition(): number {
    const { x } = this.props.position;
    if (this.shouldRenderRight) {
      return x;
    }
    return x - this.props.childWidth - this.props.flipHorizontalOffset;
  }

  private verticalPosition(): number {
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
