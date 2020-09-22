import { BasePlugin } from "../base_plugin";
import { Mode } from "../model";
import { Command, WorkbookData, Zone } from "../types";
import { toZone } from "../helpers";

export class Range {
  get zone(): Zone {
    return this._zone;
  }
  get sheetId(): string {
    return this._sheetId;
  }
  private readonly _sheetId: string;
  private readonly _zone: Zone;

  constructor(sheetId: string, zone: string | Zone) {
    this._sheetId = sheetId;
    if (zone instanceof String) {
      this._zone = toZone(zone as string);
    } else {
      this._zone = zone as Zone;
    }
  }
}

export class RangePlugin extends BasePlugin {
  static getters = ["getRange", "getRangeFromZone", "getRangeFromXC"];
  static modes: Mode[] = ["normal", "readonly", "headless"];

  private ranges: Record<string, Record<string, Range>> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
    }
  }

  finalize() {}

  import(data: WorkbookData) {
    super.import(data);
  }

  export(data: WorkbookData) {
    super.export(data);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  getRangeFromXC(sheetId: string, xc: string): Range {
    return this.getRangeFromZone(sheetId, toZone(xc));
  }

  getRangeFromZone(sheetId: string, zone: Zone): Range {
    return this.ranges[sheetId][this.uniqueRef(sheetId, zone)];
  }

  //getRange(rangeId: string): Range {}

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private uniqueRef(sheetId: string, zone: Zone): string {
    return "3";
  }
}
