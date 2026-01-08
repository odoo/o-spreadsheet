import { CSSProperties } from "@odoo/o-spreadsheet-engine/types/misc";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { rectIntersection } from "../../helpers/rectangle";
import { DOMCoordinates, DOMDimension, Pixel, Rect } from "../../types";
import { PopoverPropsPosition } from "../../types/cell_popovers";
import { usePopoverContainer, useSpreadsheetRect } from "../helpers/position_hook";

type PopoverPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type DisplayValue = "none" | "block";

export interface PopoverProps {
  /**
   * Rectangle around which the popover is displayed.
   * Coordinates are expressed as absolute DOM position.
   */
  anchorRect: Rect;

  /** The popover can be positioned below the anchor Rectangle, or to the right of the rectangle */
  positioning: PopoverPropsPosition;

  maxWidth?: Pixel;
  maxHeight?: Pixel;

  /** Offset to apply to the vertical position of the popover.*/
  verticalOffset: number;

  onMouseWheel?: () => void;
  onPopoverMoved?: () => void;
  onPopoverHidden?: () => void;

  class?: string;
}

export class Popover extends Component<PopoverProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Popover";
  static props = {
    anchorRect: Object,
    containerRect: { type: Object, optional: true },
    positioning: { type: String, optional: true },
    maxWidth: { type: Number, optional: true },
    maxHeight: { type: Number, optional: true },
    verticalOffset: { type: Number, optional: true },
    onMouseWheel: { type: Function, optional: true },
    onPopoverHidden: { type: Function, optional: true },
    onPopoverMoved: { type: Function, optional: true },
    zIndex: { type: Number, optional: true },
    class: { type: String, optional: true },
    slots: Object,
  };
  static defaultProps = {
    positioning: "bottom-left",
    verticalOffset: 0,
    onMouseWheel: () => {},
    onPopoverMoved: () => {},
    onPopoverHidden: () => {},
  };

  private popoverRef = useRef("popover");
  private popoverContentRef = useRef("popoverContent");
  private currentPosition: PopoverPosition | undefined = undefined;
  private currentDisplayValue: DisplayValue | undefined = undefined;

  private spreadsheetRect = useSpreadsheetRect();
  private containerRect: Rect | undefined;

  setup() {
    this.containerRect = usePopoverContainer();

    const resizeObserver = new ResizeObserver(this.computePopoverPosition.bind(this));
    onMounted(() => {
      resizeObserver.observe(this.popoverContentRef.el!);
    });
    onWillUnmount(() => {
      resizeObserver.disconnect();
    });

    // useEffect occurs after the DOM is created and the element width/height are computed, but before
    // the element in rendered, so we can still set its position
    useEffect(this.computePopoverPosition.bind(this));
  }

  private computePopoverPosition() {
    if (!this.containerRect) {
      throw new Error("Popover container is not defined");
    }
    const el = this.popoverRef.el!;
    const contentEl = this.popoverContentRef.el!;

    const anchor = rectIntersection(this.props.anchorRect, this.containerRect);
    const newDisplay: DisplayValue = anchor ? "block" : "none";
    if (this.currentDisplayValue !== "none" && newDisplay === "none") {
      this.props.onPopoverHidden?.();
    }
    el.style.display = newDisplay;
    this.currentDisplayValue = newDisplay;

    if (!anchor) {
      return;
    }

    const propsMaxSize = { width: this.props.maxWidth, height: this.props.maxHeight };
    let elDims = {
      width: contentEl.getBoundingClientRect().width,
      height: contentEl.getBoundingClientRect().height,
    };

    const spreadsheetRect = this.spreadsheetRect;

    const popoverPositionHelper =
      this.props.positioning === "bottom-left"
        ? new BottomLeftPopoverContext(
            anchor,
            this.containerRect,
            propsMaxSize,
            spreadsheetRect,
            this.currentPosition
          )
        : new TopRightPopoverContext(
            anchor,
            this.containerRect,
            propsMaxSize,
            spreadsheetRect,
            this.currentPosition
          );

    el.style["max-height"] = popoverPositionHelper.getMaxHeight(elDims.height) + "px";
    el.style["max-width"] = popoverPositionHelper.getMaxWidth(elDims.width) + "px";
    // Re-compute the dimensions after setting the max-width and max-height
    elDims = {
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
    };

    const style = popoverPositionHelper.getCss(elDims, this.props.verticalOffset);
    for (const property of Object.keys(style)) {
      el.style[property] = style[property];
    }

    const newPosition = popoverPositionHelper.getCurrentPosition(elDims);
    if (this.currentPosition && newPosition !== this.currentPosition) {
      this.props.onPopoverMoved?.();
    }
    this.currentPosition = newPosition;
  }
}

abstract class PopoverPositionContext {
  constructor(
    protected anchorRect: Rect,
    protected containerRect: Rect,
    private propsMaxSize: Partial<DOMDimension>,
    private spreadsheetOffset: DOMCoordinates,
    private lastPosition?: PopoverPosition
  ) {}

  protected abstract get availableHeightUp(): number;
  protected abstract get availableHeightDown(): number;
  protected abstract get availableWidthRight(): number;
  protected abstract get availableWidthLeft(): number;

  protected abstract getTopCoordinate(elementHeight: number, shouldRenderAtBottom: boolean): number;
  protected abstract getLeftCoordinate(elementWidth: number, shouldRenderAtRight: boolean): number;

  /**
   * Check if the popover should be rendered at the bottom of the anchorRect or at the top.
   * Try to keep the same position as this.lastPosition if possible.
   */
  private shouldRenderAtBottom(elementHeight: number): boolean {
    if (this.lastPosition === "top-left" || this.lastPosition === "top-right") {
      const shouldRenderAtTop =
        elementHeight <= this.availableHeightUp ||
        this.availableHeightUp >= this.availableHeightDown;
      return !shouldRenderAtTop;
    }
    const shouldRenderAtBottom =
      elementHeight <= this.availableHeightDown ||
      this.availableHeightDown >= this.availableHeightUp;
    return shouldRenderAtBottom;
  }

  /**
   * Check if the popover should be rendered at the right of the anchorRect or at the left.
   * Try to keep the same position as this.lastPosition if possible.
   */
  private shouldRenderAtRight(elementWidth: number): boolean {
    if (this.lastPosition === "bottom-left" || this.lastPosition === "top-left") {
      const shouldRenderAtLeft =
        elementWidth <= this.availableWidthLeft ||
        this.availableWidthLeft >= this.availableWidthRight;
      return !shouldRenderAtLeft;
    }
    const shouldRenderAtRight =
      elementWidth <= this.availableWidthRight ||
      this.availableWidthRight >= this.availableWidthLeft;
    return shouldRenderAtRight;
  }

  getMaxHeight(elementHeight: number) {
    const shouldRenderAtBottom = this.shouldRenderAtBottom(elementHeight);
    const availableHeight = shouldRenderAtBottom
      ? this.availableHeightDown
      : this.availableHeightUp;

    return this.propsMaxSize.height
      ? Math.min(availableHeight, this.propsMaxSize.height)
      : availableHeight;
  }

  getMaxWidth(elementWidth: number) {
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
    return {
      top:
        this.getTopCoordinate(actualHeight, shouldRenderAtBottom) -
        this.spreadsheetOffset.y -
        verticalOffset +
        "px",
      left:
        this.getLeftCoordinate(actualWidth, shouldRenderAtRight) - this.spreadsheetOffset.x + "px",
    };
  }

  getCurrentPosition(elDims: DOMDimension): PopoverPosition {
    const shouldRenderAtBottom = this.shouldRenderAtBottom(elDims.height);
    const shouldRenderAtRight = this.shouldRenderAtRight(elDims.width);

    if (shouldRenderAtBottom && shouldRenderAtRight) {
      return "bottom-right";
    }
    if (shouldRenderAtBottom && !shouldRenderAtRight) {
      return "bottom-left";
    }
    if (!shouldRenderAtBottom && shouldRenderAtRight) {
      return "top-right";
    }
    return "top-left";
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
