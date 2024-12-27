import { Component, useEffect, useRef, xml } from "@odoo/owl";
// import { SCROLLBAR_WIDTH } from "../../constants";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

interface Props {
  positionOffset: { offsetX: number; offsetY: number };
}

css/* scss */ `
  .mask {
    height: 100%;
    width: 100%;
    background: rgba(63, 39, 245, 0.43);
    position: absolute;
    overflow: auto;
    z-index: 4;

    // left: ${HEADER_WIDTH}px;
    // top: ${HEADER_HEIGHT}px;
    // pointer-events: none;
  }

  .mask::-webkit-scrollbar {
    display: none;
  }
  .mask {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }

  .submask {
    pointer-events: none;
    overflow: auto;
  }
`;

export class ScrollMask extends Component<Props, SpreadsheetChildEnv> {
  static props = {
    positionOffset: Object,
    slots: { type: Object, optional: true },
  };
  static template = xml/*xml*/ `
    <div class="mask" t-ref="mask" t-on-scroll.stop="onScroll" >
        <div t-att-style="maskOverflowStyle" />
        <div t-att-style="slotStyle" >
          <t t-slot="default"/>
        </div>
    </div>
    <div class="submask" t-ref="submask" t-att-style="submaskStyle" >
      <div class="" t-att-style="submaskOverflowStyle" />
    </div>
    `;

  private maskRef = useRef("mask");
  private submaskRef = useRef("submask");

  setup(): void {
    useEffect(
      () => {
        const { scrollX, scrollY } = this.env.model.getters.getActiveSheetDOMScrollInfo();
        if (
          // this.maskRef.el?.scrollLeft !== scrollX ||
          // this.maskRef.el?.scrollTop !== scrollY ||
          this.submaskRef.el?.scrollLeft !== scrollX ||
          this.submaskRef.el?.scrollTop !== scrollY
        ) {
          this.maskRef.el!.scrollLeft = scrollX;
          this.maskRef.el!.scrollTop = scrollY;
          this.submaskRef.el!.scrollLeft = scrollX;
          this.submaskRef.el!.scrollTop = scrollY;
          // this.scrollbar.scroll = this.props.offset;
        }
      },
      () => [
        this.maskRef.el?.scrollLeft,
        this.maskRef.el?.scrollTop,
        this.submaskRef.el?.scrollLeft,
        this.submaskRef.el?.scrollTop,
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
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetDOMScrollInfo();
    return cssPropertiesToCss({
      position: "relative",
      top: scrollY + "px",
      left: scrollX + "px",
      width: "100%",
      height: "100%",
    });
  }

  get maskOverflowStyle() {
    const { x, y, width, height } = this.env.model.getters.getMainViewportRect();
    const { offsetX, offsetY } = this.props.positionOffset;
    // const sheetId = this.env.model.getters.getActiveSheetId();
    return cssPropertiesToCss({
      width: `${x + width + offsetX}px`,
      height: `${y + height + offsetY}px`,
      position: "absolute",
      "z-index": "-1",
    });
  }

  //  LE but du submaswk est de fiare c equ'on faisait avec les crollbar, c'est a dire mimiquer une physique de scrollbar
  //  mais en fiat on veut pouvoir scroller sur toute la page donc on a besoin de deux masques
  //   un qui est positionné au bon endroit et qui a les scrolls pas cachés et qui a la bonne dimension et qui est proprement positionné MAIS qui n'a aucun listener donc pointer-events: none
  //   et le second qui est position au bon endroit (celui en bas a droites des frozen pane et qui a une scrollbar visible) (on pourrait aussi arbitrairement choisir de le faire en mode scrollbar) cela dit

  get submaskStyle() {
    const { x, y } = this.env.model.getters.getMainViewportRect();
    const { offsetX, offsetY } = this.props.positionOffset;
    const top = y + offsetY;
    const left = x + offsetX;

    return cssPropertiesToCss({
      width: `calc(100% - ${left}px)`,
      height: `calc(100% - ${top}px)`,
      position: "absolute",
      "z-index": "5",
      left: `${left}px`,
      top: `${top}px`,
      overflow: "auto",
    });
  }

  get submaskOverflowStyle() {
    const { x, y, width, height } = this.env.model.getters.getMainViewportRect();
    const { offsetX, offsetY } = this.props.positionOffset;
    // const sheetId = this.env.model.getters.getActiveSheetId();
    return cssPropertiesToCss({
      width: `${width}px`,
      height: `${height}px`,
      position: "absolute",
      xz: `${x + offsetX}px`,
      yz: `${y + offsetY}px`,
      background: "rgba(245, 40, 145, 0.22)",
    });
  }

  get isDisplayed() {
    const { yRatio } = this.env.model.getters.getFrozenSheetViewRatio(
      this.env.model.getters.getActiveSheetId()
    );
    return yRatio < 1;
  }

  // TODO jeudi ratjouter un autre masque qui a les scrolls pas cachés et qui a la bonne dimension et qui est proprement positionné MAIS qui n'a aucun listener donc pointer-events: none

  //   get position() {
  //     const { y } = this.env.model.getters.getMainViewportRect();
  //     return {
  //       top: `${this.props.topOffset + y}px`,
  //       right: "0px",
  //       width: `${SCROLLBAR_WIDTH}px`,
  //       bottom: `0px`,
  //     };
  //   }

  onScroll() {
    if (!this.maskRef.el) return;
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: this.maskRef.el.scrollLeft, // offsetX is the same
      offsetY: this.maskRef.el.scrollTop,
    });
  }

  touchmove(ev: TouchEvent) {
    console.log("touchmove de mask");
  }
}

// TODORAR wrap in a dedicated cla
// export class ScrollBar {
//   el: HTMLElement;
//   constructor(el: HTMLElement | null) {
//     this.el = el!;
//   }

//   get scroll(): { x: Pixel; y: Pixel } {
//     return { x: this.el.scrollLeft, y: this.el.scrollTop };
//   }

//   set scroll({ x, y }: { x: Pixel; y: Pixel }) {
//     this.el.scrollLeft = x;
//     this.el.scrollTop = y;
//   }
// }
