import { FilterTableId, UID, Zone } from "../types/misc";
import { range } from "./misc";
import { UuidGenerator } from "./uuid";

export interface FilterTable {
  readonly id: FilterTableId;
  readonly zone: Zone;
  readonly filters: Filter[];
  readonly contentZone: Zone | undefined;
}

export interface Filter {
  readonly id: UID;
  readonly zoneWithHeaders: Zone;
  readonly col: number;
  readonly filteredZone: Zone | undefined;
}

export function createFilterTable(id: UID, zone: Zone): FilterTable {
  const filters: Filter[] = [];
  const uuid = new UuidGenerator();
  for (const i of range(zone.left, zone.right + 1)) {
    const filterZone = { ...zone, left: i, right: i };
    filters.push(createFilter(uuid.uuidv4(), filterZone));
  }
  return {
    id,
    zone,
    filters,
    contentZone: zone.bottom === zone.top ? undefined : { ...zone, top: zone.top + 1 },
  };
}

export function createFilter(id: UID, zone: Zone): Filter {
  if (zone.left !== zone.right) {
    throw new Error("Can only define a filter on a single column");
  }
  return {
    id,
    zoneWithHeaders: zone,
    col: zone.left,
    filteredZone: zone.bottom === zone.top ? undefined : { ...zone, top: zone.top + 1 },
  };
}
