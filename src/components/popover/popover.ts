import { Component, useEffect, useRef } from "@odoo/owl";
import { ComponentsImportance } from "../../constants";
import { rectIntersection } from "../../helpers/rectangle";
import { DOMCoordinates, DOMDimension, Pixel, Rect, SpreadsheetChildEnv } from "../../types";
import { PopoverPropsPosition } from "../../types/cell_popovers";
import { css } from "../helpers/css";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { CSSProperties } from "./../../types/misc";

type PopoverPosition = "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight";
type Visibility = "hidden" | "visible";

export interface PopoverProps {
  /**
   * Rectangle around which the popover is displayed.
   * Coordinates are expressed as absolute DOM position.
   */
  anchorRect: Rect;

  /**
   * Rectangle around which the popover is displayed (in absolute DOM position).
   * If undefined, the popover will take the o-spreadsheet element as container.
   */
  containerRect?: Rect;

  /** The popover can be positioned below the anchor Rectangle, or to the right of the rectangle */
  positioning: PopoverPropsPosition;

  maxWidth?: Pixel;
  maxHeight?: Pixel;

  /** Offset to apply to the vertical position of the popover.*/
  verticalOffset: number;

  onMouseWheel?: () => {};
  onPopoverMoved?: () => {};
  onPopoverHidden?: () => {};
}

css/* scss */ `
  .o-popover {
    position: absolute;
    z-index: ${ComponentsImportance.Popover};
    overflow: auto;
    box-shadow: 1px 2px 5px 2px rgb(51 51 51 / 15%);
    width: fit-content;
    height: fit-content;
  }
`;

export class Popover extends Component<PopoverProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Popover";
  static defaultProps = {
    positioning: "BottomLeft",
    verticalOffset: 0,
    onMouseWheel: () => {},
    onPopoverMoved: () => {},
    onPopoverHidden: () => {},
  };

  private popoverRef = useRef("popover");
  private currentPosition: PopoverPosition | undefined = undefined;
  private currentVisibility: Visibility | undefined = undefined;

  private spreadsheetRect = useSpreadsheetRect();
  setup() {
    // useEffect occurs after the DOM is created and the element width/height are computed, but before
    // the element in rendered, so we can still set its position
    useEffect(() => {
      if (!this.containerRect) throw new Error("Popover container is not defined");
      this.resetPopoverElStyle();
      const el = this.popoverRef.el!;

      const propsMaxSize = { width: this.props.maxWidth, height: this.props.maxHeight };

      const elDims = {
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      };

      const spreadsheetRect = this.spreadsheetRect;

      const anchor = rectIntersection(this.props.anchorRect, this.containerRect);
      const newVisibility: Visibility = anchor ? "visible" : "hidden";
      if (this.currentVisibility !== "hidden" && newVisibility === "hidden") {
        this.props.onPopoverHidden?.();
      }
      el.style.visibility = newVisibility;
      this.currentVisibility = newVisibility;

      if (!anchor) return;

      const popoverPositionHelper =
        this.props.positioning === "BottomLeft"
          ? new BottomLeftPopoverContext(anchor, this.containerRect, propsMaxSize, spreadsheetRect)
          : new TopRightPopoverContext(anchor, this.containerRect, propsMaxSize, spreadsheetRect);

      const style = popoverPositionHelper.getCss(elDims, this.props.verticalOffset);
      for (const property of Object.keys(style)) {
        el.style[property] = style[property];
      }

      const newPosition = popoverPositionHelper.getCurrentPosition(elDims);
      if (this.currentPosition && newPosition !== this.currentPosition) {
        this.props.onPopoverMoved?.();
      }
      this.currentPosition = newPosition;
    });
  }

  private resetPopoverElStyle() {
    const el = this.popoverRef.el;
    if (!el) return;
    el.style["visibility"] = "visible";
    el.style["max-height"] = el.style["max-width"] = "";
    el.style["bottom"] = el.style["top"] = el.style["right"] = el.style["left"] = "";
  }

  get containerRect(): Rect | undefined {
    return this.props.containerRect || this.spreadsheetRect;
  }
}

Popover.props = {
  anchorRect: Object,
  containerRect: { type: Object, optional: true },
  positioning: { type: String, optional: true },
  maxWidth: { type: Number, optional: true },
  maxHeight: { type: Number, optional: true },
  verticalOffset: { type: Number, optional: true },
  onMouseWheel: { type: Function, optional: true },
  onPopoverHidden: { type: Function, optional: true },
  onPopoverMoved: { type: Function, optional: true },
  slots: Object,
};

abstract class PopoverPositionContext {
  constructor(
    protected anchorRect: Rect,
    protected containerRect: Rect,
    private propsMaxSize: Partial<DOMDimension>,
    private spreadsheetOffset: DOMCoordinates
  ) {}

  protected abstract get availableHeightUp(): number;
  protected abstract get availableHeightDown(): number;
  protected abstract get availableWidthRight(): number;
  protected abstract get availableWidthLeft(): number;

  protected abstract getTopCoordinate(elementHeight: number, shouldRenderAtBottom: boolean): number;
  protected abstract getLeftCoordinate(elementWidth: number, shouldRenderAtRight: boolean): number;

  /** Check if there is enough space for the popover to be rendered at the bottom of the anchorRect */
  private shouldRenderAtBottom(elementHeight: number): boolean {
    return (
      elementHeight <= this.availableHeightDown ||
      this.availableHeightDown >= this.availableHeightUp
    );
  }

  /** Check if there is enough space for the popover to be rendered at the right of the anchorRect */
  private shouldRenderAtRight(elementWidth: number): boolean {
    return (
      elementWidth <= this.availableWidthRight ||
      this.availableWidthRight >= this.availableWidthLeft
    );
  }

  private getMaxHeight(elementHeight: number) {
    const shouldRenderAtBottom = this.shouldRenderAtBottom(elementHeight);
    const availableHeight = shouldRenderAtBottom
      ? this.availableHeightDown
      : this.availableHeightUp;

    return this.propsMaxSize.height
      ? Math.min(availableHeight, this.propsMaxSize.height)
      : availableHeight;
  }

  private getMaxWidth(elementWidth: number) {
    const shouldRenderAtRight = this.shouldRenderAtRight(elementWidth);
    const availableWidth = shouldRenderAtRight ? this.availableWidthRight : this.availableWidthLeft;

    return this.propsMaxSize.width
      ? Math.min(availableWidth, this.propsMaxSize.width)
      : availableWidth;
  }

  getCss(elDims: DOMDimension, verticalOffset: number): CSSProperties {
    const maxHeight = this.getMaxHeight(elDims.height);
    const maxWidth = this.getMaxWidth(elDims.width);

    const actualHeight = Math.min(maxHeight, elDims.height);
    const actualWidth = Math.min(maxWidth, elDims.width);

    const shouldRenderAtBottom = this.shouldRenderAtBottom(elDims.height);
    const shouldRenderAtRight = this.shouldRenderAtRight(elDims.width);

    verticalOffset = shouldRenderAtBottom ? verticalOffset : -verticalOffset;
    const cssProperties: CSSProperties = {
      "max-height": maxHeight + "px",
      "max-width": maxWidth + "px",
      top:
        this.getTopCoordinate(actualHeight, shouldRenderAtBottom) -
        this.spreadsheetOffset.y -
        verticalOffset +
        "px",
      left:
        this.getLeftCoordinate(actualWidth, shouldRenderAtRight) - this.spreadsheetOffset.x + "px",
    };

    return cssProperties;
  }

  getCurrentPosition(elDims: DOMDimension): PopoverPosition {
    const shouldRenderAtBottom = this.shouldRenderAtBottom(elDims.height);
    const shouldRenderAtRight = this.shouldRenderAtRight(elDims.width);

    if (shouldRenderAtBottom && shouldRenderAtRight) return "BottomRight";
    if (shouldRenderAtBottom && !shouldRenderAtRight) return "BottomLeft";
    if (!shouldRenderAtBottom && shouldRenderAtRight) return "TopRight";
    return "TopLeft";
  }
}

class BottomLeftPopoverContext extends PopoverPositionContext {
  protected get availableHeightUp() {
    return this.anchorRect.y - this.containerRect.y;
  }

  protected get availableHeightDown() {
    return this.containerRect.height - this.availableHeightUp - this.anchorRect.height;
  }

  protected get availableWidthRight() {
    return this.containerRect.x + this.containerRect.width - this.anchorRect.x;
  }

  protected get availableWidthLeft() {
    return this.anchorRect.x + this.anchorRect.width - this.containerRect.x;
  }

  protected getTopCoordinate(elementHeight: number, shouldRenderAtBottom: boolean): number {
    if (shouldRenderAtBottom) {
      return this.anchorRect.y + this.anchorRect.height;
    } else {
      return this.anchorRect.y - elementHeight;
    }
  }

  protected getLeftCoordinate(elementWidth: number, shouldRenderAtRight: boolean): number {
    if (shouldRenderAtRight) {
      return this.anchorRect.x;
    } else {
      return this.anchorRect.x + this.anchorRect.width - elementWidth;
    }
  }
}

class TopRightPopoverContext extends PopoverPositionContext {
  protected get availableHeightUp() {
    return this.anchorRect.y + this.anchorRect.height - this.containerRect.y;
  }

  protected get availableHeightDown() {
    return this.containerRect.y + this.containerRect.height - this.anchorRect.y;
  }

  protected get availableWidthRight() {
    return this.containerRect.width - this.anchorRect.width - this.availableWidthLeft;
  }

  protected get availableWidthLeft() {
    return this.anchorRect.x - this.containerRect.x;
  }

  protected getTopCoordinate(elementHeight: number, shouldRenderAtBottom: boolean): number {
    if (shouldRenderAtBottom) {
      return this.anchorRect.y;
    } else {
      return this.anchorRect.y + this.anchorRect.height - elementHeight;
    }
  }

  protected getLeftCoordinate(elementWidth: number, shouldRenderAtRight: boolean): number {
    if (shouldRenderAtRight) {
      return this.anchorRect.x + this.anchorRect.width;
    } else {
      return this.anchorRect.x - elementWidth;
    }
  }
}
