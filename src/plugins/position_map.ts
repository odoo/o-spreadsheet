// interface ObjectWithId {
//   id : string;
// }

import { isDefined, toXC } from "../helpers";
import { StateObserver } from "../state_observer";
import {
  ApplyRangeChange,
  CellPosition,
  Position,
  Range,
  RangeProvider,
  UID,
  WorkbookHistory,
} from "../types";
import { RangeAdapter } from "./core/range";

export interface PositionMap extends Iterable<string> {
  set(sheetId: UID, position: Position, id: Id): void;
  get(sheetId: UID, position: Position): Id | undefined;
  delete(sheetId: UID, position: Position): void;
  getPosition(value: string): CellPosition | undefined; //TODO change CellPosition into something generic
  positions(): CellPosition[];
}

type RangeId = string;
type Id = string;

interface PositionMapManagerState {
  values: Record<RangeId, { id: Id; range: Range } | undefined>;
  inverseMap: Record<Id, Range | undefined>;
}

export class PositionMapManager implements RangeProvider, PositionMap, PositionMapManagerState {
  static nextHistoryId = 0;
  private history: WorkbookHistory<PositionMapManagerState>;
  readonly values: Record<RangeId, { id: Id; range: Range } | undefined> = {};
  readonly inverseMap: Record<Id, Range | undefined> = {};

  constructor(stateObserver: StateObserver, private range: RangeAdapter) {
    range.addRangeProvider(this.adaptRanges.bind(this));
    this.history = Object.assign(Object.create(stateObserver), {
      update: stateObserver.addChange.bind(stateObserver, this),
    });
  }

  private getRangeId(sheetId: UID, position: Position): RangeId {
    return `${sheetId}COL${position.col}ROW${position.row}`;
  }

  *[Symbol.iterator](): Iterator<string, void> {
    // for (const { id: value } of Object.values(positions).filter(isDefined)) {
    //   yield value;
    // }
  }

  positions(): CellPosition[] {
    const result: CellPosition[] = [];
    for (const { range } of Object.values(this.values).filter(isDefined)) {
      result.push({ sheetId: range.sheetId, col: range.zone.left, row: range.zone.top });
    }
    return result;
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    // aggregate updates while iterating and apply them later
    const toModify: { key: RangeId; range: Range; id: Id }[] = [];
    for (const key of Object.keys(this.values)) {
      const currentRange = this.values[key]?.range;
      const id = this.values[key]?.id;
      if (!currentRange || !id || (sheetId && currentRange.sheetId !== sheetId)) {
        continue;
      }
      const change = applyChange(currentRange);
      // console.log(`${key.replace(/.*COL(.*)ROW(.*)/, "($1, $2)")} change ${change.changeType}`)
      switch (change.changeType) {
        case "REMOVE":
          this.history.update("values", key, undefined);
          this.history.update("inverseMap", id, undefined);
          break;
        case "RESIZE":
          throw new Error("Cannot resize a cell range");
        case "MOVE":
        case "CHANGE":
          const range = change.range;
          const newKey = this.getRangeId(range.sheetId, {
            col: range.zone.left,
            row: range.zone.top,
          });
          toModify.push({ key: newKey, range: range, id });
          this.history.update("inverseMap", id, range);
          this.history.update("values", key, undefined); // delete previous entry
          break;
      }
    }
    for (const { key, range, id } of toModify) {
      this.history.update("values", key, { range, id });
      // this.history.update("values", sheetId, key, "id", "position", position);
    }
  }

  set(sheetId: UID, position: Position, id: Id) {
    const key = this.getRangeId(sheetId, position);
    const value = this.values[key];
    const range = this.range.getRangeFromSheetXC(sheetId, toXC(position.col, position.row));
    if (value) {
      this.history.update("values", key, "id", id);
      this.history.update("inverseMap", id, range);
    }
    this.history.update("values", key, { id, range });
    this.history.update("inverseMap", id, range);
  }

  get(sheetId: UID, position: Position): Id | undefined {
    // default value?
    return this.values?.[this.getRangeId(sheetId, position)]?.id;
  }

  getPosition(id: string): CellPosition | undefined {
    const range = this.inverseMap[id];
    if (!range) {
      return undefined;
    }
    return { col: range.zone.left, row: range.zone.top, sheetId: range.sheetId };
  }

  delete(sheetId: UID, position: Position) {
    const key = this.getRangeId(sheetId, position);
    const id = this.values[key]?.id;
    if (id) {
      this.history.update("inverseMap", id, undefined);
      this.history.update("values", key, undefined); // remove previous entry
    }
  }
}
