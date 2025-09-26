import { UnboundedZone, Zone } from "../../..";
import { constructZonesFromProfiles, modifyProfiles, profilesContainsZone } from "../../../helpers";

export class ZoneSet {
  private profilesStartingPosition: number[] = [0];
  private profiles = new Map<number, number[]>([[0, []]]);

  constructor(zones: Iterable<UnboundedZone> = []) {
    for (const zone of zones) {
      this.add(zone);
    }
  }

  isEmpty(): boolean {
    return this.profiles.size === 1 && this.profiles.get(0)?.length === 0;
  }

  add(zone: UnboundedZone) {
    modifyProfiles(this.profilesStartingPosition, this.profiles, [zone]);
  }

  delete(zone: UnboundedZone) {
    modifyProfiles(this.profilesStartingPosition, this.profiles, [zone], true);
  }

  has(zone: Zone): boolean {
    return profilesContainsZone(this.profilesStartingPosition, this.profiles, zone);
  }

  difference(other: ZoneSet): ZoneSet {
    const result = new ZoneSet();
    result.profilesStartingPosition = [...this.profilesStartingPosition];
    result.profiles = new Map<number, number[]>();
    for (const [key, value] of this.profiles) {
      result.profiles.set(key, [...value]);
    }
    for (const zone of other) {
      result.delete(zone);
    }
    return result;
  }

  /**
   * iterator of all the zones in the ZoneSet
   */
  *[Symbol.iterator](): IterableIterator<Zone> {
    yield* constructZonesFromProfiles<Zone>(this.profilesStartingPosition, this.profiles);
  }
}
