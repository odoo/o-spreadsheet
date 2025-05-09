import { Color, HSLA, RGBA } from "../types";

import { concat } from "./misc";

const RBA_REGEX = /rgba?\(|\s+|\)/gi;
const HEX_MATCH = /^#([A-F\d]{2}){3,4}$/;

export const colors = [
  "#eb6d00",
  "#0074d9",
  "#ad8e00",
  "#169ed4",
  "#b10dc9",
  "#00a82d",
  "#00a3a3",
  "#f012be",
  "#3d9970",
  "#111111",
  "#62A300",
  "#ff4136",
  "#949494",
  "#85144b",
  "#001f3f",
];

/*
 * transform a color number (R * 256^2 + G * 256 + B) into classic hex6 value
 * */
export function colorNumberString(color: number): Color {
  return toHex(color.toString(16).padStart(6, "0"));
}

/**
 * Converts any CSS color value to a standardized hex6 value.
 * Accepts: hex3, hex6, hex8, rgb[1] and rgba[1].
 *
 * [1] under the form rgb(r, g, b, a?) or rgba(r, g, b, a?)
 * with r,g,b ∈ [0, 255] and a ∈ [0, 1]
 *
 * toHex("#ABC")
 * >> "#AABBCC"
 *
 * toHex("#AAAFFF")
 * >> "#AAAFFF"
 *
 * toHex("rgb(30, 80, 16)")
 * >> "#1E5010"
 *
 *  * toHex("rgb(30, 80, 16, 0.5)")
 * >> "#1E501080"
 *
 */
export function toHex(color: Color): Color {
  let hexColor = color;
  if (color.startsWith("rgb")) {
    hexColor = rgbaStringToHex(color);
  } else {
    hexColor = color.replace("#", "").toUpperCase();
    if (hexColor.length === 3 || hexColor.length === 4) {
      hexColor = hexColor.split("").reduce((acc, h) => acc + h + h, "");
    }
    hexColor = `#${hexColor}`;
  }
  if (!HEX_MATCH.test(hexColor)) {
    throw new Error(`invalid color input: ${color}`);
  }
  return hexColor;
}

export function isColorValid(color: Color): boolean {
  try {
    toHex(color);
    return true;
  } catch (error) {
    return false;
  }
}

export function isHSLAValid(color: HSLA): boolean {
  try {
    hslaToHex(color);
    return true;
  } catch (error) {
    return false;
  }
}

const isColorValueValid = (v) => v >= 0 && v <= 255;

export function rgba(r: number, g: number, b: number, a: number = 1): RGBA {
  const isInvalid =
    !isColorValueValid(r) || !isColorValueValid(g) || !isColorValueValid(b) || a < 0 || a > 1;
  if (isInvalid) {
    throw new Error(`Invalid RGBA values ${[r, g, b, a]}`);
  }
  return { a, b, g, r };
}

/**
 * The relative brightness of a point in the colorspace, normalized to 0 for
 * darkest black and 1 for lightest white.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function relativeLuminance(color: Color): number {
  let { r, g, b } = colorToRGBA(color);
  r /= 255;
  g /= 255;
  b /= 255;
  const toLinearValue = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const R = toLinearValue(r);
  const G = toLinearValue(g);
  const B = toLinearValue(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Convert a CSS rgb color string to a standardized hex6 color value.
 *
 * rgbaStringToHex("rgb(30, 80, 16)")
 * >> "#1E5010"
 *
 * rgbaStringToHex("rgba(30, 80, 16, 0.5)")
 * >> "#1E501080"
 *
 * DOES NOT SUPPORT NON INTEGER RGB VALUES
 */
function rgbaStringToHex(color: Color): Color {
  const stringVals = color.replace(RBA_REGEX, "").split(",");
  let alphaHex: number = 255;
  if (stringVals.length !== 3 && stringVals.length !== 4) {
    throw new Error("invalid color");
  } else if (stringVals.length === 4) {
    const alpha = parseFloat(stringVals.pop() || "1");
    if (isNaN(alpha)) {
      throw new Error("invalid alpha value");
    }
    alphaHex = Math.round(alpha * 255);
  }
  const vals = stringVals.map((val) => parseInt(val, 10));
  if (alphaHex !== 255) {
    vals.push(alphaHex);
  }
  return "#" + concat(vals.map((value) => value.toString(16).padStart(2, "0"))).toUpperCase();
}

/**
 * RGBA to HEX representation (#RRGGBBAA).
 *
 * https://css-tricks.com/converting-color-spaces-in-javascript/
 */
export function rgbaToHex(rgba: RGBA): Color {
  let r = rgba.r.toString(16);
  let g = rgba.g.toString(16);
  let b = rgba.b.toString(16);
  let a = Math.round(rgba.a * 255).toString(16);

  if (r.length === 1) r = "0" + r;
  if (g.length === 1) g = "0" + g;
  if (b.length === 1) b = "0" + b;
  if (a.length === 1) a = "0" + a;
  if (a === "ff") a = "";

  return ("#" + r + g + b + a).toUpperCase();
}

/**
 * Color string to RGBA representation
 */
export function colorToRGBA(color: Color): RGBA {
  color = toHex(color);
  let r: number;
  let g: number;
  let b: number;
  let a: number;

  if (color.length === 7) {
    r = parseInt(color[1] + color[2], 16);
    g = parseInt(color[3] + color[4], 16);
    b = parseInt(color[5] + color[6], 16);
    a = 255;
  } else if (color.length === 9) {
    r = parseInt(color[1] + color[2], 16);
    g = parseInt(color[3] + color[4], 16);
    b = parseInt(color[5] + color[6], 16);
    a = parseInt(color[7] + color[8], 16);
  } else {
    throw new Error("Invalid color");
  }
  a = +(a / 255).toFixed(3);

  return { a, r, g, b };
}

/**
 * HSLA to RGBA.
 *
 * https://css-tricks.com/converting-color-spaces-in-javascript/
 */
export function hslaToRGBA(hsla: HSLA): RGBA {
  hsla = { ...hsla };
  // Must be fractions of 1
  hsla.s /= 100;
  hsla.l /= 100;

  let c = (1 - Math.abs(2 * hsla.l - 1)) * hsla.s;
  let x = c * (1 - Math.abs(((hsla.h / 60) % 2) - 1));
  let m = hsla.l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= hsla.h && hsla.h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= hsla.h && hsla.h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= hsla.h && hsla.h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= hsla.h && hsla.h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= hsla.h && hsla.h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= hsla.h && hsla.h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return { a: hsla.a, r, g, b };
}

/**
 * HSLA to RGBA.
 *
 * https://css-tricks.com/converting-color-spaces-in-javascript/
 */
export function rgbaToHSLA(rgba: RGBA): HSLA {
  // Make r, g, and b fractions of 1
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;

  // Find greatest and smallest channel values
  let cMin = Math.min(r, g, b);
  let cMax = Math.max(r, g, b);
  let delta = cMax - cMin;
  let h = 0;
  let s = 0;
  let l = 0;

  // Calculate hue
  // No difference
  if (delta === 0) h = 0;
  // Red is max
  else if (cMax === r) h = ((g - b) / delta) % 6;
  // Green is max
  else if (cMax === g) h = (b - r) / delta + 2;
  // Blue is max
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  // Make negative hues positive behind 360°
  if (h < 0) h += 360;

  l = (cMax + cMin) / 2;

  // Calculate saturation
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  // Multiply l and s by 100
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { a: rgba.a, h, s, l };
}

export function hslaToHex(hsla: HSLA): Color {
  return rgbaToHex(hslaToRGBA(hsla));
}

export function hexToHSLA(hex: Color): HSLA {
  return rgbaToHSLA(colorToRGBA(hex));
}

/**
 * Will compare two color strings
 * A tolerance can be provided to account for small differences that could
 * be introduced by non-bijective transformations between color spaces.
 *
 * E.g. HSV <-> RGB is not a bijection
 *
 * Note that the tolerance is applied on the euclidean distance between
 * the two **normalized** color values.
 */
export function isSameColor(color1: Color, color2: Color, tolerance: number = 0): boolean {
  if (!(isColorValid(color1) && isColorValid(color2))) {
    return false;
  }

  const rgb1 = colorToRGBA(color1);
  const rgb2 = colorToRGBA(color2);

  // alpha cannot differ as it is not impacted by transformations
  if (rgb1.a !== rgb2.a) {
    return false;
  }

  const diff = Math.sqrt(
    ((rgb1.r - rgb2.r) / 255) ** 2 + ((rgb1.g - rgb2.g) / 255) ** 2 + ((rgb1.b - rgb2.b) / 255) ** 2
  );
  return diff <= tolerance;
}

export function setColorAlpha(color: Color, alpha: number): string {
  return alpha === 1 ? toHex(color).slice(0, 7) : rgbaToHex({ ...colorToRGBA(color), a: alpha });
}

export function lightenColor(color: Color, percentage: number): Color {
  const hsla = hexToHSLA(color);
  if (percentage === 1) {
    return "#fff";
  }
  hsla.l = percentage * (100 - hsla.l) + hsla.l;
  return hslaToHex(hsla);
}

export function darkenColor(color: Color, percentage: number): Color {
  const hsla = hexToHSLA(color);
  if (percentage === 1) {
    return "#000";
  }
  hsla.l = hsla.l - percentage * hsla.l;
  return hslaToHex(hsla);
}

const COLORS_SM = [
  "#4EA7F2", // Blue
  "#EA6175", // Red
  "#43C5B1", // Teal
  "#F4A261", // Orange
  "#8481DD", // Purple
  "#FFD86D", // Yellow
];
const COLORS_MD = [
  "#4EA7F2", // Blue #1
  "#3188E6", // Blue #2
  "#43C5B1", // Teal #1
  "#00A78D", // Teal #2
  "#EA6175", // Red #1
  "#CE4257", // Red #2
  "#F4A261", // Orange #1
  "#F48935", // Orange #2
  "#8481DD", // Purple #1
  "#5752D1", // Purple #2
  "#FFD86D", // Yellow #1
  "#FFBC2C", // Yellow #2
];
const COLORS_LG = [
  "#4EA7F2", // Blue #1
  "#3188E6", // Blue #2
  "#056BD9", // Blue #3
  "#A76DBC", // Violet #1
  "#7F4295", // Violet #2
  "#6D2387", // Violet #3
  "#EA6175", // Red #1
  "#CE4257", // Red #2
  "#982738", // Red #3
  "#43C5B1", // Teal #1
  "#00A78D", // Teal #2
  "#0E8270", // Teal #3
  "#F4A261", // Orange #1
  "#F48935", // Orange #2
  "#BE5D10", // Orange #3
  "#8481DD", // Purple #1
  "#5752D1", // Purple #2
  "#3A3580", // Purple #3
  "#A4A8B6", // Gray #1
  "#7E8290", // Gray #2
  "#545B70", // Gray #3
  "#FFD86D", // Yellow #1
  "#FFBC2C", // Yellow #2
  "#C08A16", // Yellow #3
];
const COLORS_XL = [
  "#4EA7F2", // Blue #1
  "#3188E6", // Blue #2
  "#056BD9", // Blue #3
  "#155193", // Blue #4
  "#A76DBC", // Violet #1
  "#7F4295", // Violet #1
  "#6D2387", // Violet #1
  "#4F1565", // Violet #1
  "#EA6175", // Red #1
  "#CE4257", // Red #2
  "#982738", // Red #3
  "#791B29", // Red #4
  "#43C5B1", // Teal #1
  "#00A78D", // Teal #2
  "#0E8270", // Teal #3
  "#105F53", // Teal #4
  "#F4A261", // Orange #1
  "#F48935", // Orange #2
  "#BE5D10", // Orange #3
  "#7D380D", // Orange #4
  "#8481DD", // Purple #1
  "#5752D1", // Purple #2
  "#3A3580", // Purple #3
  "#26235F", // Purple #4
  "#A4A8B6", // Grey #1
  "#7E8290", // Grey #2
  "#545B70", // Grey #3
  "#3F4250", // Grey #4
  "#FFD86D", // Yellow #1
  "#FFBC2C", // Yellow #2
  "#C08A16", // Yellow #3
  "#936A12", // Yellow #4
];

export function getNthColor(index: number, palette: Color[]): Color {
  return palette[index % palette.length];
}

export function getColorsPalette(quantity: number) {
  if (quantity <= 6) {
    return COLORS_SM;
  } else if (quantity <= 12) {
    return COLORS_MD;
  } else if (quantity <= 24) {
    return COLORS_LG;
  } else {
    return COLORS_XL;
  }
}

export class ColorGenerator {
  private currentColorIndex = 0;
  private palette: Color[];

  constructor(paletteSize: number, private preferredColors: (string | undefined)[] = []) {
    this.palette = getColorsPalette(paletteSize).filter((c) => !preferredColors.includes(c));
  }

  next(): string {
    return this.preferredColors?.[this.currentColorIndex]
      ? this.preferredColors[this.currentColorIndex++]!
      : getNthColor(this.currentColorIndex++, this.palette);
  }
}
