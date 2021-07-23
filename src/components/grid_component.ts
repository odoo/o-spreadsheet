import * as owl from "@odoo/owl";
import { SpreadsheetEnv, GridDimension, Coordinates } from "../types";
const { Component, tags } = owl;
const { xml, css } = tags;

const TEMPLATE = xml/* xml */ `
  <div t-att-style="style">
    <t t-slot="default"/>
  </div>
`;

const CSS = css/* scss */ ``;

/**
 * Coordinates are expressed relative to the closest positioned parent,
 * i.e. the closest parent which isn't `position: static`.
 */
interface Props {
  position: Coordinates;
  /**
   * Grid origin coordinates.
   * The default value is [0, 0] and must be set to the correct value if
   * this parent is not the grid itself.
   */
  gridOrigin: Coordinates;
  childWidth: number;
  childHeight: number;
  /**
   * TODO
   */
  flipHorizontalOffset: number;
  flipVerticalOffset: number;
}

// interface StaticallySizedComponent<P> {
//   width: (props: P) => number;
//   height: (props: P) => number;
// }

export class GridComponent extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static defaultProps = {
    gridOrigin: { x: 0, y: 0 },
    flipHorizontalOffset: 0,
    flipVerticalOffset: 0,
  }
  private getters = this.env.getters;

  get style() {
    console.log(this.props)
    const { x } = this.props.position;
    const hStyle = `left:${this.renderRight ? x : x - this.props.childWidth - this.props.flipHorizontalOffset}`;
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

  private get renderRight(): boolean {
    const { x } = this.props.position;
    const offset = this.props.gridOrigin.x;
    return x + offset < this.viewportDimension.width - this.props.childWidth;
  }

  private get renderBottom(): boolean {
    const { y } = this.props.position;
    const offset = this.props.gridOrigin.y;
    console.log(this.viewportDimension)
    return y + offset + this.props.childHeight < this.viewportDimension.height;
  }

  private verticalPosition(): number {
    const { y } = this.props.position;
    console.log("renderBottom", this.renderBottom)
    if (this.renderBottom) {
      return y;
    }
    // ? MENU_ITEM_HEIGHT
    return y - this.props.childHeight + this.props.flipVerticalOffset
  }

  // get style() {
  //   const { col, row } = this.props.position;
  //   const [leftCol, bottomRow] = this.getters.getBottomLeftCell(
  //     this.getters.getActiveSheetId(),
  //     col,
  //     row
  //   );
  //   const viewport = this.getters.getActiveSnappedViewport();
  //   const { width: viewportWidth, height: viewportHeight } = this.getters.getViewportDimension();
  //   const [x, y, width, height] = this.getters.getRect(
  //     { left: leftCol, top: bottomRow, right: leftCol, bottom: bottomRow },
  //     viewport
  //   );
  //   const hAlign = x + this.props.childWidth + 30 < viewportWidth ? "left" : "right";
  //   const hOffset =
  //     hAlign === "left" ? x + 1 : viewportWidth - x + (SCROLLBAR_WIDTH + 2) - width + 1;
  //   let vAlign = y + this.props.childHeight + height + 20 < viewportHeight ? "top" : "bottom";
  //   const vOffset =
  //     vAlign === "top"
  //       ? y + height + 2
  //       : viewportHeight - y + (SCROLLBAR_WIDTH + 2) + 2 + BOTTOMBAR_HEIGHT;
  //   return `
  //     position: absolute;
  //     ${hAlign}:${hOffset}px;
  //     ${vAlign}:${vOffset}px;
  //     width:${this.props.childWidth};
  //     height:${this.props.childHeight};
  //   `;
  // }
}
