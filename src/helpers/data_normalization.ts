import { Position, UID } from "../types";
import { largeMax } from "./misc";
import { recomputeZones } from "./recompute_zones";
import { positionToZone, toZone, zoneToXc } from "./zones";

/**
 * Get the id of the given item (its key in the given dictionary).
 * If the given item does not exist in the dictionary, it creates one with a new id.
 */
export function getItemId<T>(
  item: T,
  itemsDic: { [id: number]: T },
  reverseLookup: Map<string, number>
) {
  const canonical = getCanonicalRepresentation(item);
  if (reverseLookup.has(canonical)) {
    return reverseLookup.get(canonical)!;
  }

  // Generate new Id if the item didn't exist in the dictionary
  const ids = Object.keys(itemsDic);
  const maxId = ids.length === 0 ? 0 : largeMax(ids.map((id) => parseInt(id, 10)));
  const newId = maxId + 1;
  itemsDic[newId] = item;
  reverseLookup.set(canonical, newId);
  return newId;
}

export function createReverseLookup<T>(itemsDic: { [id: number]: T }): Map<string, number> {
  const reverseLookup = new Map<string, number>();
  for (const key in itemsDic) {
    const item = itemsDic[key];
    const canonical = getCanonicalRepresentation(item);
    reverseLookup.set(canonical, parseInt(key, 10));
  }
  return reverseLookup;
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
  if (item === null) return "null";
  if (item === undefined) return "undefined";
  if (typeof item !== "object") return String(item);

  if (Array.isArray(item)) {
    const len = item.length;
    let result = "[";
    for (let i = 0; i < len; i++) {
      if (i > 0) result += ",";
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
