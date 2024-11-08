import { Position, UID } from "../types";
import { deepEquals, largeMax } from "./misc";
import { recomputeZones } from "./recompute_zones";
import { positionToZone, toZone, zoneToXc } from "./zones";

/**
 * Get the id of the given item (its key in the given dictionary).
 * If the given item does not exist in the dictionary, it creates one with a new id.
 */
export function getItemId<T>(item: T, itemsDic: { [id: number]: T }) {
  for (const key in itemsDic) {
    if (deepEquals(itemsDic[key], item)) {
      return parseInt(key, 10);
    }
  }

  // Generate new Id if the item didn't exist in the dictionary
  const ids = Object.keys(itemsDic);
  const maxId = ids.length === 0 ? 0 : largeMax(ids.map((id) => parseInt(id, 10)));

  itemsDic[maxId + 1] = item;
  return maxId + 1;
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
