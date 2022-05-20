import { toHex } from "../../helpers";
import { Color } from "../../types";
import { XlsxHexColor } from "../../types/xlsx";

/**
 * Convert a color string to an excel compatible hexadecimal format.
 */
export function toXlsxHexColor(color: Color): XlsxHexColor {
  color = toHex(color).replace("#", "");
  // alpha channel goes first
  if (color.length === 8) {
    return color.slice(6) + color.slice(0, 6);
  }
  return color;
}
