import { ExcelWorkbookData, WorkbookData } from "../..";
import {
  deepCopy,
  getAddHeaderStartIndex,
  insertItemsAtIndex,
  largeMax,
  largeMin,
} from "../../helpers/misc";
import {
  AddColumnsRowsCommand,
  CommandResult,
  HideColumnsRowsCommand,
  RemoveColumnsRowsCommand,
  UnhideColumnsRowsCommand,
} from "../../types/commands";
import { ConsecutiveIndexes, Dimension, HeaderIndex, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";
import { SheetPlugin } from "./sheet";

type State = { hiddenHeaders: Record<UID, Record<Dimension, Array<boolean>>> };

export class HiddenHeaderPlugin extends CorePlugin<typeof HiddenHeaderPlugin, State> {
  static readonly dependencies = [SheetPlugin] as const;
  static getters = [
    "getHiddenColsGroups",
    "getHiddenRowsGroups",
    "isRowHiddenByUser",
    "isColHiddenByUser",
  ] as const;

  private readonly hiddenHeaders: Record<UID, Record<Dimension, Array<boolean>>> = {};

  validators = {
    HIDE_COLUMNS_ROWS: this.checkHideHeaders,
  };

  handlers = {
    HIDE_COLUMNS_ROWS: this.onHideColumnsRows,
    UNHIDE_COLUMNS_ROWS: this.onUnhideColumnsRows,
    CREATE_SHEET: this.onCreateSheet,
    DUPLICATE_SHEET: this.onDuplicateSheet,
    DELETE_SHEET: this.onDeleteSheet,
    ADD_COLUMNS_ROWS: this.onAddColumnsRows,
    REMOVE_COLUMNS_ROWS: this.onRemoveColumnsRows,
  };

  private onRemoveColumnsRows(cmd: RemoveColumnsRowsCommand) {
    const hiddenHeaders = [...this.hiddenHeaders[cmd.sheetId][cmd.dimension]];
    for (const el of [...cmd.elements].sort((a, b) => b - a)) {
      hiddenHeaders.splice(el, 1);
    }
    this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, hiddenHeaders);
  }

  private onAddColumnsRows(cmd: AddColumnsRowsCommand) {
    const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
    const hiddenHeaders = insertItemsAtIndex(
      [...this.hiddenHeaders[cmd.sheetId][cmd.dimension]],
      Array(cmd.quantity).fill(false),
      addIndex
    );
    this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, hiddenHeaders);
  }

  private onDeleteSheet(cmd: { sheetId: UID }) {
    const hiddenHeaders = { ...this.hiddenHeaders };
    delete hiddenHeaders[cmd.sheetId];
    this.history.update("hiddenHeaders", hiddenHeaders);
  }

  private onDuplicateSheet(cmd: { sheetId: UID; sheetIdTo: UID }) {
    this.history.update("hiddenHeaders", cmd.sheetIdTo, deepCopy(this.hiddenHeaders[cmd.sheetId]));
  }

  private onCreateSheet(cmd: { sheetId: UID }) {
    const hiddenHeaders = {
      COL: Array(this.getters.getNumberCols(cmd.sheetId)).fill(false),
      ROW: Array(this.getters.getNumberRows(cmd.sheetId)).fill(false),
    };
    this.history.update("hiddenHeaders", cmd.sheetId, hiddenHeaders);
  }

  private onUnhideColumnsRows(cmd: UnhideColumnsRowsCommand) {
    for (const el of cmd.elements) {
      this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, el, false);
    }
  }

  private onHideColumnsRows(cmd: HideColumnsRowsCommand) {
    for (const el of cmd.elements) {
      this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, el, true);
    }
  }

  private checkHideHeaders(cmd: HideColumnsRowsCommand) {
    if (!this.getters.tryGetSheet(cmd.sheetId)) {
      return CommandResult.InvalidSheetId;
    }
    const hiddenGroup =
      cmd.dimension === "COL"
        ? this.getHiddenColsGroups(cmd.sheetId)
        : this.getHiddenRowsGroups(cmd.sheetId);
    const elements =
      cmd.dimension === "COL"
        ? this.getters.getNumberCols(cmd.sheetId)
        : this.getters.getNumberRows(cmd.sheetId);
    const hiddenElements = new Set((hiddenGroup || []).flat().concat(cmd.elements));
    if (hiddenElements.size >= elements) {
      return CommandResult.TooManyHiddenElements;
    } else if (largeMin(cmd.elements) < 0 || largeMax(cmd.elements) > elements) {
      return CommandResult.InvalidHeaderIndex;
    }
    return CommandResult.Success;
  }

  isRowHiddenByUser(sheetId: UID, index: HeaderIndex): boolean {
    return this.hiddenHeaders[sheetId].ROW[index];
  }

  isColHiddenByUser(sheetId: UID, index: HeaderIndex): boolean {
    return this.hiddenHeaders[sheetId].COL[index];
  }

  getHiddenColsGroups(sheetId: UID): ConsecutiveIndexes[] {
    const consecutiveIndexes: ConsecutiveIndexes[] = [[]];
    const hiddenCols = this.hiddenHeaders[sheetId].COL;
    for (let col = 0; col < hiddenCols.length; col++) {
      const isColHidden = hiddenCols[col];
      if (isColHidden) {
        consecutiveIndexes[consecutiveIndexes.length - 1].push(col);
      } else {
        if (consecutiveIndexes[consecutiveIndexes.length - 1].length !== 0) {
          consecutiveIndexes.push([]);
        }
      }
    }

    if (consecutiveIndexes[consecutiveIndexes.length - 1].length === 0) {
      consecutiveIndexes.pop();
    }
    return consecutiveIndexes;
  }

  getHiddenRowsGroups(sheetId: UID): ConsecutiveIndexes[] {
    const consecutiveIndexes: ConsecutiveIndexes[] = [[]];
    const hiddenCols = this.hiddenHeaders[sheetId].ROW;
    for (let row = 0; row < hiddenCols.length; row++) {
      const isRowHidden = hiddenCols[row];
      if (isRowHidden) {
        consecutiveIndexes[consecutiveIndexes.length - 1].push(row);
      } else {
        if (consecutiveIndexes[consecutiveIndexes.length - 1].length !== 0) {
          consecutiveIndexes.push([]);
        }
      }
    }

    if (consecutiveIndexes[consecutiveIndexes.length - 1].length === 0) {
      consecutiveIndexes.pop();
    }
    return consecutiveIndexes;
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      this.hiddenHeaders[sheet.id] = { COL: [], ROW: [] };
      for (let row = 0; row < sheet.rowNumber; row++) {
        this.hiddenHeaders[sheet.id].ROW[row] = Boolean(sheet.rows[row]?.isHidden);
      }
      for (let col = 0; col < sheet.colNumber; col++) {
        this.hiddenHeaders[sheet.id].COL[col] = Boolean(sheet.cols[col]?.isHidden);
      }
    }
    return;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.exportData(data, true);
  }

  export(data: WorkbookData) {
    this.exportData(data);
  }

  exportData(data: WorkbookData, exportDefaults = false) {
    for (const sheet of data.sheets) {
      if (sheet.rows === undefined) {
        sheet.rows = {};
      }
      for (let row = 0; row < this.getters.getNumberRows(sheet.id); row++) {
        if (exportDefaults || this.hiddenHeaders[sheet.id]["ROW"][row]) {
          if (sheet.rows[row] === undefined) {
            sheet.rows[row] = {};
          }
          sheet.rows[row].isHidden ||= this.hiddenHeaders[sheet.id]["ROW"][row];
        }
      }

      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let col = 0; col < this.getters.getNumberCols(sheet.id); col++) {
        if (exportDefaults || this.hiddenHeaders[sheet.id]["COL"][col]) {
          if (sheet.cols[col] === undefined) {
            sheet.cols[col] = {};
          }
          sheet.cols[col].isHidden ||= this.hiddenHeaders[sheet.id]["COL"][col];
        }
      }
    }
  }
}
