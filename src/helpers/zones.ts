import {
  AdjacentEdge,
  CellPosition,
  Position,
  UID,
  UnboundedZone,
  Zone,
  ZoneDimension,
} from "../types";
import {
  MAX_COL,
  MAX_ROW,
  consumeDigits,
  consumeLetters,
  consumeSpaces,
  numberToLetters,
  toXC,
} from "./coordinates";
import { TokenizingChars, range } from "./misc";
import { recomputeZones } from "./recompute_zones";

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
function toZoneWithoutBoundaryChanges(xc: string): UnboundedZone {
  const chars = new TokenizingChars(xc);
  consumeSpaces(chars);
  const sheetSeparatorIndex = xc.indexOf("!");
  if (sheetSeparatorIndex !== -1) {
    chars.advanceBy(sheetSeparatorIndex + 1);
  }
  const leftLetters = consumeLetters(chars);
  const leftNumbers = consumeDigits(chars);

  let top: number, bottom: number, left: number, right: number;
  let fullCol = false;
  let fullRow = false;
  let hasHeader = false;

  if (leftNumbers === -1) {
    left = right = leftLetters - 1;
    top = bottom = 0;
    fullCol = true;
  } else if (leftLetters === -1) {
    top = bottom = leftNumbers - 1;
    left = right = 0;
    fullRow = true;
  } else {
    left = right = leftLetters - 1;
    top = bottom = leftNumbers - 1;
    hasHeader = true;
  }
  consumeSpaces(chars);
  if (chars.current === ":") {
    chars.advanceBy(1);
    consumeSpaces(chars);
    const rightLetters = consumeLetters(chars);
    const rightNumbers = consumeDigits(chars);
    if (rightNumbers === -1) {
      right = rightLetters - 1;
      fullCol = true;
    } else if (rightLetters === -1) {
      bottom = rightNumbers - 1;
      fullRow = true;
    } else {
      right = rightLetters - 1;
      bottom = rightNumbers - 1;
      top = fullCol ? bottom : top;
      left = fullRow ? right : left;
      hasHeader = true;
    }
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
  const orderedZone = reorderZone(zone);
  const bottom = orderedZone.bottom;
  const right = orderedZone.right;
  if ((bottom !== undefined && bottom > MAX_ROW) || (right !== undefined && right > MAX_COL)) {
    throw new Error(`Range string out of bounds: ${xc}`); // limit the size of the zone for performance
  }
  if (bottom === undefined && right === undefined) {
    throw new Error(
      "Wrong zone xc. The zone cannot be at the same time a full column and a full row"
    );
  }
  return orderedZone;
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
 * Check that the given string is a correct xc representation (ie a valid zone). The try-catch
 * added over the ixXcValid call is necessary because the function can throw an error if the
 * string is not convertible to a zone by the toUnboundedZone function.
 */
export function isXcRepresentation(xc: string): boolean {
  try {
    return isXcValid(xc);
  } catch (e) {
    return false;
  }
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

  throw new Error("Bad zone format");
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
  for (const removedElement of elements.sort((a, b) => b - a)) {
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
  for (const removedElement of elements.sort((a, b) => b - a)) {
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
export function intersection(z1: UnboundedZone, z2: Zone): Zone | undefined {
  if (!overlap(z1, z2)) {
    return undefined;
  }
  return {
    top: Math.max(z1.top, z2.top),
    left: Math.max(z1.left, z2.left),
    bottom: z1.bottom !== undefined ? Math.min(z1.bottom, z2.bottom) : z1.bottom ?? z2.bottom,
    right: z1.right !== undefined ? Math.min(z1.right, z2.right) : z1.right ?? z2.right,
  };
}

/**
 * Two zones are equal if they represent the same area, so we clearly cannot use
 * reference equality.
 */
export function isEqual(z1: UnboundedZone, z2: UnboundedZone): boolean {
  return (
    z1.left === z2.left &&
    z1.right === z2.right &&
    z1.top === z2.top &&
    z1.bottom === z2.bottom &&
    z1.hasHeader === z2.hasHeader
  );
}

/**
 * Two zones are adjacent if they -partially- share an edge.
 * Returns the adjacent size of z1 as well as the indexes of the header by which they are adjacent.
 */
export function adjacent(z1: UnboundedZone, z2: Zone): AdjacentEdge | undefined {
  if (intersection(z1, z2)) return undefined;
  let adjacentEdge: AdjacentEdge | undefined = undefined;
  if (z1.left === z2.right + 1) {
    adjacentEdge = {
      position: "left",
      start: Math.max(z1.top, z2.top),
      stop: z1.bottom !== undefined ? Math.min(z1.bottom, z2.bottom) : z2.bottom,
    };
  }
  if (z1.right !== undefined && z1.right + 1 === z2.left) {
    adjacentEdge = {
      position: "right",
      start: Math.max(z1.top, z2.top),
      stop: z1.bottom !== undefined ? Math.min(z1.bottom, z2.bottom) : z2.bottom,
    };
  }
  if (z1.top === z2.bottom + 1) {
    adjacentEdge = {
      position: "top",
      start: Math.max(z1.left, z2.left),
      stop: z1.right !== undefined ? Math.min(z1.right, z2.right) : z2.right,
    };
  }
  if (z1.bottom !== undefined && z1.bottom + 1 === z2.top) {
    adjacentEdge = {
      position: "bottom",
      start: Math.max(z1.left, z2.left),
      stop: z1.right !== undefined ? Math.min(z1.right, z2.right) : z2.right,
    };
  }
  return adjacentEdge && adjacentEdge.start <= adjacentEdge.stop ? adjacentEdge : undefined;
}

/**
 * Return true if two zones overlap, false otherwise.
 */
export function overlap(z1: UnboundedZone, z2: UnboundedZone): boolean {
  if (
    (z1.bottom !== undefined && z1.bottom < z2.top) ||
    (z2.bottom !== undefined && z2.bottom < z1.top)
  ) {
    return false;
  }
  if (
    (z1.right !== undefined && z1.right < z2.left) ||
    (z2.right !== undefined && z2.right < z1.left)
  ) {
    return false;
  }
  return true;
}

/**
 * Returns true if any two zones in the given list overlap.
 */
export function hasOverlappingZones(zones: UnboundedZone[]): boolean {
  for (let i = 0; i < zones.length - 1; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (overlap(zones[i], zones[j])) {
        return true;
      }
    }
  }
  return false;
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

export function excludeTopLeft(zone: Zone): Zone[] {
  const { top, left, bottom, right } = zone;
  if (getZoneArea(zone) === 1) {
    return [];
  }
  const leftColumnZone = {
    top: top + 1,
    bottom,
    left,
    right: left,
  };
  if (right === left) {
    return [leftColumnZone];
  }
  const rightPartZone = {
    top,
    bottom,
    left: left + 1,
    right,
  };
  if (top === bottom) {
    return [rightPartZone];
  }
  return [leftColumnZone, rightPartZone];
}

export function aggregatePositionsToZones(positions: Iterable<CellPosition>): {
  [sheetId: string]: Zone[];
} {
  const result: { [sheetId: string]: Zone[] } = {};
  for (const position of positions) {
    result[position.sheetId] ??= [];
    result[position.sheetId].push(positionToZone(position));
  }
  for (const sheetId in result) {
    result[sheetId] = recomputeZones(result[sheetId]);
  }
  return result;
}

/**
 * Array of all positions in the zone.
 */
export function positions(zone: Zone): Position[] {
  const positions: Position[] = [];

  const { left, right, top, bottom } = reorderZone(zone);
  for (const col of range(left, right + 1)) {
    for (const row of range(top, bottom + 1)) {
      positions.push({ col, row });
    }
  }
  return positions;
}

/**
 * Array of all cell positions in the zone.
 */
export function cellPositions(sheetId: UID, zone: Zone): CellPosition[] {
  const positions: CellPosition[] = [];

  const { left, right, top, bottom } = reorderZone(zone);
  for (const col of range(left, right + 1)) {
    for (const row of range(top, bottom + 1)) {
      positions.push({ sheetId, col, row });
    }
  }
  return positions;
}

export function reorderZone<Z extends UnboundedZone | Zone>(zone: Z): Z {
  if (zone.right !== undefined && zone.left > zone.right) {
    zone = { ...zone, left: zone.right, right: zone.left };
  }
  if (zone.bottom !== undefined && zone.top > zone.bottom) {
    zone = { ...zone, top: zone.bottom, bottom: zone.top };
  }
  return zone;
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
  if (left !== oldLeft) {
    col = left;
  } else if (right !== oldRight) {
    col = right;
  } else {
    // left and right don't change
    col = left;
  }
  if (top !== oldTop) {
    row = top;
  } else if (bottom !== oldBottom) {
    row = bottom;
  } else {
    // top and bottom don't change
    row = top;
  }
  return { col, row };
}

export function positionToZone(position: Position): Zone {
  return { left: position.col, right: position.col, top: position.row, bottom: position.row };
}

/** Transform a zone into a zone with only its top-left position */
export function zoneToTopLeft(zone: Zone): Zone {
  return { ...zone, right: zone.left, bottom: zone.top };
}

export function isFullRow(zone: UnboundedZone): boolean {
  return zone.right === undefined;
}

export function isFullCol(zone: UnboundedZone): boolean {
  return zone.bottom === undefined;
}

export function isBoundedZone(zone: Zone | UnboundedZone): boolean {
  return zone.right !== undefined && zone.bottom !== undefined;
}

/** Returns the area of a zone */
export function getZoneArea(zone: Zone): number {
  return (zone.bottom - zone.top + 1) * (zone.right - zone.left + 1);
}

/**
 * Checks if a single zone crosses any of the frozen panes based on the vertical and horizontal split.
 */
export function doesZoneCrossFrozenPane(zone: Zone, xSplit: number, ySplit: number): boolean {
  return (
    (zone.left < xSplit && xSplit <= zone.right) || (zone.top < ySplit && ySplit <= zone.bottom)
  );
}

/**
 * Checks if any of the given zones crosses any of the frozen panes.
 */
export function doesAnyZoneCrossFrozenPane(zones: Zone[], xSplit: number, ySplit: number): boolean {
  return zones.some((zone) => doesZoneCrossFrozenPane(zone, xSplit, ySplit));
}

export function boundUnboundedZone(
  unboundedZone: Readonly<UnboundedZone>,
  sheetSize: ZoneDimension
): Readonly<Zone> {
  const { left, top, bottom, right } = unboundedZone;
  if (right !== undefined && bottom !== undefined) {
    return unboundedZone as Readonly<Zone>;
  } else if (bottom === undefined && right !== undefined) {
    return { right, top, left, bottom: sheetSize.numberOfRows - 1 };
  } else if (right === undefined && bottom !== undefined) {
    return { bottom, left, top, right: sheetSize.numberOfCols - 1 };
  }
  throw new Error("Bad zone format");
}

/**
 * Check if the zones are continuous, ie. if they can be merged into a single zone without
 * including cells outside the zones
 * */
export function areZonesContinuous(zones: Zone[]): boolean {
  if (zones.length < 2) return true;
  return recomputeZones(zones).length === 1;
}

/** Return all the columns in the given list of zones */
export function getZonesCols(zones: Zone[]): Set<number> {
  const set = new Set<number>();
  for (const zone of recomputeZones(zones)) {
    for (const col of range(zone.left, zone.right + 1)) {
      set.add(col);
    }
  }
  return set;
}

/**
 * Returns one merged zone per column,
 * spanning the full vertical range across all input zones.
 */
export function getZonesByColumns(zones: Zone[]): Zone[] {
  const map = new Map<number, Zone>();
  for (const zone of zones) {
    for (let col = zone.left; col <= zone.right; col++) {
      const existing = map.get(col);
      if (existing) {
        existing.top = Math.min(existing.top, zone.top);
        existing.bottom = Math.max(existing.bottom, zone.bottom);
      } else {
        map.set(col, { left: col, right: col, top: zone.top, bottom: zone.bottom });
      }
    }
  }
  return Array.from(map.values());
}

/** Return all the rows in the given list of zones */
export function getZonesRows(zones: Zone[]): Set<number> {
  const set = new Set<number>();
  for (const zone of recomputeZones(zones)) {
    for (const row of range(zone.top, zone.bottom + 1)) {
      set.add(row);
    }
  }
  return set;
}

export function unionPositionsToZone(positions: Position[]): Zone {
  const zone = { top: Infinity, left: Infinity, bottom: -Infinity, right: -Infinity };
  for (const { col, row } of positions) {
    zone.top = Math.min(zone.top, row);
    zone.left = Math.min(zone.left, col);
    zone.bottom = Math.max(zone.bottom, row);
    zone.right = Math.max(zone.right, col);
  }
  return zone;
}

/**
 * Check if two zones are contiguous, ie. that they share a border
 */
export function areZoneContiguous(zone1: Zone, zone2: Zone) {
  if (zone1.right + 1 === zone2.left || zone1.left === zone2.right + 1) {
    return (
      (zone1.top <= zone2.bottom && zone1.top >= zone2.top) ||
      (zone2.top <= zone1.bottom && zone2.top >= zone1.top)
    );
  }
  if (zone1.bottom + 1 === zone2.top || zone1.top === zone2.bottom + 1) {
    return (
      (zone1.left <= zone2.right && zone1.left >= zone2.left) ||
      (zone2.left <= zone1.right && zone2.left >= zone1.left)
    );
  }
  return false;
}

/**
 * Merge contiguous and overlapping zones that are in the array into bigger zones
 */
export function mergeContiguousZones(zones: Zone[]) {
  const mergedZones = [...zones];
  let hasMerged = true;
  while (hasMerged) {
    hasMerged = false;
    for (let i = 0; i < mergedZones.length; i++) {
      const zone = mergedZones[i];
      const mergeableZoneIndex = mergedZones.findIndex(
        (z, j) => i !== j && (areZoneContiguous(z, zone) || overlap(z, zone))
      );
      if (mergeableZoneIndex !== -1) {
        mergedZones[i] = union(mergedZones[mergeableZoneIndex], zone);
        mergedZones.splice(mergeableZoneIndex, 1);
        hasMerged = true;
        break;
      }
    }
  }
  return mergedZones;
}

export function splitIfAdjacent(zone: UnboundedZone, zoneToRemove: Zone): UnboundedZone[] {
  const adjacentEdge = adjacent(zone, zoneToRemove);
  if (!adjacentEdge) return [zone];
  const newZones: UnboundedZone[] = [];
  switch (adjacentEdge.position) {
    case "bottom":
    case "top":
      newZones.push({
        top: zone.top,
        bottom: zone.bottom,
        left: adjacentEdge.start,
        right: adjacentEdge.stop,
      });
      if (adjacentEdge.start > zone.left) {
        newZones.push({
          top: zone.top,
          bottom: zone.bottom,
          left: zone.left,
          right: adjacentEdge.start - 1,
        });
      }
      if (zone.right === undefined || adjacentEdge.stop < zone.right) {
        newZones.push({
          top: zone.top,
          bottom: zone.bottom,
          left: adjacentEdge.stop + 1,
          right: zone.right,
        });
      }
      return newZones;
    case "left":
    case "right":
      newZones.push({
        top: adjacentEdge.start,
        bottom: adjacentEdge.stop,
        left: zone.left,
        right: zone.right,
      });
      if (adjacentEdge.start > zone.top) {
        newZones.push({
          top: zone.top,
          bottom: adjacentEdge.start - 1,
          left: zone.left,
          right: zone.right,
        });
      }
      if (zone.bottom === undefined || adjacentEdge.stop < zone.bottom) {
        newZones.push({
          top: adjacentEdge.stop + 1,
          bottom: zone.bottom,
          left: zone.left,
          right: zone.right,
        });
      }
      return newZones;
  }
}
