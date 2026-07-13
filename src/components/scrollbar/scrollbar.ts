import { onMounted, signal, useProps, xml } from "@odoo/owl";
import { Component, useLayoutEffect } from "../../owl3_compatibility_layer";
import { Pixel } from "../../types/misc";
import { ScrollDirection } from "../../types/scroll_direction";
import { cssPropertiesToCss } from "../helpers/css";
import { types } from "../props_validation";
import { ScrollBar as ScrollBarElement } from "../scrollbar";

export class ScrollBar extends Component<any> {
  static template = xml/*xml*/ `
    <div
        t-attf-class="o-scrollbar {{this.props.direction}}"
        t-on-scroll="this.onScroll"
        t-ref="this.scrollbarRef"
        t-att-style="this.positionCss">
      <div t-att-style="this.sizeCss"/>
    </div>
  `;

  protected props = useProps({
    width: types.Pixel().optional(1),
    height: types.Pixel().optional(1),
    direction: types.customValidator(types.string() as ScrollDirection, (direction) =>
      ["horizontal", "vertical"].includes(direction)
    ),
    position: types.CSSProperties(),
    offset: types.Pixel(),
    onScroll: types.function<(offset: Pixel) => void>(),
  });

  private scrollbarRef = signal<HTMLElement | null>(null);
  private scrollbar!: ScrollBarElement;

  setup() {
    this.scrollbar = new ScrollBarElement(this.scrollbarRef(), this.props.direction);
    onMounted(() => {
      this.scrollbar.el = this.scrollbarRef()!;
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
