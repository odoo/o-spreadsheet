import { Component, onMounted, useEffect, useRef, xml } from "@odoo/owl";
import { CSSProperties, Pixel, Ref } from "../../types";
import { cssPropertiesToCss } from "../helpers";
import { ScrollBar as ScrollBarElement, ScrollDirection } from "../scrollbar";

interface Props {
  width: Pixel;
  height: Pixel;
  direction: ScrollDirection;
  position: CSSProperties;
  offset: Pixel;
  onScroll: (offset: Pixel) => void;
}

export class ScrollBar extends Component<Props> {
  static props = {
    width: { type: Number, optional: true },
    height: { type: Number, optional: true },
    direction: String,
    position: Object,
    offset: Number,
    onScroll: Function,
  };
  static template = xml/*xml*/ `
    <div
        t-attf-class="o-scrollbar {{props.direction}}"
        t-on-scroll="onScroll"
        t-ref="scrollbar"
        t-att-style="positionCss">
      <div t-att-style="sizeCss"/>
    </div>
  `;
  static defaultProps = {
    width: 1,
    height: 1,
  };
  private scrollbarRef!: Ref<HTMLElement>;
  private scrollbar!: ScrollBarElement;

  setup() {
    this.scrollbarRef = useRef("scrollbar");
    this.scrollbar = new ScrollBarElement(this.scrollbarRef.el, this.props.direction);
    onMounted(() => {
      this.scrollbar.el = this.scrollbarRef.el!;
    });
    // TODO improve useEffect dependencies typing in owl
    useEffect(
      () => {
        if (this.scrollbar.scroll !== this.props.offset) {
          this.scrollbar.scroll = this.props.offset;
        }
      },
      () => [this.scrollbar.scroll, this.props.offset]
    );
  }

  get sizeCss() {
    return cssPropertiesToCss({
      width: `${this.props.width}px`,
      height: `${this.props.height}px`,
    });
  }

  get positionCss() {
    return cssPropertiesToCss(this.props.position);
  }

  onScroll(ev) {
    if (this.props.offset !== this.scrollbar.scroll) {
      this.props.onScroll(this.scrollbar.scroll);
    }
  }
}
