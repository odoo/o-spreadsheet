// import { BasePlugin } from "../base_plugin";
// import { Mode } from "../model";
// import { Command, Zone } from "../types";
// import { toZone, zoneToXc } from "../helpers";
// import { onRangeChange } from "./range_getters";
//
// export class Range {
//   get zone(): Zone {
//     return this._zone;
//   }
//   get sheetId(): string {
//     return this._sheetId;
//   }
//   set __sheetId(value: string) {
//     this._sheetId = value;
//   }
//   private _sheetId: string;
//   private _zone: Zone;
//
//   constructor(sheetId: string, zone: string | Zone) {
//     this._sheetId = sheetId;
//     if (zone instanceof String) {
//       this._zone = toZone(zone as string);
//     } else {
//       this._zone = zone as Zone;
//     }
//   }
//
//   toString(): string {
//     return zoneToXc(this._zone);
//   }
// }
//
// export class RangePlugin extends BasePlugin {
//   static getters = ["getRange", "getRangeFromZone", "getRangeFromXC"];
//   static modes: Mode[] = ["normal", "readonly", "headless"];
//
//   private ranges: Record<string, Record<string, Range>> = {};
//
//   // ---------------------------------------------------------------------------
//   // Command Handling
//   // ---------------------------------------------------------------------------
//   handle(cmd: Command) {
//     switch (cmd.type) {
//     }
//   }
//
//   finalize() {}
//
//   // ---------------------------------------------------------------------------
//   // Getters
//   // ---------------------------------------------------------------------------
//   getRange(sheetId: string, xc: string, onchange?: onRangeChange): Range {
//     return this.getRangeFromZone(sheetId, toZone(xc));
//   }
//
//   getRangeFromZone(rangeSheetId: string, zone: Zone, onchange?: onRangeChange): Range {
//     return this.ranges[rangeSheetId][this.uniqueRef(rangeSheetId, zone)];
//   }
//
//   //getRange(rangeId: string): Range {}
//
//   // ---------------------------------------------------------------------------
//   // Private
//   // ---------------------------------------------------------------------------
//
//   private uniqueRef(sheetId: string, zone: Zone): string {
//     return "3";
//   }
// }
