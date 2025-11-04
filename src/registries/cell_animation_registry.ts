import { getColorScale } from "@odoo/o-spreadsheet-engine/helpers/color";
import { GridIcon } from "@odoo/o-spreadsheet-engine/registries/icons_on_cell_registry";
import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { Box, Rect, RenderingBox } from "@odoo/o-spreadsheet-engine/types/rendering";
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
   * @param progress - The progress of the animation, from 0 to 1.
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
  easingFn: "easeOutCubic",
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
  easingFn: "easeOutCubic",
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

cellAnimationRegistry.add("iconFadeIn", {
  id: "iconFadeIn",
  easingFn: "easeInCubic",
  hasAnimation: (oldBox, newBox) => {
    return Boolean(
      (!oldBox?.icons?.left && newBox?.icons?.left) ||
        (!oldBox?.icons?.right && newBox?.icons?.right) ||
        (!oldBox?.icons?.center && newBox?.icons?.center)
    );
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const iconOpacity = EASING_FN[this.easingFn](progress);
    if (animatedBox.icons.left && newBox.icons.left && !oldBox.icons.left) {
      animatedBox.icons.left.opacity = iconOpacity;
    }
    if (animatedBox.icons.right && newBox.icons.right && !oldBox.icons.right) {
      animatedBox.icons.right.opacity = iconOpacity;
    }
    if (animatedBox.icons.center && newBox.icons.center && !oldBox.icons.center) {
      animatedBox.icons.center.opacity = iconOpacity;
    }
  },
});

cellAnimationRegistry.add("iconFadeOut", {
  id: "iconFadeOut",
  easingFn: "easeOutCubic",
  hasAnimation: (oldBox, newBox) => {
    return Boolean(
      (oldBox?.icons?.left && !newBox?.icons?.left) ||
        (oldBox?.icons?.right && !newBox?.icons?.right) ||
        (oldBox?.icons?.center && !newBox?.icons?.center)
    );
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const iconOpacity = 1 - EASING_FN[this.easingFn](progress);
    if (!animatedBox.icons) {
      animatedBox.icons = {};
    }
    if (oldBox.icons.left && !newBox.icons.left) {
      animatedBox.icons.left = { ...oldBox.icons.left, opacity: iconOpacity };
    }
    if (oldBox.icons.right && !newBox.icons.right) {
      animatedBox.icons.right = { ...oldBox.icons.right, opacity: iconOpacity };
    }
    if (oldBox.icons.center && !newBox.icons.center) {
      animatedBox.icons.center = { ...oldBox.icons.center, opacity: iconOpacity };
    }
  },
});

cellAnimationRegistry.add("textChange", {
  id: "textChange",
  easingFn: "easeOutCubic",
  hasAnimation: (oldBox, newBox) => {
    const oldText = oldBox?.content?.textLines?.join("\n");
    const newText = newBox?.content?.textLines?.join("\n");
    // Note: here, we also animate changes to icons layout (margins/size change, or icon appearing/disappearing)
    // because a change to the icon layout will impact where the text is positioned.
    return Boolean(
      oldText && newText && (oldText !== newText || hasIconLayoutChange(newBox, oldBox))
    );
  },
  updateAnimation: function (progress, animatedBox, oldBox, newBox) {
    const value = EASING_FN[this.easingFn](progress);
    const slideInY = newBox.y + (value - 1) * newBox.height;
    const slideOutY = newBox.y + value * newBox.height;

    const iconLayoutChange = hasIconLayoutChange(newBox, oldBox);

    const slideInBox: Box = {
      id: newBox.id + "-text-slide-in",
      x: newBox.x,
      y: slideInY,
      width: newBox.width,
      height: newBox.height,
      style: { ...newBox.style, hideGridLines: true },
      content: newBox.content ? { ...newBox.content } : undefined,
      clipRect: newBox.clipRect || {
        ...newBox,
        // large width to avoid clipping the text it it didn't have a clipRect before,
        // we mainly want to clip the Y for the animation
        x: Math.max(0, newBox.x - (newBox.content?.width || 0)),
        width: newBox.width + (newBox.content?.width || 0) * 2,
      },
      icons: iconLayoutChange
        ? addClipRectToIcons(newBox.icons, newBox)
        : makeIconsEmpty(newBox.icons),
    };
    const slideOutBox: Box = {
      id: oldBox.id + "-text-slide-out",
      x: newBox.x,
      y: slideOutY,
      width: newBox.width,
      height: newBox.height,
      style: { ...oldBox.style, hideGridLines: true },
      content: oldBox.content ? { ...oldBox.content } : undefined,
      clipRect: oldBox.clipRect || {
        ...newBox,
        x: Math.max(0, newBox.x - (oldBox.content?.width || 0)),
        width: newBox.width + (oldBox.content?.width || 0) * 2,
      },
      icons: iconLayoutChange
        ? addClipRectToIcons(oldBox.icons, newBox)
        : makeIconsEmpty(oldBox.icons),
    };

    if (newBox.content && oldBox.content && slideInBox.content && slideOutBox.content) {
      const slideInContentY = newBox.content.y + (value - 1) * newBox.height;
      const slideOutContentY = newBox.content.y + value * newBox.height;
      slideInBox.content.y = slideInContentY;
      slideOutBox.content.y = slideOutContentY;
    }

    slideOutBox.style.fillColor = slideInBox.style.fillColor = undefined;

    animatedBox.content = undefined;
    animatedBox.icons = iconLayoutChange ? {} : animatedBox.icons;

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
  easingFn: "easeOutCubic",
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

cellAnimationRegistry.add("iconChange", {
  id: "iconChange",
  easingFn: "easeOutCubic",
  hasAnimation: (oldBox, newBox) => {
    return (
      !hasIconLayoutChange(newBox, oldBox) &&
      Boolean(
        oldBox?.icons?.center?.svg?.name !== newBox?.icons?.center?.svg?.name ||
          oldBox?.icons?.left?.svg?.name !== newBox?.icons?.left?.svg?.name ||
          oldBox?.icons?.right?.svg?.name !== newBox?.icons?.right?.svg?.name
      )
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
      const slideInBox: Box = {
        id: `${newBox.id}-icon-${side}-slide-in`,
        style: { verticalAlign: newBox.style.verticalAlign, hideGridLines: true },
        x: newBox.x,
        y: slideInY,
        width: newBox.width,
        height: newBox.height,
        icons: { [side]: { ...newIcon, clipRect: newBox } },
      };
      const slideOutBox: Box = {
        id: `${newBox.id}-icon-${side}-slide-out`,
        style: { verticalAlign: oldBox.style.verticalAlign, hideGridLines: true },
        x: newBox.x,
        y: slideOutY,
        width: newBox.width,
        height: newBox.height,
        icons: { [side]: { ...oldIcon, clipRect: newBox } },
      };
      animatedBox.icons[side] = makeIconsEmpty(newBox.icons)[side];
      newBoxes.push(slideInBox, slideOutBox);
    };
    animateIconChange("left");
    animateIconChange("right");
    animateIconChange("center");
    return { newBoxes };
  },
});

export const EASING_FN = {
  linear: (t: number) => t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (t -= 1) * t * t + 1,
  easeInOutCubic: (t: number) => ((t /= 0.5) < 1 ? 0.5 * t * t * t : 0.5 * ((t -= 2) * t * t + 2)),
  easeOutQuart: (t: number) => -((t -= 1) * t * t * t - 1),
} as const;

function makeIconsEmpty(icons: Box["icons"]): Box["icons"] {
  return {
    left: icons.left ? { ...icons.left, svg: undefined } : undefined,
    right: icons.right ? { ...icons.right, svg: undefined } : undefined,
    center: icons.center ? { ...icons.center, svg: undefined } : undefined,
  };
}

function addClipRectToIcons(icons: Box["icons"], clipRect: Rect): Box["icons"] {
  return {
    left: icons.left ? { ...icons.left, clipRect } : undefined,
    right: icons.right ? { ...icons.right, clipRect } : undefined,
    center: icons.center ? { ...icons.center, clipRect } : undefined,
  };
}

/**
 *  Check if the icons have appeared, disappeared or changed margin/size/align. Those changes affect where the text is positioned.
 */
function hasIconLayoutChange(
  newBox: RenderingBox | undefined,
  oldBox: RenderingBox | undefined
): boolean {
  const hasLayoutChange = (newIcon: GridIcon | undefined, oldIcon: GridIcon | undefined) => {
    if (oldIcon && newIcon) {
      return !!(
        newIcon.horizontalAlign !== oldIcon.horizontalAlign ||
        newIcon.size !== oldIcon.size ||
        newIcon.margin !== oldIcon.margin ||
        (newIcon.svg && !oldIcon.svg) ||
        (!newIcon.svg && oldIcon.svg)
      );
    }
    return !!((newIcon && !oldIcon) || (!newIcon && oldIcon));
  };
  return (
    hasLayoutChange(newBox?.icons.left, oldBox?.icons.left) ||
    hasLayoutChange(newBox?.icons.right, oldBox?.icons.right) ||
    hasLayoutChange(newBox?.icons.center, oldBox?.icons.center)
  );
}
