import { toHex } from "../../helpers";
import { Color } from "../../types";
import { XlsxHexColor } from "../../types/xlsx";

/**
 * Convert a JS color hexadecimal to an excel compatible color.
 *
 * In Excel the color don't start with a '#' and the format is AARRGGBB instead of RRGGBBAA
 */
export function toXlsxHexColor(color: Color): XlsxHexColor {
  color = toHex(color).replace("#", "");
  // alpha channel goes first
  if (color.length === 8) {
    return color.slice(6) + color.slice(0, 6);
  }
  return color;
}
