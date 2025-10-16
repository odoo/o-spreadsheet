import { Zone } from "../../..";
import { constructZonesFromProfiles, modifyProfiles, profilesContainsZone } from "../../../helpers";

export class ZoneSet {
  private profilesStartingPosition: number[] = [0];
  private profiles = new Map<number, number[]>([[0, []]]);

  constructor(zones: Iterable<Zone> = []) {
    for (const zone of zones) {
      this.add(zone);
    }
  }

  isEmpty(): boolean {
    return this.profiles.size === 1 && this.profiles.get(0)?.length === 0;
  }

  add(zone: Zone) {
    modifyProfiles(this.profilesStartingPosition, this.profiles, [zone]);
  }

  delete(zone: Zone) {
    modifyProfiles(this.profilesStartingPosition, this.profiles, [zone], true);
  }

  has(zone: Zone): boolean {
    return profilesContainsZone(this.profilesStartingPosition, this.profiles, zone);
  }

  difference(other: ZoneSet): ZoneSet {
    const result = this.copy();
    for (const zone of other) {
      result.delete(zone);
    }
    return result;
  }

  copy(): ZoneSet {
    const result = new ZoneSet();
    result.profilesStartingPosition = [...this.profilesStartingPosition];
    result.profiles = new Map<number, number[]>();
    for (const [key, value] of this.profiles) {
      result.profiles.set(key, [...value]);
    }
    return result;
  }

  size() {
    let size = 0;
    for (const profile of this.profiles.values()) {
      size += profile.length;
    }
    return size / 2;
  }

  /**
   * iterator of all the zones in the ZoneSet
   */
  [Symbol.iterator](): IterableIterator<Zone> {
    return constructZonesFromProfiles<Zone>(this.profilesStartingPosition, this.profiles)[
      Symbol.iterator
    ]();
  }
}
