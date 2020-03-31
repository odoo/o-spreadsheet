import { Zone } from "../types";
import { toCartesian } from "./coordinates";

/**
 * Convert from a cartesian reference to a Zone
 *
 * Examples:
 *    "A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "B1:B3" ==> Top 0, Bottom 3, Left: 1, Right: 1
 *
 *  TODO VSC: Support 'Sheet!' reference
 */
export function toZone(xc: string): Zone {
  const ranges = xc.replace("$", "").split(":");
  let top: number, bottom: number, left: number, right: number;

  let c = toCartesian(ranges[0].trim());
  left = right = c[0];
  top = bottom = c[1];
  if (ranges.length === 2) {
    let d = toCartesian(ranges[1].trim());
    right = d[0];
    bottom = d[1];
    if (right < left) {
      [right, left] = [left, right];
    }
    if (bottom < top) {
      [bottom, top] = [top, bottom];
    }
  }

  return { top, bottom, left, right };
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

/**
 * Return true if two zones overlap, false otherwise.
 */
export function overlap(z1: Zone, z2: Zone): boolean {
  if (z1.bottom < z2.top || z2.bottom < z2.top) {
    return false;
  }
  if (z1.right < z2.left || z2.right < z1.left) {
    return false;
  }
  return true;
}

export function isInside(col: number, row: number, zone: Zone): boolean {
  const { left, right, top, bottom } = zone;
  return col >= left && col <= right && row >= top && row <= bottom;
}
