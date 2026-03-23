import { defaultValue } from "../plugins/core/default";
import { Position, UID } from "../types/misc";
import { recomputeZones } from "./recompute_zones";
import { positionToZone, toZone, zoneToXc } from "./zones";

type ReverseLookup = Map<string, number>;
export type ItemsDic<T> = { [id: number]: T };

const globalReverseLookup = new WeakMap<ItemsDic<any>, ReverseLookup>();
const globalIdCounter = new WeakMap<ItemsDic<any>, number>();

/**
 * Get the id of the given item (its key in the given dictionary).
 * If the given item does not exist in the dictionary, it creates one with a new id.
 */
export function getItemId<T>(item: T, itemsDic: ItemsDic<T>) {
  if (!globalReverseLookup.has(itemsDic)) {
    globalReverseLookup.set(itemsDic, new Map());
    globalIdCounter.set(itemsDic, 0);
  }
  const reverseLookup = globalReverseLookup.get(itemsDic)!;
  const canonical = getCanonicalRepresentation(item);
  if (reverseLookup.has(canonical)) {
    const id = reverseLookup.get(canonical)!;
    itemsDic[id] = item;
    return id;
  }

  // Generate new Id if the item didn't exist in the dictionary
  const newId = globalIdCounter.get(itemsDic)! + 1;
  reverseLookup.set(canonical, newId);
  globalIdCounter.set(itemsDic, newId);
  itemsDic[newId] = item;
  return newId;
}

export function groupItemIdsByZones(positionsByItemId: { [id: number]: Position[] }) {
  const result: Record<string, number> = {};
  for (const itemId in positionsByItemId) {
    const zones = recomputeZones(positionsByItemId[itemId].map(positionToZone));
    for (const zone of zones) {
      result[zoneToXc(zone)] = Number(itemId);
    }
  }
  return result;
}

export function* iterateItemIdsPositions(sheetId: UID, itemIdsByZones: Record<string, number>) {
  for (const zoneXc in itemIdsByZones) {
    const zone = toZone(zoneXc);
    const itemId = itemIdsByZones[zoneXc];
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const position = { sheetId, col, row };
        yield [position, itemId] as const;
      }
    }
  }
}

export function getCanonicalRepresentation(item: any): string {
  if (item === null) {
    return "null";
  }
  if (item === undefined) {
    return "undefined";
  }
  if (typeof item !== "object") {
    return String(item);
  }

  if (Array.isArray(item)) {
    const len = item.length;
    let result = "[";
    for (let i = 0; i < len; i++) {
      if (i > 0) {
        result += ",";
      }
      result += getCanonicalRepresentation(item[i]);
    }
    return result + "]";
  }

  const keys = Object.keys(item).sort();
  let repr = "{";
  for (const key of keys) {
    if (item[key] !== undefined) {
      repr += `"${key}":${getCanonicalRepresentation(item[key])},`;
    }
  }
  repr += "}";
  return repr;
}

export function mapToId<T>(defaults: defaultValue<T>, dict: ItemsDic<T>): defaultValue<number> {
  const defaultsIds: defaultValue<number> = {
    colDefault: [],
    rowDefault: [],
  };
  if (defaults.sheetDefault) {
    defaultsIds.sheetDefault = getItemId(defaults.sheetDefault, dict);
  }
  for (const colIndex in defaults.colDefault) {
    defaultsIds.colDefault![colIndex] = getItemId(defaults.colDefault[colIndex], dict);
  }
  for (const rowIndex in defaults.rowDefault) {
    defaultsIds.rowDefault![rowIndex] = getItemId(defaults.rowDefault[rowIndex], dict);
  }
  return defaultsIds;
}

export function mapToValue<T>(
  defaultIds: defaultValue<number>,
  dict: ItemsDic<T>
): defaultValue<T> {
  const defaults: defaultValue<T> = {
    colDefault: [],
    rowDefault: [],
  };
  if (defaultIds.sheetDefault) {
    defaults.sheetDefault = dict[defaultIds.sheetDefault];
  }
  for (const colIndex in defaultIds.colDefault) {
    defaults.colDefault![colIndex] = dict[defaultIds.colDefault[colIndex]];
  }
  for (const rowIndex in defaultIds.rowDefault) {
    defaults.rowDefault![rowIndex] = dict[defaultIds.rowDefault[rowIndex]];
  }
  return defaults;
}
