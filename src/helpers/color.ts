export const colors = [
  "#ff851b",
  "#0074d9",
  "#ffdc00",
  "#7fdbff",
  "#b10dc9",
  "#0ecc40",
  "#39cccc",
  "#f012be",
  "#3d9970",
  "#111111",
  "#01ff70",
  "#ff4136",
  "#aaaaaa",
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

/*
* add opacity based on the alpha value to the hex color
*/
export function AddOpacityToColor(color: string | null, alpha: number): string {
  const x = Math.floor(alpha * 255);
  const a = (x < 16) ? '0' + x.toString(16) : x.toString(16);
  return color + a;
}
