import { Component, useEffect, useRef, xml } from "@odoo/owl";
// import { SCROLLBAR_WIDTH } from "../../constants";
import { Rect, SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

interface Props {
  rect: Rect;
}

css/* scss */ `
  .mask {
    height: 100%;
    width: 100%;
    background: rgba(63, 39, 245, 0.43);
    position: absolute;
    overflow: auto;
    z-index: 4;
    // pointer-events: none;
  }
`;

export class ScrollMask extends Component<Props, SpreadsheetChildEnv> {
  static props = {
    slots: { type: Object, optional: true },
  };
  static template = xml/*xml*/ `
    <div class="mask" t-ref="mask" t-on-scroll="onScroll" >
        <div t-att-style="maskStyle" />
          <div t-att-style="slotStyle" >
            <t t-slot="default"/>
          </div>
    </div>`;

  private maskRef = useRef("mask");

  setup(): void {
    useEffect(
      () => {
        const { scrollX, scrollY } = this.env.model.getters.getActiveSheetDOMScrollInfo();
        //  TODORAR support frozen panes
        // TODORAR wrap in a dedicated class
        if (this.maskRef.el?.scrollLeft !== scrollX || this.maskRef.el?.scrollTop !== scrollY) {
          this.maskRef.el!.scrollLeft = scrollX;
          this.maskRef.el!.scrollTop = scrollY;
          // this.scrollbar.scroll = this.props.offset;
        }
      },
      () => [
        this.maskRef.el?.scrollLeft,
        this.maskRef.el?.scrollTop,
        this.env.model.getters.getActiveSheetDOMScrollInfo().scrollX,
        this.env.model.getters.getActiveSheetDOMScrollInfo().scrollY,
      ]
    );
  }

  get offset() {
    return this.env.model.getters.getActiveSheetDOMScrollInfo().scrollY;
  }

  get height() {
    return this.env.model.getters.getMainViewportRect().height;
  }

  get slotStyle() {
    return cssPropertiesToCss({
      position: "relative",
      top: this.maskRef.el?.scrollTop + "px",
      left: this.maskRef.el?.scrollLeft + "px",
      width: "100%",
      height: "100%",
    });
  }

  get maskStyle() {
    const { width, height } = this.env.model.getters.getMainViewportRect();

    return cssPropertiesToCss({
      width: `${width}px`,
      height: `${height}px`,
      position: "absolute",
      "z-index": "-4",
    });
  }

  get isDisplayed() {
    const { yRatio } = this.env.model.getters.getFrozenSheetViewRatio(
      this.env.model.getters.getActiveSheetId()
    );
    return yRatio < 1;
  }

  onScroll() {
    if (!this.maskRef.el) return;
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: this.maskRef.el.scrollLeft, // offsetX is the same
      offsetY: this.maskRef.el.scrollTop,
    });
  }
}

// TODORAR wrap in a dedicated cla
