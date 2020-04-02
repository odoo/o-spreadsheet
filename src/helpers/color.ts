/*
 * transform a color number (R * 256^2 + G * 256 + B) into classic RGB
 * */
export function colorNumberString(color: number): string {
  return color.toString(16).padStart(6, "0");
}
