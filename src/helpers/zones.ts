import { Zone } from "../types";
import { toCartesian, toXC } from "./coordinates";

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
 * Convert from zone to a cartesian reference
 *
 */
export function zoneToXc(zone: Zone): string {
  const { top, bottom, left, right } = zone;
  const isOneCell = top === bottom && left === right;
  return isOneCell ? toXC(left, top) : `${toXC(left, top)}:${toXC(right, bottom)}`;
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
    right: Math.max(z1.right, z2.right),
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
  if (z1.bottom < z2.top || z2.bottom < z1.top) {
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

/**
 * Recompute the ranges of the zone to contain all the cells in zones, without the cells in toRemoveZones
 * Also regroup zones together to shorten the string
 * (A1, A2, B1, B2, [C1:C2], C3 => [A1:B2],[C1:C3])
 * To do so, the cells are separated and remerged in zones by columns, and then
 * if possible zones in adjacent columns are merged together.
 */
export function recomputeZones(zones: string[], toRemoveZones: string[]): string[] {
  const zonesPerColumn: {
    [col: string]: { top: number; bottom: number; remove: boolean }[];
  } = {};
  //separate the existing zones per column
  for (let z of zones) {
    const zone = toZone(z);
    for (let col = zone.left; col <= zone.right; col++) {
      if (zonesPerColumn[col] === undefined) {
        zonesPerColumn[col] = [];
      }
      zonesPerColumn[col].push({
        top: zone.top,
        bottom: zone.bottom,
        remove: false,
      });
    }
  }

  //separate the to deleted zones per column
  for (let z of toRemoveZones) {
    const zone = toZone(z);
    for (let col = zone.left; col <= zone.right; col++) {
      if (zonesPerColumn[col] === undefined) {
        zonesPerColumn[col] = [];
      }
      zonesPerColumn[col].push({
        top: zone.top,
        bottom: zone.bottom,
        remove: true,
      });
    }
  }
  const OptimizedZonePerColumn: {
    col: number;
    ranges: { top: number; bottom: number }[];
  }[] = [];

  //regroup zones per column
  for (let [col, zones] of Object.entries(zonesPerColumn)) {
    OptimizedZonePerColumn.push({
      col: parseInt(col),
      ranges: optimiseColumn(zones),
    });
  }
  //merge zones that spread over multiple columns that can be merged
  const result = mergeColumns(OptimizedZonePerColumn);
  return result.map(zoneToXc);
}

/**
 * Recompute the ranges of a column, without the remove cells.
 * takes as input a array of {top, bottom, remove} where top and bottom
 * are the start and end of ranges in the column and remove expresses if the
 * cell should be kept or not.
 */
function optimiseColumn(
  zones: { top: number; bottom: number; remove: boolean }[]
): { top: number; bottom: number }[] {
  const toKeep: Set<number> = new Set();
  const toRemove: Set<number> = new Set();

  for (let zone of zones) {
    for (let x = zone.top; x <= zone.bottom; x++) {
      zone.remove ? toRemove.add(x) : toKeep.add(x);
    }
  }
  const finalElements: number[] = [...toKeep]
    .filter((x) => !toRemove.has(x))
    .sort((a, b) => {
      return a - b;
    });
  const newZones: { top: number; bottom: number }[] = [];
  let currentZone: { top: number; bottom: number } | undefined;
  for (let x of finalElements) {
    if (!currentZone) {
      currentZone = { top: x, bottom: x };
    } else if (x === currentZone.bottom + 1) {
      currentZone.bottom = x;
    } else {
      newZones.push({ top: currentZone.top, bottom: currentZone.bottom });
      currentZone = { top: x, bottom: x };
    }
  }
  if (currentZone) {
    newZones.push({ top: currentZone.top, bottom: currentZone.bottom });
  }
  return newZones;
}

/**
 * Verify if ranges in two adjacent columns can be merged in one in one range,
 * and if they can, merge them in the same range.
 */
function mergeColumns(
  zonePerCol: {
    col: number;
    ranges: { top: number; bottom: number }[];
  }[]
) {
  const orderedZones = zonePerCol.sort((a, b) => {
    return a.col - b.col;
  });
  const finalZones: { top: number; left: number; right: number; bottom: number }[] = [];
  let inProgressZones: { top: number; bottom: number; startCol: number }[] = [];
  let currentCol = 0;
  for (let index = 0; index <= orderedZones.length - 1; index++) {
    let newInProgress: { top: number; bottom: number; startCol: number }[] = [];
    if (currentCol + 1 === orderedZones[index].col) {
      for (let z1 of orderedZones[index].ranges) {
        let merged = false;
        for (let z2 of inProgressZones) {
          //extend existing zone with the adjacent col
          if (z1.top == z2.top && z1.bottom == z2.bottom) {
            newInProgress.push(z2);
            merged = true;
          }
        }
        // create new zone as it could not be merged with a previous one
        if (!merged) {
          newInProgress.push({ top: z1.top, bottom: z1.bottom, startCol: orderedZones[index].col });
        }
      }
    } else {
      // create new zone as it was not adjacent to the previous zones
      newInProgress = orderedZones[index].ranges.map((zone) => {
        return {
          top: zone.top,
          bottom: zone.bottom,
          startCol: orderedZones[index].col,
        };
      });
    }

    //All the zones from inProgressZones that are not transferred in newInprogress
    //are zones that were not extended and are therefore final.
    const difference = inProgressZones.filter((x) => !newInProgress.includes(x));
    for (let x of difference) {
      finalZones.push({ top: x.top, bottom: x.bottom, left: x.startCol, right: currentCol });
    }
    currentCol = orderedZones[index].col;
    inProgressZones = newInProgress;
  }
  //after the last iteration, the unfinished zones need to be finalized to.
  for (let x of inProgressZones) {
    finalZones.push({ top: x.top, bottom: x.bottom, left: x.startCol, right: currentCol });
  }

  return finalZones;
}
