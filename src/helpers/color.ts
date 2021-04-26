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
 * transform a color number (R * 256^2 + G * 256 + B) into classic RGB
 * */
export function colorNumberString(color: number): string {
  return color.toString(16).padStart(6, "0");
}

let colorIndex = 0;
export function getNextColor() {
  colorIndex = ++colorIndex % colors.length;
  return colors[colorIndex];
}

/**
 * Converts any CSS color value to a standardized hex6 value.
 * Accepts: hex3, hex6 and rgb (rgba is not supported)
 *
 * toHex6("#ABC")
 * >> "AABBCC"
 *
 * toHex6("#AAAFFF")
 * >> "AAAFFF"
 *
 * toHex6("rgb(30, 80, 16)")
 * >> "1E5010"
 *
 * (note: number sign is dropped as it is not supported in xlsx format)
 */
export function toHex6(color: string): string {
  if (color.includes("rgb")) {
    return rgbToHex6(color);
  }
  color = color.replace("#", "").toUpperCase();
  if (color.length === 3) {
    color = color.split("").reduce((acc, h) => acc + h + h, "");
  }
  return color;
}

/**
 * Convert a CSS rgb color string to a standardized hex6 color value.
 *
 * rgbToHex6("rgb(30, 80, 16)")
 * >> "1E5010"
 */
function rgbToHex6(color: string): string {
  return color
    .slice(4, -1)
    .split(",")
    .map((valueString) => parseInt(valueString, 10).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
