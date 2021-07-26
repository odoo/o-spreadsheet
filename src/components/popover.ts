import * as owl from "@odoo/owl";
import { HEADER_HEIGHT } from "../constants";
import { Coordinates, GridDimension, SpreadsheetEnv } from "../types";
const { Component, tags } = owl;
const { Portal } = owl.misc;
const { xml } = tags;

const TEMPLATE = xml/* xml */ `
  <Portal target="props.target">
    <div t-att-style="style">
      <t t-slot="default"/>
    </div>
  </Portal>
`;

interface Props {
  /**
   * Coordinates are expressed relative to the closest positioned parent,
   * i.e. the closest parent which isn't `position: static`.
   */
  position: Coordinates;
  target: string;
  childWidth: number;
  childHeight: number;
  /**
   * TODO
   */
  flipHorizontalOffset: number;
  flipVerticalOffset: number;
}

export class Popover extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { Portal };
  static defaultProps = {
    flipHorizontalOffset: 0,
    flipVerticalOffset: 0,
    target: ".o-grid",
  };
  private getters = this.env.getters;

  get style() {
    const hStyle = `left:${this.horizontalPosition()}`;
    const vStyle = `top:${this.verticalPosition()}`;
    const heightStyle = `max-height:${this.viewportDimension.height}`;
    return `
      position: absolute;
      z-index: 10;
      ${vStyle}px;
      ${hStyle}px;
      ${heightStyle}px;
      width:${this.props.childWidth};
      height:${this.props.childHeight};
    `;
  }

  private get viewportDimension(): GridDimension {
    return this.getters.getViewportDimension();
  }

  private get shouldRenderRight(): boolean {
    const { x } = this.props.position;
    return x + this.props.childWidth < this.viewportDimension.width;
  }

  private get shouldRenderBottom(): boolean {
    const { y } = this.props.position;
    return y + this.props.childHeight < this.viewportDimension.height;
  }

  private horizontalPosition(): number {
    const { x } = this.props.position;
    return this.shouldRenderRight ? x : x - this.props.childWidth - this.props.flipHorizontalOffset;
  }

  private verticalPosition(): number {
    const { y } = this.props.position;
    if (this.shouldRenderBottom) {
      return y;
    }
    // don't let the component overflow on the header and the top bar.
    return Math.max(
      y - this.props.childHeight + this.props.flipVerticalOffset,
      HEADER_HEIGHT + 6 // some margin between the header and the component
    );
  }
}
