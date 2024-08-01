import { range, UuidGenerator } from ".";
import type { Cloneable, FilterTableId, UID, Zone } from "../types/misc";

export class FilterTable implements Cloneable<FilterTable> {
  readonly id: FilterTableId;
  readonly zone: Zone;
  readonly filters: Filter[];

  constructor(zone: Zone) {
    this.filters = [];
    this.zone = zone;
    const uuid = new UuidGenerator();
    this.id = uuid.uuidv4();
    for (const i of range(zone.left, zone.right + 1)) {
      const filterZone = { ...this.zone, left: i, right: i };
      this.filters.push(new Filter(uuid.uuidv4(), filterZone));
    }
  }

  /** Get zone of the table without the headers */
  get contentZone(): Zone | undefined {
    if (this.zone.bottom === this.zone.top) {
      return undefined;
    }
    return { ...this.zone, top: this.zone.top + 1 };
  }

  getFilterId(col: number): string | undefined {
    return this.filters.find((filter) => filter.col === col)?.id;
  }

  clone(): FilterTable {
    return new FilterTable(this.zone);
  }
}

export class Filter {
  readonly id: UID;
  readonly zoneWithHeaders: Zone;

  constructor(id: UID, zone: Zone) {
    if (zone.left !== zone.right) {
      throw new Error("Can only define a filter on a single column");
    }
    this.id = id;
    this.zoneWithHeaders = zone;
  }

  get col() {
    return this.zoneWithHeaders.left;
  }

  /** Filtered zone, ie. zone of the filter without the header */
  get filteredZone(): Zone | undefined {
    const zone = this.zoneWithHeaders;
    if (zone.bottom === zone.top) {
      return undefined;
    }
    return { ...zone, top: zone.top + 1 };
  }
}
