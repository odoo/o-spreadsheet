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
