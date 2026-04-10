import { onMounted, props, types, xml } from "@odoo/owl";
import { Component, useLayoutEffect, useRef } from "../../owl3_compatibility_layer";
import { CSSProperties, Pixel, Ref } from "../../types";
import { ScrollDirection } from "../../types/scroll_direction";
import { cssPropertiesToCss } from "../helpers";
import { ScrollBar as ScrollBarElement } from "../scrollbar";

interface Props {
  width: Pixel;
  height: Pixel;
  direction: ScrollDirection;
  position: CSSProperties;
  offset: Pixel;
  onScroll: (offset: Pixel) => void;
}

export class ScrollBar extends Component<Props> {
  static template = xml/*xml*/ `
    <div
        t-attf-class="o-scrollbar {{this.props.direction}}"
        t-on-scroll="this.onScroll"
        t-custom-ref="scrollbar"
        t-att-style="this.positionCss">
      <div t-att-style="this.sizeCss"/>
    </div>
  `;

  private scrollbarRef!: Ref<HTMLElement>;
  private scrollbar!: ScrollBarElement;

  constructor(...args: any[]) {
    super(args);
  }

  setup() {
    this.props = props(
      {
        "width?": types.number(),
        "height?": types.number(),
        direction: types.customValidator(types.string() as ScrollDirection, (direction) =>
          ["horizontal", "vertical"].includes(direction)
        ),
        position: types.object({}),
        offset: types.number(),
        onScroll: types.function(),
      },
      {
        width: 1,
        height: 1,
      }
    );
    this.scrollbarRef = useRef("scrollbar");
    this.scrollbar = new ScrollBarElement(this.scrollbarRef.el, this.props.direction);
    onMounted(() => {
      this.scrollbar.el = this.scrollbarRef.el!;
    });
    // TODO improve useLayoutEffect dependencies typing in owl
    useLayoutEffect(
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
