// Be aware that this is just a type import! This file should not depend on
// other files, to avoid circular dependencies.
import { Zone } from "./grid_model";

/**
 *  0 => 'A', 25 => 'Z', 26 => 'AA', 27 => 'AB', ...
 */
export function numberToLetters(n: number): string {
  if (n < 26) {
    return String.fromCharCode(65 + n);
  } else {
    return numberToLetters(Math.floor(n / 26) - 1) + numberToLetters(n % 26);
  }
}

/**
 * 'A' => 0, 'Z' => 25, 'AA' => 26, ...
 */
function lettersToNumber(letters: string): number {
  let result = 0;
  const l = letters.length;
  for (let i = 0; i < l; i++) {
    let n = letters.charCodeAt(i) - 65 + (i < l - 1 ? 1 : 0);
    result += n * 26 ** (l - i - 1);
  }
  return result;
}

/**
 *  A1 => [0,0], B3 => [1,2], ...
 *
 * Note: also accepts lowercase coordinates
 */
export function toCartesian(cell: string): [number, number] {
  cell = cell.toUpperCase();
  const [m, letters, numbers] = cell.match(/([A-Z]*)([0-9]*)/)!;
  if (m !== cell) {
    throw new Error("Invalid cell description");
  }
  const col = lettersToNumber(letters);
  const row = parseInt(numbers, 10) - 1;
  return [col, row];
}

/**
 * Convert from cartesian coordinate to xc coordinate system.
 */
export function toXC(col: number, row: number): string {
  return numberToLetters(col) + String(row + 1);
}

export function zoneToXC(zone: Zone): string {
  const topLeft = toXC(zone.left, zone.top);
  const botRight = toXC(zone.right, zone.bottom);

  if (topLeft != botRight) {
    return topLeft + ":" + botRight;
  }

  return topLeft;
}

/**
 * Stringify an object, like JSON.stringify, except that the first level of keys
 * is ordered.
 */
export function stringify(obj): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Compute the union of two zones. It is the smallest zone which contains the
 * two arguments.
 */
export function union(z1: Zone, z2: Zone): Zone {
  return {
    top: Math.min(z1.top, z2.top),
    left: Math.min(z1.left, z2.left),
    bottom: Math.max(z1.bottom, z2.bottom),
    right: Math.max(z1.right, z2.right)
  };
}

/**
 * Two zones are equal if they represent the same area, so we clearly cannot use
 * reference equality.
 */
export function isEqual(z1: Zone, z2: Zone): boolean {
  return (
    z1.left === z2.left && z1.right === z2.right && z1.top === z2.top && z1.bottom === z2.bottom
  );
}
