import { _lt } from "../translation";
import { UnboundZone, Viewport, Zone, ZoneDimension } from "../types";
import { lettersToNumber, numberToLetters, toCartesian, toXC } from "./coordinates";
import { range } from "./misc";
import { colReference, rowReference } from "./references";

/**
 * Convert from a cartesian reference to a Zone
 * The range boundaries will be kept in the same order as the
 * ones in the text.
 * Examples:
 *    "A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "B1:B3" ==> Top 0, Bottom 3, Left: 1, Right: 1
 *    "Sheet1!A1" ==> Top 0, Bottom 0, Left: 0, Right: 0
 *    "Sheet1!B1:B3" ==> Top 0, Bottom 3, Left: 1, Right: 1
 *    "C3:A1" ==> Top 2, Bottom 0, Left 2, Right 0}
 *
 * @param xc the string reference to convert
 *
 */
export function toZoneWithoutBoundaryChanges(xc: string): UnboundZone {
  xc = xc.split("!").pop()!;
  const ranges = xc.replace(/\$/g, "").split(":");
  let top: number, bottom: number, left: number, right: number;
  let fullCol = false;
  let fullRow = false;
  let hasHeader = false;

  if (ranges[0].match(colReference)) {
    left = right = lettersToNumber(ranges[0].trim());
    top = bottom = 0;
    fullCol = true;
  } else if (ranges[0].match(rowReference)) {
    top = bottom = parseInt(ranges[0].trim(), 10) - 1;
    left = right = 0;
    fullRow = true;
  } else {
    const c = toCartesian(ranges[0].trim());
    left = right = c[0];
    top = bottom = c[1];
    hasHeader = true;
  }
  if (ranges.length === 2) {
    if (ranges[1].match(colReference)) {
      right = lettersToNumber(ranges[1].trim());
      fullCol = true;
    } else if (ranges[1].match(rowReference)) {
      bottom = parseInt(ranges[1].trim(), 10) - 1;
      fullRow = true;
    } else {
      const c = toCartesian(ranges[1].trim());
      right = c[0];
      bottom = c[1];
      top = fullCol ? bottom : top;
      left = fullRow ? right : left;
      hasHeader = true;
    }
  }

  const zone: UnboundZone = {
    top,
    left,
    bottom: fullCol ? undefined : bottom,
    right: fullRow ? undefined : right,
  };

  // Don't put hasHeader in the zone if not necessary
  hasHeader = hasHeader && (fullRow || fullCol);
  if (hasHeader) zone.hasHeader = hasHeader;

  return zone;
}

/**
 * Convert from a cartesian reference to a (possibly unbound) Zone
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
export function toUnboundZone(xc: string): UnboundZone {
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
 * Will return a single cell if given an an unbound zone (eg. A:A => top = bottom = 0).
 * Use toZoneStateful() or toUnboundZone() instead for unbound zones.
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
  const { top, left, bottom, right } = toUnboundZone(xc);
  return {
    top,
    left,
    bottom: bottom !== undefined ? bottom : top,
    right: right !== undefined ? right : left,
  };
}

/**
 * Same as toZone() but handle zones of full row/full column based on spreadsheet size.
 * A Xc of a full row will return a zone spanning the whole width of the sheet.
 */
export function toZoneStateful(xc: string, sheetSize: ZoneDimension): Zone {
  let { left, right, bottom, top } = toUnboundZone(xc);
  if (right === undefined) {
    right = sheetSize.width - 1;
  }
  if (bottom === undefined) {
    bottom = sheetSize.height - 1;
  }
  return { left, right, bottom, top };
}

/**
 * Check that the zone has valid coordinates and in
 * the correct order.
 */
export function isZoneValid(zone: Zone | UnboundZone): boolean {
  // Typescript *should* prevent this kind of errors but
  // it's better to be on the safe side at runtime as well.
  if (
    (zone.bottom !== undefined && isNaN(zone.bottom)) ||
    isNaN(zone.top) ||
    isNaN(zone.left) ||
    (zone.right !== undefined && isNaN(zone.right))
  ) {
    return false;
  }
  return (
    (zone.bottom === undefined || zone.bottom >= zone.top) &&
    (zone.right === undefined || zone.right >= zone.left)
  );
}

/**
 * Convert from zone to a cartesian reference
 *
 */
export function zoneToXc(zone: Zone | UnboundZone): string {
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
export function expandZoneOnInsertion(
  zone: UnboundZone | Zone,
  start: "left" | "top",
  base: number,
  position: "after" | "before",
  quantity: number
): UnboundZone | Zone {
  const dimension = start === "left" ? "columns" : "rows";
  const baseElement = position === "before" ? base - 1 : base;
  const zoneEnd = start === "left" ? zone["right"] : zone["bottom"];

  if (zone[start] <= baseElement && zoneEnd !== undefined && zoneEnd >= baseElement) {
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
    return createAdaptedZone(selection, dimension, "RESIZE", quantity) as Zone;
  }
  if (baseElement < selection[start]) {
    return createAdaptedZone(selection, dimension, "MOVE", quantity) as Zone;
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
export function reduceZoneOnDeletion(
  zone: UnboundZone | Zone,
  start: "left" | "top",
  elements: number[]
): UnboundZone | Zone | undefined {
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
  const zones = zonesXc.map(toUnboundZone);
  const toRemoveZones = toRemoveZonesXc.map(toUnboundZone);

  // We will need to replace the bottom of full columns and right of full rows by something
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
      return { ...zone, bottom: undefined } as UnboundZone;
    }
    if (zone.right > maxRight) {
      return { ...zone, right: undefined } as UnboundZone;
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
export function positions(zone: Zone): [number, number][] {
  const positions: [number, number][] = [];
  const [left, right] = [zone.right, zone.left].sort((a, b) => a - b);
  const [top, bottom] = [zone.top, zone.bottom].sort((a, b) => a - b);
  for (const col of range(left, right + 1)) {
    for (const row of range(top, bottom + 1)) {
      positions.push([col, row]);
    }
  }
  return positions;
}

export function createAdaptedZone(
  zone: UnboundZone | Zone,
  dimension: "columns" | "rows",
  operation: "MOVE" | "RESIZE",
  by: number
): UnboundZone | Zone {
  const start: "left" | "top" = dimension === "columns" ? "left" : "top";
  const end: "right" | "bottom" = dimension === "columns" ? "right" : "bottom";

  const newZone = { ...zone };

  // For full columns/rows, we have to make the distinction between the one that have a header and
  // whose start should be moved (eg. A2:A), and those who don't (eg. A:A)
  // The only time we don't want to move the start of the zone is if the zone is a full column (a full row)
  // without header and that we are adding/removing a row (a column)
  const hasHeader = "hasHeader" in zone ? zone.hasHeader : false;
  let shouldStartBeMoved: boolean;
  if (isFullCol(zone) && !hasHeader) {
    shouldStartBeMoved = operation === "MOVE" && dimension !== "rows";
  } else if (isFullRow(zone) && !hasHeader) {
    shouldStartBeMoved = operation === "MOVE" && dimension !== "columns";
  } else {
    shouldStartBeMoved = operation === "MOVE";
  }
  if (shouldStartBeMoved) {
    newZone[start] += by;
  }

  const zoneEnd = newZone[end];
  newZone[end] = zoneEnd !== undefined ? zoneEnd + by : undefined;

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
export function findCellInNewZone(
  oldZone: Zone,
  currentZone: Zone,
  viewport: Viewport
): [number, number] {
  let col: number, row: number;
  const { left: oldLeft, right: oldRight, top: oldTop, bottom: oldBottom } = oldZone!;
  const { left, right, top, bottom } = currentZone;
  if (left != oldLeft) {
    col = left;
  } else if (right != oldRight) {
    col = right;
  } else {
    col = viewport.left;
  }
  if (top != oldTop) {
    row = top;
  } else if (bottom != oldBottom) {
    row = bottom;
  } else {
    row = viewport.top;
  }
  return [col, row];
}

export function organizeZone(zone: Zone): Zone {
  return {
    top: Math.min(zone.top, zone.bottom),
    bottom: Math.max(zone.top, zone.bottom),
    left: Math.min(zone.left, zone.right),
    right: Math.max(zone.left, zone.right),
  };
}

export function isFullRow(zone: UnboundZone): boolean {
  return zone.right === undefined;
}

export function isFullCol(zone: UnboundZone): boolean {
  return zone.bottom === undefined;
}

/**
 * Set bounds to an unbound zone depending on the given size of the sheet.
 */
export function bindZone(zone: UnboundZone, sheetSize: ZoneDimension): Zone {
  return {
    top: zone.top,
    left: zone.left,
    bottom: zone.bottom !== undefined ? zone.bottom : sheetSize.height,
    right: zone.right !== undefined ? zone.right : sheetSize.width,
  };
}
