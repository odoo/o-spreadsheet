// interface ObjectWithId {
//   id : string;
// }
import { deepCopy, toXC } from "../helpers";
import { StateObserver } from "../state_observer";
import { ApplyRangeChange, Range, RangeProvider, UID, WorkbookHistory } from "../types";
import { Dimension, RangePart } from "./../types/misc";
import { RangeAdapter } from "./core/range";

export interface HeaderMap<T> {
  set(sheetId: UID, dimension: Dimension, index: number, id: T): void;
  get(sheetId: UID, dimension: Dimension, index: number): T | undefined;
  delete(sheetId: UID, dimension: Dimension, index: number): void;
  deleteSheet(sheetId: UID): void;
  duplicateSheet(sheetId: UID, sheetIdTo: UID): void;
}

interface RangeValue<T> {
  range: Range;
  value: T;
}
type HeaderIndex = string;

interface HeaderMapManagerState<T> {
  values: Record<UID, Record<Dimension, Record<HeaderIndex, RangeValue<T> | undefined>>>;
}

export class HeaderMapManager<T> implements RangeProvider, HeaderMap<T>, HeaderMapManagerState<T> {
  static nextHistoryId = 0;
  private history: WorkbookHistory<HeaderMapManagerState<T>>;

  readonly values: Record<UID, Record<Dimension, Record<HeaderIndex, RangeValue<T>>>> = {};

  constructor(stateObserver: StateObserver, private range: RangeAdapter) {
    range.addRangeProvider(this.adaptRanges.bind(this));
    this.history = Object.assign(Object.create(stateObserver), {
      update: stateObserver.addChange.bind(stateObserver, this),
    });
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    const sheetIds = sheetId ? [sheetId] : Object.keys(this.values);
    for (const sheetId of sheetIds) {
      for (const dimension of ["COL", "ROW"] as Dimension[]) {
        // aggregate updates while iterating and apply them later
        const toModify: RangeValue<T>[] = [];
        for (const index of Object.keys(this.values?.[sheetId]?.[dimension] || [])) {
          const valueRange = this.values[sheetId][dimension][index];
          if (!valueRange || (sheetId && valueRange.range.sheetId !== sheetId)) {
            continue;
          }
          const range = valueRange.range;

          const change = applyChange(range);
          if (change.changeType !== "NONE" && !change.isGlobalGridChange) {
            continue;
          }
          switch (change.changeType) {
            case "REMOVE":
              this.history.update("values", sheetId, dimension, index, undefined);
              break;
            case "RESIZE":
              throw new Error("Cannot resize a header range");
            case "MOVE":
            case "CHANGE":
              const range = change.range;
              toModify.push({ range, value: valueRange.value });
              this.history.update("values", sheetId, dimension, index, undefined); // delete previous entry
              break;
          }
        }
        for (const rangeValue of toModify) {
          const index =
            dimension === "COL" ? rangeValue.range.zone.left : rangeValue.range.zone.top;
          this.history.update("values", sheetId, dimension, String(index), rangeValue);
        }
      }
    }
  }

  set(sheetId: UID, dimension: Dimension, index: number, value: T) {
    const col = dimension === "COL" ? index : 0;
    const row = dimension === "ROW" ? index : 0;
    // TODO when it's merged, replace this by full col/row ranges.
    const rangePart: RangePart = { colFixed: dimension === "ROW", rowFixed: dimension === "COL" };
    const range = this.range.getRangeFromSheetXC(sheetId, toXC(col, row, rangePart));
    this.history.update("values", sheetId, dimension, String(index), { range, value });
  }

  get(sheetId: UID, dimension: Dimension, index: number): T | undefined {
    return this.values[sheetId]?.[dimension]?.[index]?.value;
  }

  delete(sheetId: UID, dimension: Dimension, index: number) {
    const value = this.get(sheetId, dimension, index);
    if (value) {
      this.history.update("values", sheetId, dimension, String(index), undefined); // remove previous entry
    }
  }

  deleteSheet(sheetId: string): void {
    const values = { ...this.values };
    delete values[sheetId];
    this.history.update("values", values);
  }

  duplicateSheet(sheetId: UID, sheetIdTo: string): void {
    this.history.update("values", sheetIdTo, deepCopy(this.values[sheetId]));
  }
}
