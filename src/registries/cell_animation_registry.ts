import { getColorScale } from "../helpers/color";
import { Box, RenderingBox } from "../types/rendering";
import { Registry } from "./registry";

interface CellAnimationItem {
  id: string;
  easingFn: keyof typeof EASING_FN;
  /**
   * Checks if the changes between the oldBox and newBox require an animation.
   */
  hasAnimation: (oldBox?: RenderingBox, newBox?: RenderingBox) => boolean;
  /**
   * Updates in place the given animatedBox with the animation progress.
   *
   * @returns might return new boxes to be rendered for the animation
   */
  updateAnimation: (
    progress: number,
    animatedBox: RenderingBox,
    oldBox: RenderingBox,
    newBox: Box
  ) => { newBoxes: Box[] } | void;
}

export const cellAnimationRegistry = new Registry<CellAnimationItem>();

cellAnimationRegistry.add("animatedBackgroundColorChange", {
  id: "animatedBackgroundColorChange",
  easingFn: "easeInOutCubic",
  hasAnimation: (oldBox, newBox) => {
    return oldBox?.style?.fillColor !== newBox?.style?.fillColor;
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const colorScale = getColorScale([
      { value: 0, color: oldBox.style.fillColor || "#ffffff" },
      { value: 1, color: newBox.style.fillColor || "#ffffff" },
    ]);
    animatedBox.style.fillColor = colorScale(EASING_FN[this.easingFn](progress));
  },
});

cellAnimationRegistry.add("animatedTextColorChange", {
  id: "animatedTextColorChange",
  easingFn: "easeInOutCubic",
  hasAnimation: (oldBox, newBox) => {
    return oldBox?.style?.textColor !== newBox?.style?.textColor;
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const colorScale = getColorScale([
      { value: 0, color: oldBox.style.textColor || "#000000" },
      { value: 1, color: newBox.style.textColor || "#000000" },
    ]);
    animatedBox.style.textColor = colorScale(EASING_FN[this.easingFn](progress));
  },
});

cellAnimationRegistry.add("animatedDataBar", {
  id: "animatedDataBar",
  easingFn: "easeOutCubic",
  hasAnimation: (oldBox, newBox) => {
    return oldBox?.dataBarFill?.percentage !== newBox?.dataBarFill?.percentage;
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const startingPercentage = oldBox?.dataBarFill?.percentage || 0;
    const endingPercentage = newBox?.dataBarFill?.percentage || 0;

    const value = EASING_FN[this.easingFn](progress);
    const percentage = startingPercentage + (endingPercentage - startingPercentage) * value;
    animatedBox.dataBarFill = {
      color: newBox.dataBarFill?.color || oldBox.dataBarFill?.color || "#ffffff",
      percentage: percentage,
    };
  },
});

cellAnimationRegistry.add("textFadeIn", {
  id: "textFadeIn",
  easingFn: "easeInCubic",
  hasAnimation: (oldBox, newBox) => {
    const oldText = oldBox?.content?.textLines?.join("\n");
    const newText = newBox?.content?.textLines?.join("\n");
    return Boolean(!oldText && newText);
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    animatedBox.textOpacity = EASING_FN[this.easingFn](progress);
  },
});

cellAnimationRegistry.add("textFadeOut", {
  id: "textFadeOut",
  easingFn: "easeOutCubic",
  hasAnimation: (oldBox, newBox) => {
    const oldText = oldBox?.content?.textLines?.join("\n");
    const newText = newBox?.content?.textLines?.join("\n");
    return Boolean(oldText && !newText);
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const textOpacity = 1 - EASING_FN[this.easingFn](progress);
    const style = { ...oldBox.style };
    delete style.fillColor;
    animatedBox.textOpacity = textOpacity;
    animatedBox.content = oldBox.content;
    animatedBox.clipRect = oldBox.clipRect;
    Object.assign(animatedBox.style, style);
  },
});

cellAnimationRegistry.add("textChange", {
  id: "textChange",
  easingFn: "easeOutCubic",
  hasAnimation: (oldBox, newBox) => {
    const oldText = oldBox?.content?.textLines?.join("\n");
    const newText = newBox?.content?.textLines?.join("\n");
    return Boolean(oldText && newText && oldText !== newText);
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const value = EASING_FN[this.easingFn](progress);
    const slideInY = newBox.y + (value - 1) * newBox.height;
    const slideOutY = newBox.y + value * newBox.height;

    const makeIconsEmpty = (icons: Box["icons"]) => {
      return {
        left: icons.left ? { ...icons.left, svg: undefined, component: undefined } : undefined,
        right: icons.right ? { ...icons.right, svg: undefined, component: undefined } : undefined,
        center: icons.center
          ? { ...icons.center, svg: undefined, component: undefined }
          : undefined,
      };
    };

    const slideInBox: Box = {
      id: newBox.id + "-text-slide-in",
      x: newBox.x,
      y: slideInY,
      width: newBox.width,
      height: newBox.height,
      style: { ...newBox.style },
      skipCellGridLines: true,
      content: newBox.content,
      clipRect: newBox.clipRect || {
        ...newBox,
        // large width to avoid clipping the text it it didn't have a clipRect before,
        // we mainly want to clip the Y for the animation
        x: Math.max(0, newBox.x - (newBox.content?.width || 0)),
        width: newBox.width + (newBox.content?.width || 0) * 2,
      },
      icons: makeIconsEmpty(newBox.icons),
    };
    const slideOutBox: Box = {
      id: oldBox.id + "-text-slide-out",
      x: newBox.x,
      y: slideOutY,
      width: newBox.width,
      height: newBox.height,
      style: { ...oldBox.style },
      skipCellGridLines: true,
      content: oldBox.content,
      clipRect: oldBox.clipRect || {
        ...newBox,
        x: Math.max(0, newBox.x - (oldBox.content?.width || 0)),
        width: newBox.width + (oldBox.content?.width || 0) * 2,
      },
      icons: makeIconsEmpty(newBox.icons),
    };

    slideOutBox.style.fillColor = slideInBox.style.fillColor = undefined;

    animatedBox.content = undefined;

    return { newBoxes: [slideInBox, slideOutBox] };
  },
});

cellAnimationRegistry.add("borderFadeIn", {
  id: "borderFadeIn",
  easingFn: "easeInCubic",
  hasAnimation: (oldBox, newBox) => {
    return Boolean(
      (!oldBox?.border?.bottom && newBox?.border?.bottom) ||
        (!oldBox?.border?.top && newBox?.border?.top) ||
        (!oldBox?.border?.left && newBox?.border?.left) ||
        (!oldBox?.border?.right && newBox?.border?.right)
    );
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const borderOpacity = EASING_FN[this.easingFn](progress);
    if (animatedBox.border?.top && newBox.border?.top && !oldBox.border?.top) {
      animatedBox.border.top.opacity = borderOpacity;
    }
    if (animatedBox.border?.bottom && newBox.border?.bottom && !oldBox.border?.bottom) {
      animatedBox.border.bottom.opacity = borderOpacity;
    }
    if (animatedBox.border?.left && newBox.border?.left && !oldBox.border?.left) {
      animatedBox.border.left.opacity = borderOpacity;
    }
    if (animatedBox.border?.right && newBox.border?.right && !oldBox.border?.right) {
      animatedBox.border.right.opacity = borderOpacity;
    }
  },
});

cellAnimationRegistry.add("borderFadeOut", {
  id: "borderFadeOut",
  easingFn: "easeOutCubic",
  hasAnimation: (oldBox, newBox) => {
    return Boolean(
      (oldBox?.border?.bottom && !newBox?.border?.bottom) ||
        (oldBox?.border?.top && !newBox?.border?.top) ||
        (oldBox?.border?.left && !newBox?.border?.left) ||
        (oldBox?.border?.right && !newBox?.border?.right)
    );
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const borderOpacity = 1 - EASING_FN[this.easingFn](progress);
    if (!animatedBox.border) {
      animatedBox.border = {};
    }
    if (oldBox.border?.top && !newBox.border?.top) {
      animatedBox.border.top = { ...oldBox.border.top, opacity: borderOpacity };
    }
    if (oldBox.border?.bottom && !newBox.border?.bottom) {
      animatedBox.border.bottom = { ...oldBox.border.bottom, opacity: borderOpacity };
    }
    if (oldBox.border?.left && !newBox.border?.left) {
      animatedBox.border.left = { ...oldBox.border.left, opacity: borderOpacity };
    }
    if (oldBox.border?.right && !newBox.border?.right) {
      animatedBox.border.right = { ...oldBox.border.right, opacity: borderOpacity };
    }
  },
});

cellAnimationRegistry.add("borderColorChange", {
  id: "borderColorChange",
  easingFn: "easeInOutCubic",
  hasAnimation: (oldBox, newBox) => {
    const oldBorder = oldBox?.border;
    const newBorder = newBox?.border;
    if (!oldBorder || !newBorder) {
      return false;
    }
    return Boolean(
      oldBorder.bottom?.color !== newBorder.bottom?.color ||
        oldBorder.top?.color !== newBorder.top?.color ||
        oldBorder.left?.color !== newBorder.left?.color ||
        oldBorder.right?.color !== newBorder.right?.color
    );
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const animateBorderColor = (side: "top" | "bottom" | "left" | "right") => {
      const oldBorder = oldBox?.border?.[side];
      const newBorder = newBox?.border?.[side];
      const animatedBorder = animatedBox.border?.[side];
      if (oldBorder && newBorder && animatedBorder) {
        const colorScale = getColorScale([
          { value: 0, color: oldBorder.color || "#000000" },
          { value: 1, color: newBorder.color || "#000000" },
        ]);
        animatedBorder.color = colorScale(EASING_FN[this.easingFn](progress));
      }
    };
    animateBorderColor("top");
    animateBorderColor("bottom");
    animateBorderColor("left");
    animateBorderColor("right");
  },
});

cellAnimationRegistry.add("iconFadeIn", {
  id: "iconFadeIn",
  easingFn: "easeInCubic",
  hasAnimation: (oldBox, newBox) => {
    return Boolean(
      (!oldBox?.icons?.center && newBox?.icons?.center) ||
        (!oldBox?.icons?.left && newBox?.icons?.left) ||
        (!oldBox?.icons?.right && newBox?.icons?.right)
    );
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const iconOpacity = EASING_FN[this.easingFn](progress);
    if (animatedBox.icons?.center && newBox.icons?.center && !oldBox.icons?.center) {
      animatedBox.icons.center.opacity = iconOpacity;
    }
    if (animatedBox.icons?.left && newBox.icons?.left && !oldBox.icons?.left) {
      animatedBox.icons.left.opacity = iconOpacity;
    }
    if (animatedBox.icons?.right && newBox.icons?.right && !oldBox.icons?.right) {
      animatedBox.icons.right.opacity = iconOpacity;
    }
  },
});

cellAnimationRegistry.add("iconFadeOut", {
  id: "iconFadeOut",
  easingFn: "easeOutCubic",
  hasAnimation: (oldBox, newBox) => {
    return Boolean(
      (oldBox?.icons?.center && !newBox?.icons?.center) ||
        (oldBox?.icons?.left && !newBox?.icons?.left) ||
        (oldBox?.icons?.right && !newBox?.icons?.right)
    );
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const opacity = 1 - EASING_FN[this.easingFn](progress);
    if (!newBox.icons.center && oldBox.icons.center) {
      animatedBox.icons.center = { ...oldBox.icons.center, opacity };
    }
    if (!newBox.icons.left && oldBox.icons.left) {
      animatedBox.icons.left = { ...oldBox.icons.left, opacity };
    }
    if (!newBox.icons.right && oldBox.icons.right) {
      animatedBox.icons.right = { ...oldBox.icons.right, opacity };
    }
  },
});

cellAnimationRegistry.add("iconChange", {
  id: "iconChange",
  easingFn: "easeOutCubic",
  hasAnimation: (oldBox, newBox) => {
    const oldIcons = oldBox?.icons;
    const newIcons = newBox?.icons;
    if (!oldIcons || !newIcons) {
      return false;
    }
    return Boolean(
      oldIcons.center?.svg !== newIcons.center?.svg ||
        oldIcons.left?.svg !== newIcons.left?.svg ||
        oldIcons.right?.svg !== newIcons.right?.svg
    );
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const value = EASING_FN[this.easingFn](progress);
    const slideInY = newBox.y + (value - 1) * newBox.height;
    const slideOutY = newBox.y + value * newBox.height;

    const newBoxes: Box[] = [];

    const animateIconChange = (side: "left" | "right" | "center") => {
      const oldIcon = oldBox.icons?.[side];
      const newIcon = newBox.icons?.[side];
      if (!oldIcon?.svg || !newIcon?.svg || oldIcon.svg === newIcon.svg) {
        return;
      }
      const slideInBox: Box = {
        id: `${newBox.id}-icon-${side}-slide-in`,
        style: { verticalAlign: newBox.style.verticalAlign },
        x: newBox.x,
        y: slideInY,
        width: newBox.width,
        height: newBox.height,
        skipCellGridLines: true,
        icons: { [side]: { ...newIcon, clipRect: newBox } },
      };
      const slideOutBox: Box = {
        id: `${newBox.id}-icon-${side}-slide-out`,
        style: { verticalAlign: oldBox.style.verticalAlign },
        x: newBox.x,
        y: slideOutY,
        width: newBox.width,
        height: newBox.height,
        skipCellGridLines: true,
        icons: { [side]: { ...oldIcon, clipRect: newBox } },
      };
      animatedBox.icons[side] = undefined;
      newBoxes.push(slideInBox, slideOutBox);
    };
    animateIconChange("left");
    animateIconChange("right");
    animateIconChange("center");
    return { newBoxes };
  },
});

// ADRM TODO: remove all the useless stuff
const HALF_PI = Math.PI / 2;
const PI = Math.PI;
const TAU = 2 * PI;

const atEdge = (t) => t === 0 || t === 1;
const elasticIn = (t, s, p) => -(Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - s) * TAU) / p));
const elasticOut = (t, s, p) => Math.pow(2, -10 * t) * Math.sin(((t - s) * TAU) / p) + 1;

export const EASING_FN = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => -t * (t - 2),
  easeInOutQuad: (t: number) => ((t /= 0.5) < 1 ? 0.5 * t * t : -0.5 * (--t * (t - 2) - 1)),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (t -= 1) * t * t + 1,
  easeInOutCubic: (t: number) => ((t /= 0.5) < 1 ? 0.5 * t * t * t : 0.5 * ((t -= 2) * t * t + 2)),
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => -((t -= 1) * t * t * t - 1),
  easeInOutQuart: (t: number) =>
    (t /= 0.5) < 1 ? 0.5 * t * t * t * t : -0.5 * ((t -= 2) * t * t * t - 2),
  easeInQuint: (t: number) => t * t * t * t * t,
  easeOutQuint: (t: number) => (t -= 1) * t * t * t * t + 1,
  easeInOutQuint: (t: number) =>
    (t /= 0.5) < 1 ? 0.5 * t * t * t * t * t : 0.5 * ((t -= 2) * t * t * t * t + 2),
  easeInSine: (t: number) => -Math.cos(t * HALF_PI) + 1,
  easeOutSine: (t: number) => Math.sin(t * HALF_PI),
  easeInOutSine: (t: number) => -0.5 * (Math.cos(PI * t) - 1),
  easeInExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t: number) => (t === 1 ? 1 : -Math.pow(2, -10 * t) + 1),
  easeInOutExpo: (t: number) =>
    atEdge(t)
      ? t
      : t < 0.5
      ? 0.5 * Math.pow(2, 10 * (t * 2 - 1))
      : 0.5 * (-Math.pow(2, -10 * (t * 2 - 1)) + 2),
  easeInCirc: (t: number) => (t >= 1 ? t : -(Math.sqrt(1 - t * t) - 1)),
  easeOutCirc: (t: number) => Math.sqrt(1 - (t -= 1) * t),
  easeInOutCirc: (t: number) =>
    (t /= 0.5) < 1 ? -0.5 * (Math.sqrt(1 - t * t) - 1) : 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1),
  easeInElastic: (t: number) => (atEdge(t) ? t : elasticIn(t, 0.075, 0.3)),
  easeOutElastic: (t: number) => (atEdge(t) ? t : elasticOut(t, 0.075, 0.3)),
  easeInOutElastic(t: number) {
    const s = 0.1125;
    const p = 0.45;
    return atEdge(t)
      ? t
      : t < 0.5
      ? 0.5 * elasticIn(t * 2, s, p)
      : 0.5 + 0.5 * elasticOut(t * 2 - 1, s, p);
  },
  easeInBack(t: number) {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  easeOutBack(t: number) {
    const s = 1.70158;
    return (t -= 1) * t * ((s + 1) * t + s) + 1;
  },
  easeInOutBack(t: number) {
    let s = 1.70158;
    if ((t /= 0.5) < 1) {
      return 0.5 * (t * t * (((s *= 1.525) + 1) * t - s));
    }
    return 0.5 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2);
  },
  easeInBounce: (t: number) => 1 - EASING_FN.easeOutBounce(1 - t),
  easeOutBounce(t: number) {
    const m = 7.5625;
    const d = 2.75;
    if (t < 1 / d) {
      return m * t * t;
    }
    if (t < 2 / d) {
      return m * (t -= 1.5 / d) * t + 0.75;
    }
    if (t < 2.5 / d) {
      return m * (t -= 2.25 / d) * t + 0.9375;
    }
    return m * (t -= 2.625 / d) * t + 0.984375;
  },
  easeInOutBounce: (t: number) =>
    t < 0.5 ? EASING_FN.easeInBounce(t * 2) * 0.5 : EASING_FN.easeOutBounce(t * 2 - 1) * 0.5 + 0.5,
} as const;
