import { _lt } from "../translation";
import { Position, UnboundedZone, Zone, ZoneDimension } from "../types";
import { lettersToNumber, numberToLetters, toCartesian, toXC } from "./coordinates";
import { range } from "./misc";
import { isColReference, isRowReference } from "./references";

/**
 * Convert from a cartesian reference to a Zone
 * The range boundaries will be kept in the same order as the
 * ones in the text.
 * Examples:
 *    "A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "B1:B3" ==> Top 0, Bottom 3, Left: 1, Right: 1
 *    "Sheet1!A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "Sheet1!B1:B3" ==> Top 0, Bottom 3, Left: 1, Right: 1
 *    "C3:A1" ==> Top 2, Bottom 0, Left 2, Right 0
 *    "A:A" ==> Top 0, Bottom undefined, Left 0, Right 0
 *    "A:B3" or "B3:A" ==> Top 2, Bottom undefined, Left 0, Right 1
 *
 * @param xc the string reference to convert
 *
 */
export function toZoneWithoutBoundaryChanges(xc: string): UnboundedZone {
  xc = xc.split("!").pop()!;
  const ranges = xc
    .replace(/\$/g, "")
    .split(":")
    .map((x) => x.trim());

  let top: number, bottom: number, left: number, right: number;
  let fullCol = false;
  let fullRow = false;
  let hasHeader = false;
  const firstRangePart = ranges[0];
  const secondRangePart = ranges[1] && ranges[1];

  if (isColReference(firstRangePart)) {
    left = right = lettersToNumber(firstRangePart);
    top = bottom = 0;
    fullCol = true;
  } else if (isRowReference(firstRangePart)) {
    top = bottom = parseInt(firstRangePart, 10) - 1;
    left = right = 0;
    fullRow = true;
  } else {
    const c = toCartesian(firstRangePart);
    left = right = c.col;
    top = bottom = c.row;
    hasHeader = true;
  }
  if (ranges.length === 2) {
    if (isColReference(secondRangePart)) {
      right = lettersToNumber(secondRangePart);
      fullCol = true;
    } else if (isRowReference(secondRangePart)) {
      bottom = parseInt(secondRangePart, 10) - 1;
      fullRow = true;
    } else {
      const c = toCartesian(secondRangePart);
      right = c.col;
      bottom = c.row;
      top = fullCol ? bottom : top;
      left = fullRow ? right : left;
      hasHeader = true;
    }
  }

  if (fullCol && fullRow) {
    throw new Error(
      "Wrong zone xc. The zone cannot be at the same time a full column and a full row"
    );
  }

  const zone: UnboundedZone = {
    top,
    left,
    bottom: fullCol ? undefined : bottom,
    right: fullRow ? undefined : right,
  };

  hasHeader = hasHeader && (fullRow || fullCol);
  if (hasHeader) {
    zone.hasHeader = hasHeader;
  }

  return zone;
}

/**
 * Convert from a cartesian reference to a (possibly unbounded) Zone
 *
 * Examples:
 *    "A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "B1:B3" ==> Top 0, Bottom 3, Left: 1, Right: 1
 *    "B:B" ==> Top 0, Bottom undefined, Left: 1, Right: 1
 *    "B2:B" ==> Top 1, Bottom undefined, Left: 1, Right: 1, hasHeader: 1
 *    "Sheet1!A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "Sheet1!B1:B3" ==> Top 0, Bottom 3, Left: 1, Right: 1
 *
 * @param xc the string reference to convert
 *
 */
export function toUnboundedZone(xc: string): UnboundedZone {
  const zone = toZoneWithoutBoundaryChanges(xc);
  if (zone.right !== undefined && zone.right < zone.left) {
    const tmp = zone.left;
    zone.left = zone.right;
    zone.right = tmp;
  }
  if (zone.bottom !== undefined && zone.bottom < zone.top) {
    const tmp = zone.top;
    zone.top = zone.bottom;
    zone.bottom = tmp;
  }
  return zone;
}

/**
 * Convert from a cartesian reference to a Zone.
 * Will return throw an error if given a unbounded zone (eg : A:A).
 *
 * Examples:
 *    "A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "B1:B3" ==> Top 0, Bottom 3, Left: 1, Right: 1
 *    "Sheet1!A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "Sheet1!B1:B3" ==> Top 0, Bottom 3, Left: 1, Right: 1
 *
 * @param xc the string reference to convert
 *
 */
export function toZone(xc: string): Zone {
  const zone = toUnboundedZone(xc);
  if (zone.bottom === undefined || zone.right === undefined) {
    throw new Error("This does not support unbounded ranges");
  }
  return zone as Zone;
}

export function isXcValid(xc: string): boolean {
  const zone = toUnboundedZone(xc);
  return isZoneValid(zone);
}

/**
 * Check that the zone has valid coordinates and in
 * the correct order.
 */
export function isZoneValid(zone: Zone | UnboundedZone): boolean {
  // Typescript *should* prevent this kind of errors but
  // it's better to be on the safe side at runtime as well.
  const { bottom, top, left, right } = zone;
  if (
    (bottom !== undefined && isNaN(bottom)) ||
    isNaN(top) ||
    isNaN(left) ||
    (right !== undefined && isNaN(right))
  ) {
    return false;
  }
  return (
    (zone.bottom === undefined || (zone.bottom >= zone.top && zone.bottom >= 0)) &&
    (zone.right === undefined || (zone.right >= zone.left && zone.right >= 0)) &&
    zone.top >= 0 &&
    zone.left >= 0
  );
}

/**
 * Convert from zone to a cartesian reference
 *
 */
export function zoneToXc(zone: Zone | UnboundedZone): string {
  const { top, bottom, left, right } = zone;
  const hasHeader = "hasHeader" in zone ? zone.hasHeader : false;
  const isOneCell = top === bottom && left === right;
  if (bottom === undefined && right !== undefined) {
    return top === 0 && !hasHeader
      ? `${numberToLetters(left)}:${numberToLetters(right)}`
      : `${toXC(left, top)}:${numberToLetters(right)}`;
  } else if (right === undefined && bottom !== undefined) {
    return left === 0 && !hasHeader
      ? `${top + 1}:${bottom + 1}`
      : `${toXC(left, top)}:${bottom + 1}`;
  } else if (bottom !== undefined && right !== undefined) {
    return isOneCell ? toXC(left, top) : `${toXC(left, top)}:${toXC(right, bottom)}`;
  }

  throw new Error(_lt("Bad zone format"));
}

/**
 * Expand a zone after inserting columns or rows.
 */
export function expandZoneOnInsertion<Z extends UnboundedZone | Zone>(
  zone: Z,
  start: "left" | "top",
  base: number,
  position: "after" | "before",
  quantity: number
): Z {
  const dimension = start === "left" ? "columns" : "rows";
  const baseElement = position === "before" ? base - 1 : base;
  const end = start === "left" ? "right" : "bottom";
  const zoneEnd = zone[end];
  let shouldIncludeEnd = false;
  if (zoneEnd) {
    shouldIncludeEnd = position === "before" ? zoneEnd > baseElement : zoneEnd >= baseElement;
  }
  if (zone[start] <= baseElement && shouldIncludeEnd) {
    return createAdaptedZone(zone, dimension, "RESIZE", quantity);
  }
  if (baseElement < zone[start]) {
    return createAdaptedZone(zone, dimension, "MOVE", quantity);
  }
  return { ...zone };
}

/**
 * Update the selection after column/row addition
 */
export function updateSelectionOnInsertion(
  selection: Zone,
  start: "left" | "top",
  base: number,
  position: "after" | "before",
  quantity: number
): Zone {
  const dimension = start === "left" ? "columns" : "rows";
  const baseElement = position === "before" ? base - 1 : base;
  const end = start === "left" ? "right" : "bottom";

  if (selection[start] <= baseElement && selection[end] > baseElement) {
    return createAdaptedZone(selection, dimension, "RESIZE", quantity);
  }
  if (baseElement < selection[start]) {
    return createAdaptedZone(selection, dimension, "MOVE", quantity);
  }
  return { ...selection };
}

/**
 * Update the selection after column/row deletion
 */
export function updateSelectionOnDeletion(
  zone: Zone,
  start: "left" | "top",
  elements: number[]
): Zone {
  const end = start === "left" ? "right" : "bottom";
  let newStart = zone[start];
  let newEnd = zone[end];
  for (let removedElement of elements.sort((a, b) => b - a)) {
    if (zone[start] > removedElement) {
      newStart--;
      newEnd--;
    }
    if (zone[start] < removedElement && zone[end] >= removedElement) {
      newEnd--;
    }
  }
  return { ...zone, [start]: newStart, [end]: newEnd };
}

/**
 * Reduce a zone after deletion of elements
 */
export function reduceZoneOnDeletion<Z extends UnboundedZone | Zone>(
  zone: Z,
  start: "left" | "top",
  elements: number[]
): Z | undefined {
  const end = start === "left" ? "right" : "bottom";
  let newStart = zone[start];
  let newEnd = zone[end];
  const zoneEnd = zone[end];
  for (let removedElement of elements.sort((a, b) => b - a)) {
    if (zone[start] > removedElement) {
      newStart--;
      if (newEnd !== undefined) newEnd--;
    }
    if (
      zoneEnd !== undefined &&
      newEnd !== undefined &&
      zone[start] <= removedElement &&
      zoneEnd >= removedElement
    ) {
      newEnd--;
    }
  }
  if (newEnd !== undefined && newStart > newEnd) {
    return undefined;
  }
  return { ...zone, [start]: newStart, [end]: newEnd };
}

/**
 * Compute the union of multiple zones.
 */
export function union(...zones: Zone[]): Zone {
  return {
    top: Math.min(...zones.map((zone) => zone.top)),
    left: Math.min(...zones.map((zone) => zone.left)),
    bottom: Math.max(...zones.map((zone) => zone.bottom)),
    right: Math.max(...zones.map((zone) => zone.right)),
  };
}

/**
 * Compute the intersection of two zones. Returns nothing if the two zones don't overlap
 */
export function intersection(z1: Zone, z2: Zone): Zone | undefined {
  if (!overlap(z1, z2)) {
    return undefined;
  }
  return {
    top: Math.max(z1.top, z2.top),
    left: Math.max(z1.left, z2.left),
    bottom: Math.min(z1.bottom, z2.bottom),
    right: Math.min(z1.right, z2.right),
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
 * Check if a zone is inside another
 */
export function isZoneInside(smallZone: Zone, biggerZone: Zone): boolean {
  return isEqual(union(biggerZone, smallZone), biggerZone);
}

/**
 * Recompute the ranges of the zone to contain all the cells in zones, without the cells in toRemoveZones
 * Also regroup zones together to shorten the string
 * (A1, A2, B1, B2, [C1:C2], C3 => [A1:B2],[C1:C3])
 * To do so, the cells are separated and remerged in zones by columns, and then
 * if possible zones in adjacent columns are merged together.
 */
export function recomputeZones(zonesXc: string[], toRemoveZonesXc: string[]): string[] {
  const zonesPerColumn: {
    [col: string]: { top: number; bottom: number; remove: boolean }[];
  } = {};
  const zones = zonesXc.map(toUnboundedZone);
  const toRemoveZones = toRemoveZonesXc.map(toUnboundedZone);

  // Compute the max to replace the bottom of full columns and right of full rows by something
  // bigger than any other col/row to be able to apply the algorithm while keeping tracks of what
  // zones are full cols/rows
  const maxBottom = Math.max(
    ...zones.concat(toRemoveZones).map((zone) => (zone.bottom ? zone.bottom : 0))
  );
  const maxRight = Math.max(
    ...zones.concat(toRemoveZones).map((zone) => (zone.right ? zone.right : 0))
  );

  //separate the existing zones per column
  for (let zone of zones) {
    if (zone) {
      if (zone.right === undefined) {
        zone.right = maxRight + 1;
      }
      for (let col = zone.left; col <= zone.right; col++) {
        if (zonesPerColumn[col] === undefined) {
          zonesPerColumn[col] = [];
        }
        zonesPerColumn[col].push({
          top: zone.top,
          bottom: zone.bottom === undefined ? maxBottom + 1 : zone.bottom,
          remove: false,
        });
      }
    }
  }

  //separate the to deleted zones per column
  for (let zone of toRemoveZones) {
    if (zone.right === undefined) {
      zone.right = maxRight + 1;
    }
    for (let col = zone.left; col <= zone.right; col++) {
      if (zonesPerColumn[col] === undefined) {
        zonesPerColumn[col] = [];
      }
      zonesPerColumn[col].push({
        top: zone.top,
        bottom: zone.bottom === undefined ? maxBottom + 1 : zone.bottom,
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

  // Convert back the full columns/full rows
  const resultZones = result.map((zone) => {
    if (zone.bottom > maxBottom) {
      return { ...zone, bottom: undefined } as UnboundedZone;
    }
    if (zone.right > maxRight) {
      return { ...zone, right: undefined } as UnboundedZone;
    }
    return zone as Zone;
  });
  return resultZones.map(zoneToXc);
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

    //All the zones from inProgressZones that are not transferred in newInProgress
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

export function zoneToDimension(zone: Zone): ZoneDimension {
  return {
    height: zone.bottom - zone.top + 1,
    width: zone.right - zone.left + 1,
  };
}

export function isOneDimensional(zone: Zone): boolean {
  const { width, height } = zoneToDimension(zone);
  return width === 1 || height === 1;
}

/**
 * Array of all positions in the zone.
 */
export function positions(zone: Zone): Position[] {
  const positions: Position[] = [];
  const [left, right] = [zone.right, zone.left].sort((a, b) => a - b);
  const [top, bottom] = [zone.top, zone.bottom].sort((a, b) => a - b);
  for (const col of range(left, right + 1)) {
    for (const row of range(top, bottom + 1)) {
      positions.push({ col, row });
    }
  }
  return positions;
}

/**
 * This function returns a zone with coordinates modified according to the change
 * applied to the zone. It may be possible to change the zone by resizing or moving
 * it according to different dimensions.
 *
 * @param zone the zone to modify
 * @param dimension the direction to change the zone among "columns", "rows" and
 * "both"
 * @param operation how to change the zone, modify its size "RESIZE" or modify
 * its location "MOVE"
 * @param by a number of how many units the change should be made. This parameter
 * takes the form of a two-number array when the dimension is "both"
 */
export function createAdaptedZone<
  Dimension extends "columns" | "rows" | "both",
  Z extends UnboundedZone | Zone
>(
  zone: Z,
  dimension: Dimension,
  operation: "MOVE" | "RESIZE",
  by: Dimension extends "both" ? [number, number] : number
): Z {
  const offsetX = dimension === "both" ? by[0] : dimension === "columns" ? by : 0;
  const offsetY = dimension === "both" ? by[1] : dimension === "rows" ? by : 0;

  // For full columns/rows, we have to make the distinction between the one that have a header and
  // whose start should be moved (eg. A2:A), and those who don't (eg. A:A)
  // The only time we don't want to move the start of the zone is if the zone is a full column (or a full row)
  // without header and that we are adding/removing a row (or a column)
  const hasHeader = "hasHeader" in zone ? zone.hasHeader : false;
  let shouldStartBeMoved: boolean;
  if (isFullCol(zone) && !hasHeader) {
    shouldStartBeMoved = dimension !== "rows";
  } else if (isFullRow(zone) && !hasHeader) {
    shouldStartBeMoved = dimension !== "columns";
  } else {
    shouldStartBeMoved = true;
  }

  const newZone = { ...zone };
  if (shouldStartBeMoved && operation === "MOVE") {
    newZone["left"] += offsetX;
    newZone["top"] += offsetY;
  }
  if (newZone["right"] !== undefined) {
    newZone["right"] += offsetX;
  }
  if (newZone["bottom"] !== undefined) {
    newZone["bottom"] += offsetY;
  }
  return newZone;
}

/**
 * Returns a Zone array with unique occurrence of each zone.
 * For each multiple occurrence, the occurrence with the largest index is kept.
 * This allows to always have the last selection made in the last position.
 * */
export function uniqueZones(zones: Zone[]): Zone[] {
  return zones
    .reverse()
    .filter(
      (zone, index, self) =>
        index ===
        self.findIndex(
          (z) =>
            z.top === zone.top &&
            z.bottom === zone.bottom &&
            z.left === zone.left &&
            z.right === zone.right
        )
    )
    .reverse();
}

/**
 * This function will find all overlapping zones in an array and transform them
 * into an union of each one.
 * */
export function mergeOverlappingZones(zones: Zone[]) {
  return zones.reduce((dissociatedZones: Zone[], zone) => {
    const nextIndex = dissociatedZones.length;
    for (let i = 0; i < nextIndex; i++) {
      if (overlap(dissociatedZones[i], zone)) {
        dissociatedZones[i] = union(dissociatedZones[i], zone);
        return dissociatedZones;
      }
    }
    dissociatedZones[nextIndex] = zone;
    return dissociatedZones;
  }, []);
}

/**
 * This function will compare the modifications of selection to determine
 * a cell that is part of the new zone and not the previous one.
 */
export function findCellInNewZone(oldZone: Zone, currentZone: Zone): Position {
  let col: number, row: number;
  const { left: oldLeft, right: oldRight, top: oldTop, bottom: oldBottom } = oldZone!;
  const { left, right, top, bottom } = currentZone;
  if (left != oldLeft) {
    col = left;
  } else if (right != oldRight) {
    col = right;
  } else {
    col = left;
  }
  if (top != oldTop) {
    row = top;
  } else if (bottom != oldBottom) {
    row = bottom;
  } else {
    row = top;
  }
  return { col, row };
}

export function organizeZone(zone: Zone): Zone {
  return {
    top: Math.min(zone.top, zone.bottom),
    bottom: Math.max(zone.top, zone.bottom),
    left: Math.min(zone.left, zone.right),
    right: Math.max(zone.left, zone.right),
  };
}

export function positionToZone(position: Position) {
  return { left: position.col, right: position.col, top: position.row, bottom: position.row };
}

export function isFullRow(zone: UnboundedZone): boolean {
  return zone.right === undefined;
}

function isFullCol(zone: UnboundedZone): boolean {
  return zone.bottom === undefined;
}

export function getZoneArea(zone: Zone) {
  return (zone.bottom - zone.top + 1) * (zone.right - zone.left + 1);
}
