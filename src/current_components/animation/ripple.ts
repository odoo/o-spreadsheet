import { Component, onMounted, onWillUnmount, useRef, useState } from "@odoo/owl";
import { Rect, SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss, getElementMargins } from "../helpers/css";
import { getBoundingRectAsPOJO } from "../helpers/dom_helpers";

const RIPPLE_KEY_FRAMES = [
  { transform: "scale(0)" },
  { transform: "scale(0.8)", offset: 0.33 },
  { opacity: "0", transform: "scale(1)", offset: 1 },
];

css/* scss */ `
  .o-ripple {
    z-index: 1;
  }
`;

interface RippleProps {
  color: string;
  opacity: number;
  duration: number;

  /** If true, the ripple will play from the element center instead of the position of the click */
  ignoreClickPosition?: boolean;

  /** Width of the ripple. Defaults to the width of the element the ripple is on (without margins). */
  width?: number;
  /** Height of the ripple. Defaults to the height of the element the ripple is on (without margins). */
  height?: number;

  offsetY?: number;
  offsetX?: number;

  allowOverflow?: boolean;
  enabled: boolean;
  onAnimationEnd: () => void;
  class: string;
}

interface RippleEffectProps
  extends Omit<Required<RippleProps>, "ignoreClickPosition" | "enabled" | "class"> {
  x: string;
  y: string;
  style: string;
}

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

class RippleEffect extends Component<RippleEffectProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RippleEffect";
  static props = {
    x: String,
    y: String,
    color: String,
    opacity: Number,
    duration: Number,
    width: Number,
    height: Number,
    offsetY: Number,
    offsetX: Number,
    allowOverflow: Boolean,
    onAnimationEnd: Function,
    style: String,
  };
  private rippleRef = useRef("ripple");

  setup() {
    let animation: Animation | undefined = undefined;
    onMounted(() => {
      const rippleEl = this.rippleRef.el;
      if (!rippleEl || !rippleEl.animate) return;
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

export class Ripple extends Component<RippleProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Ripple";
  static props = {
    color: { type: String, optional: true },
    opacity: { type: Number, optional: true },
    duration: { type: Number, optional: true },
    ignoreClickPosition: { type: Boolean, optional: true },
    width: { type: Number, optional: true },
    height: { type: Number, optional: true },
    offsetY: { type: Number, optional: true },
    offsetX: { type: Number, optional: true },
    allowOverflow: { type: Boolean, optional: true },
    enabled: { type: Boolean, optional: true },
    onAnimationEnd: { type: Function, optional: true },
    slots: Object,
    class: { type: String, optional: true },
  };
  static components = { RippleEffect };
  static defaultProps = {
    color: "#aaaaaa",
    opacity: 0.4,
    duration: 800,
    enabled: true,
    onAnimationEnd: () => {},
    class: "",
  };

  private childContainer = useRef("childContainer");

  private state = useState<RippleState>({ ripples: [] });

  private currentId = 1;

  onClick(ev: MouseEvent) {
    if (!this.props.enabled) return;
    const containerEl = this.childContainer.el;
    if (!containerEl) return;

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
    const containerEl = this.childContainer.el;

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
    const el = this.childContainer.el;
    if (!el) throw new Error("No child container element found");

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
    if (index === -1) return;
    this.state.ripples.splice(index, 1);
  }

  getRippleEffectProps(id: number): RippleEffectProps {
    const rect = this.state.ripples.find((r) => r.id === id)?.rippleRect;
    if (!rect) throw new Error("Cannot find a ripple with the id " + id);
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
