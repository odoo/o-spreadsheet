import { colorToRGBA, hslaToRGBA, rgbaToHex, rgbaToHSLA } from "../../helpers";
import type { Color } from "../../types";
import type { XLSXColor } from "../../types/xlsx";
import { AUTO_COLOR } from "../constants";
import { XLSX_INDEXED_COLORS } from "./conversion_maps";

/**
 * Most of the functions could stay private, but are exported for testing purposes
 */

/**
 *
 * Extract the color referenced inside of an XML element and return it as an hex string #RRGGBBAA (or #RRGGBB
 * if alpha = FF)
 *
 *  The color is an attribute of the element that can be :
 *  - rgb : an rgb string
 *  - theme : a reference to a theme element
 *  - auto : automatic coloring. Return const AUTO_COLOR in constants.ts.
 *  - indexed : a legacy indexing scheme for colors. The only value that should be present in a xlsx is
 *      64 = System Foreground, that we can replace with AUTO_COLOR.
 */
export function convertColor(xlsxColor: XLSXColor | undefined): Color | undefined {
  if (!xlsxColor) {
    return undefined;
  }
  let rgb: string;
  if (xlsxColor.rgb) {
    rgb = xlsxColor.rgb;
  } else if (xlsxColor.auto) {
    rgb = AUTO_COLOR;
  } else if (xlsxColor.indexed) {
    rgb = XLSX_INDEXED_COLORS[xlsxColor.indexed];
  } else {
    return undefined;
  }

  rgb = xlsxColorToHEXA(rgb);

  if (xlsxColor.tint) {
    rgb = applyTint(rgb, xlsxColor.tint);
  }
  rgb = rgb.toUpperCase();

  // Remove unnecessary alpha
  if (rgb.length === 9 && rgb.endsWith("FF")) {
    rgb = rgb.slice(0, 7);
  }
  return rgb;
}

/**
 * Convert a hex color AARRGGBB (or RRGGBB)(representation inside XLSX Xmls) to a standard js color
 * representation #RRGGBBAA
 */
function xlsxColorToHEXA(color: Color): Color {
  if (color.length === 6) return "#" + color + "FF";
  return "#" + color.slice(2) + color.slice(0, 2);
}

/**
 *  Apply tint to a color (see OpenXml spec §18.3.1.15);
 */
function applyTint(color: Color, tint: number): Color {
  const rgba = colorToRGBA(color);
  const hsla = rgbaToHSLA(rgba);

  if (tint < 0) {
    hsla.l = hsla.l * (1 + tint);
  }
  if (tint > 0) {
    hsla.l = hsla.l * (1 - tint) + (100 - 100 * (1 - tint));
  }

  return rgbaToHex(hslaToRGBA(hsla));
}

/**
 * Convert a hex + alpha color string to an integer representation. Also remove the alpha.
 *
 * eg. #FF0000FF => 4278190335
 */
export function hexaToInt(hex: Color) {
  if (hex.length === 9) {
    hex = hex.slice(0, 7);
  }
  return parseInt(hex.replace("#", ""), 16);
}
