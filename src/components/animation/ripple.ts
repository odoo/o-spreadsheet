import { onMounted, onWillUnmount, props, proxy, signal } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { PropsOf } from "../../types/props_of";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { cssPropertiesToCss, getElementMargins } from "../helpers/css";
import { getBoundingRectAsPOJO } from "../helpers/dom_helpers";
import { types } from "../props_validation";

const RIPPLE_KEY_FRAMES = [
  { transform: "scale(0)" },
  { transform: "scale(0.8)", offset: 0.33 },
  { opacity: "0", transform: "scale(1)", offset: 1 },
];

interface RippleDef {
  rippleRect: Rect | undefined;
  id: number;
}

interface RippleState {
  ripples: Array<RippleDef>;
}

interface RectWithMargins extends Rect {
  marginTop: number;
  marginLeft: number;
}

class RippleEffect extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RippleEffect";

  protected props = props({
    x: types.string(),
    y: types.string(),
    color: types.string(),
    opacity: types.number(),
    duration: types.number(),
    /** Width of the ripple. Defaults to the width of the element the ripple is on (without margins). */
    width: types.number(),
    /** Height of the ripple. Defaults to the height of the element the ripple is on (without margins). */
    height: types.number(),
    offsetY: types.number(),
    offsetX: types.number(),
    allowOverflow: types.boolean(),
    onAnimationEnd: types.function(),
    style: types.string(),
  });

  private rippleRef = signal<HTMLElement | null>(null);

  setup() {
    let animation: Animation | undefined = undefined;
    onMounted(() => {
      const rippleEl = this.rippleRef();
      if (!rippleEl || !rippleEl.animate) {
        return;
      }
      animation = rippleEl.animate(RIPPLE_KEY_FRAMES, {
        duration: this.props.duration,
        easing: "ease-out",
      });
      animation.addEventListener("finish", this.props.onAnimationEnd);
    });
    onWillUnmount(() => {
      animation?.removeEventListener("finish", this.props.onAnimationEnd);
    });
  }

  get rippleStyle() {
    const { x, y, width, height } = this.props;
    const offsetX = this.props.offsetX || 0;
    const offsetY = this.props.offsetY || 0;
    return cssPropertiesToCss({
      transform: "scale(0)",
      left: x,
      top: y,
      "margin-left": `${-width / 2 + offsetX}px`,
      "margin-top": `${-height / 2 + offsetY}px`,
      width: `${width}px`,
      height: `${height}px`,
      background: this.props.color,
      "border-radius": "100%",
      opacity: `${this.props.opacity}`,
    });
  }
}

export class Ripple extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Ripple";
  static components = { RippleEffect };

  protected props = props({
    color: types.string().optional("#aaaaaa"),
    opacity: types.number().optional(0.4),
    duration: types.number().optional(800),

    /** If true, the ripple will play from the element center instead of the position of the click */
    ignoreClickPosition: types.boolean().optional(),
    /** Width of the ripple. Defaults to the width of the element the ripple is on (without margins). */
    width: types.number().optional(),
    /** Height of the ripple. Defaults to the height of the element the ripple is on (without margins). */
    height: types.number().optional(),
    offsetY: types.number().optional(),
    offsetX: types.number().optional(),
    allowOverflow: types.boolean().optional(),
    enabled: types.boolean().optional(true),
    onAnimationEnd: types.function().optional(() => () => {}),
    class: types.string().optional(""),
  });

  private childContainerRef = signal<HTMLElement | null>(null);

  private state = proxy<RippleState>({ ripples: [] });

  private currentId = 1;

  onClick(ev: MouseEvent) {
    if (!this.props.enabled) {
      return;
    }
    const containerEl = this.childContainerRef();
    if (!containerEl) {
      return;
    }

    const rect = this.getRippleChildRectInfo();
    const { x, y, width, height } = rect;
    const maxDim = Math.max(width, height);

    const rippleRect = {
      x: ev.clientX - x,
      y: ev.clientY - y,
      width: this.props.width || maxDim * 2.85,
      height: this.props.height || maxDim * 2.85,
    };
    this.state.ripples.push({ rippleRect, id: this.currentId++ });
  }

  private getRippleStyle(): string {
    const containerEl = this.childContainerRef();

    if (!containerEl || containerEl.childElementCount !== 1 || !containerEl.firstElementChild) {
      return "";
    }

    const rect = this.getRippleChildRectInfo();
    return cssPropertiesToCss({
      top: rect.marginTop + "px",
      left: rect.marginLeft + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
  }

  private getRippleChildRectInfo(): RectWithMargins {
    const el = this.childContainerRef();
    if (!el) {
      throw new Error("No child container element found");
    }

    if (el.childElementCount !== 1 || !el.firstElementChild) {
      const boundingRect = getBoundingRectAsPOJO(el);
      return { ...boundingRect, marginLeft: 0, marginTop: 0 };
    }

    const childEl = el.firstElementChild;
    const margins = getElementMargins(childEl);
    const boundingRect = getBoundingRectAsPOJO(childEl);

    return {
      ...boundingRect,
      marginLeft: margins.left,
      marginTop: margins.top,
    };
  }

  private removeRipple(id: number) {
    const index = this.state.ripples.findIndex((r) => r.id === id);
    if (index === -1) {
      return;
    }
    this.state.ripples.splice(index, 1);
  }

  getRippleEffectProps(id: number): PropsOf<RippleEffect> {
    const rect = this.state.ripples.find((r) => r.id === id)?.rippleRect;
    if (!rect) {
      throw new Error("Cannot find a ripple with the id " + id);
    }
    return {
      color: this.props.color,
      opacity: this.props.opacity,
      duration: this.props.duration,
      x: this.props.ignoreClickPosition ? "50%" : rect.x + "px",
      y: this.props.ignoreClickPosition ? "50%" : rect.y + "px",
      width: rect.width,
      height: rect.height,
      offsetX: this.props.offsetX || 0,
      offsetY: this.props.offsetY || 0,
      allowOverflow: this.props.allowOverflow || false,
      style: this.getRippleStyle(),
      onAnimationEnd: () => this.removeRipple(id),
    };
  }
}
