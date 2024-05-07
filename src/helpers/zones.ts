import { _t } from "../translation";
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
  if (xc.includes("!")) {
    xc = xc.split("!").at(-1)!;
  }
  if (xc.includes("$")) {
    xc = xc.replaceAll("$", "");
  }
  let firstRangePart: string = "";
  let secondRangePart: string | undefined;
  if (xc.includes(":")) {
    [firstRangePart, secondRangePart] = xc.split(":");
    firstRangePart = firstRangePart.trim();
    secondRangePart = secondRangePart.trim();
  } else {
    firstRangePart = xc.trim();
  }

  let top: number, bottom: number, left: number, right: number;
  let fullCol = false;
  let fullRow = false;
  let hasHeader = false;

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
  if (secondRangePart) {
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
 *    "B1:B3" ==> Top 0, Bottom 2, Left: 1, Right: 1
 *    "Sheet1!A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "Sheet1!B1:B3" ==> Top 0, Bottom 2, Left: 1, Right: 1
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
  return isZoneOrdered(zone) && zone.top >= 0 && zone.left >= 0;
}

/**
 * Check that the zone properties are in the correct order.
 */
export function isZoneOrdered(zone: Zone | UnboundedZone): boolean {
  return (
    (zone.bottom === undefined || (zone.bottom >= zone.top && zone.bottom >= 0)) &&
    (zone.right === undefined || (zone.right >= zone.left && zone.right >= 0))
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

  throw new Error(_t("Bad zone format"));
}

/**
 * Expand a zone after inserting columns or rows.
 *
 * Don't resize the zone if a col/row was added right before/after the row but only move the zone.
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

  if (zone[start] <= baseElement && zoneEnd && zoneEnd > baseElement) {
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
 * Compute the union of multiple unbounded zones.
 */
export function unionUnboundedZones(...zones: UnboundedZone[]): UnboundedZone {
  return {
    top: Math.min(...zones.map((zone) => zone.top)),
    left: Math.min(...zones.map((zone) => zone.left)),
    bottom: zones.some((zone) => zone.bottom === undefined)
      ? undefined
      : Math.max(...zones.map((zone) => zone.bottom!)),
    right: zones.some((zone) => zone.right === undefined)
      ? undefined
      : Math.max(...zones.map((zone) => zone.right!)),
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
 */
export function recomputeZones(zonesXc: string[], toRemoveZonesXc: string[]): string[] {
  const zones = zonesXc.map(toUnboundedZone);
  const zonesToRemove = toRemoveZonesXc.map(toUnboundedZone);
  // Compute the max to replace the bottom of full columns and right of full rows by something
  // bigger than any other col/row to be able to apply the algorithm while keeping tracks of what
  // zones are full cols/rows
  const maxBottom = Math.max(...zones.concat(zonesToRemove).map((zone) => zone.bottom || 0));
  const maxRight = Math.max(...zones.concat(zonesToRemove).map((zone) => zone.right || 0));
  const expandedZones = zones.map((zone) => ({
    ...zone,
    bottom: zone.bottom === undefined ? maxBottom + 1 : zone.bottom,
    right: zone.right === undefined ? maxRight + 1 : zone.right,
  }));
  const expandedZonesToRemove = zonesToRemove.map((zone) => ({
    ...zone,
    bottom: zone.bottom === undefined ? maxBottom + 1 : zone.bottom,
    right: zone.right === undefined ? maxRight + 1 : zone.right,
  }));

  const zonePositions = expandedZones.map(positions).flat();
  const positionsToRemove = expandedZonesToRemove.map(positions).flat();
  const positionToKeep = positionsDifference(zonePositions, positionsToRemove);
  const columns = mergePositionsIntoColumns(positionToKeep);

  return mergeAlignedColumns(columns)
    .map((zone) => ({
      ...zone,
      bottom: zone.bottom === maxBottom + 1 ? undefined : zone.bottom,
      right: zone.right === maxRight + 1 ? undefined : zone.right,
    }))
    .map(zoneToXc);
}

/**
 * Merge aligned adjacent columns into single zones
 * e.g. A1:A5 and B1:B5 are merged into A1:B5
 */
export function mergeAlignedColumns(columns: readonly Zone[]): Zone[] {
  if (columns.length === 0) {
    return [];
  }
  if (columns.some((zone) => zone.left !== zone.right)) {
    throw new Error("only columns can be merged");
  }
  const done: Zone[] = [];
  const cols = removeRedundantZones(columns);

  const isAdjacentAndAligned = (zone, nextZone) =>
    zone.top === nextZone.top &&
    zone.bottom === nextZone.bottom &&
    zone.right + 1 === nextZone.left;
  while (cols.length) {
    const merged = cols.reduce(
      (zone, nextZone) => (isAdjacentAndAligned(zone, nextZone) ? union(zone, nextZone) : zone),
      cols.shift()!
    );
    done.push(merged);
  }
  return removeRedundantZones(done);
}

/**
 * Remove redundant zones in the list.
 * i.e. zones included in another zone.
 */
function removeRedundantZones(zones: readonly Zone[]): Zone[] {
  const sortedZones = [...zones]
    .sort((a, b) => b.right - a.right)
    .sort((a, b) => b.bottom - a.bottom)
    .sort((a, b) => a.top - b.top)
    .sort((a, b) => a.left - b.left)
    .reverse();
  const checked: Zone[] = [];
  while (sortedZones.length !== 0) {
    const zone = sortedZones.shift()!;
    const isIncludedInOther = sortedZones.some((otherZone) => isZoneInside(zone, otherZone));
    if (!isIncludedInOther) {
      checked.push(zone);
    }
  }
  return checked.reverse();
}

/**
 * Merge adjacent positions into vertical zones (columns)
 */
export function mergePositionsIntoColumns(positions: readonly Position[]): Zone[] {
  if (positions.length === 0) {
    return [];
  }
  const [startingPosition, ...sortedPositions] = [...positions]
    .sort((a, b) => a.row - b.row)
    .sort((a, b) => a.col - b.col);
  const done: Zone[] = [];
  let active = positionToZone(startingPosition);
  for (const { col, row } of sortedPositions) {
    if (isInside(col, row, active)) {
      continue;
    } else if (col === active.left && row === active.bottom + 1) {
      const bottom = active.bottom + 1;
      active = { ...active, bottom };
    } else {
      done.push(active);
      active = positionToZone({ col, row });
    }
  }
  return [...done, active];
}

/**
 * Returns positions in the first array which are not in the second array.
 */
function positionsDifference(positions: readonly Position[], toRemove: readonly Position[]) {
  const forbidden = new Set(toRemove.map(({ col, row }) => `${col}-${row}`));
  return positions.filter(({ col, row }) => !forbidden.has(`${col}-${row}`));
}

export function zoneToDimension(zone: Zone): ZoneDimension {
  return {
    numberOfRows: zone.bottom - zone.top + 1,
    numberOfCols: zone.right - zone.left + 1,
  };
}

export function isOneDimensional(zone: Zone): boolean {
  const { numberOfCols, numberOfRows } = zoneToDimension(zone);
  return numberOfCols === 1 || numberOfRows === 1;
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

export function forEachPositionsInZone(zone: Zone, callback: (col: number, row: number) => void) {
  const { left, right, top, bottom } = zone;
  for (let col = left; col <= right; col++) {
    for (let row = top; row <= bottom; row++) {
      callback(col, row);
    }
  }
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
    // left and right don't change
    col = left;
  }
  if (top != oldTop) {
    row = top;
  } else if (bottom != oldBottom) {
    row = bottom;
  } else {
    // top and bottom don't change
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

/** Returns the area of a zone */
export function getZoneArea(zone: Zone): number {
  return (zone.bottom - zone.top + 1) * (zone.right - zone.left + 1);
}

/**
 * Check if the zones are continuous, ie. if they can be merged into a single zone without
 * including cells outside the zones
 * */
export function areZonesContinuous(zones: Zone[]): boolean {
  if (zones.length < 2) return true;
  return recomputeZones(zones.map(zoneToXc), []).length === 1;
}

/** Return all the columns in the given list of zones */
export function getZonesCols(zones: Zone[]): Set<number> {
  const set = new Set<number>();
  for (let zone of zones) {
    for (let col of range(zone.left, zone.right + 1)) {
      set.add(col);
    }
  }
  return set;
}

/** Return all the rows in the given list of zones */
export function getZonesRows(zones: Zone[]): Set<number> {
  const set = new Set<number>();
  for (let zone of zones) {
    for (let row of range(zone.top, zone.bottom + 1)) {
      set.add(row);
    }
  }
  return set;
}
