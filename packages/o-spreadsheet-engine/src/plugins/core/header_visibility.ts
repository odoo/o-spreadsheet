import {
  deepCopy,
  groupConsecutive,
  largeMax,
  largeMin,
  range,
  setShift,
} from "../../helpers/misc";
import { Command, CommandResult } from "../../types/commands";
import { ConsecutiveIndexes, Dimension, HeaderIndex, UID } from "../../types/misc";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

export class HeaderVisibilityPlugin extends CorePlugin {
  static getters = [
    "checkElementsIncludeAllVisibleHeaders",
    "getHiddenColsGroups",
    "getHiddenRowsGroups",
    "isHeaderHiddenByUser",
    "isRowHiddenByUser",
    "isColHiddenByUser",
    "getUserHiddenCols",
    "getUserHiddenRows",
  ] as const;

  private readonly hiddenHeaders: Record<UID, Record<Dimension, Set<HeaderIndex>>> = {};

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "HIDE_COLUMNS_ROWS": {
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
        } else {
          return CommandResult.Success;
        }
      }
      case "REMOVE_COLUMNS_ROWS":
        if (!this.getters.tryGetSheet(cmd.sheetId)) {
          return CommandResult.InvalidSheetId;
        }
        if (this.checkElementsIncludeAllVisibleHeaders(cmd.sheetId, cmd.dimension, cmd.elements)) {
          return CommandResult.NotEnoughElements;
        }
        return CommandResult.Success;
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        const hiddenHeaders = {
          COL: new Set<HeaderIndex>(),
          ROW: new Set<HeaderIndex>(),
        };
        this.history.update("hiddenHeaders", cmd.sheetId, hiddenHeaders);
        break;
      case "DUPLICATE_SHEET":
        this.history.update(
          "hiddenHeaders",
          cmd.sheetIdTo,
          deepCopy(this.hiddenHeaders[cmd.sheetId])
        );
        break;
      case "DELETE_SHEET":
        this.history.update("hiddenHeaders", cmd.sheetId, undefined);
        break;
      case "REMOVE_COLUMNS_ROWS": {
        const elements = cmd.elements.sort((a, b) => b - a);
        const hidden = deepCopy(this.hiddenHeaders[cmd.sheetId][cmd.dimension]);
        for (const group of groupConsecutive(elements)) {
          for (let i = 0; i < group.length; i++) {
            hidden.delete(group[i]);
          }
          setShift(hidden, group[0], -group.length);
        }
        this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, hidden);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        const hidden = deepCopy(this.hiddenHeaders[cmd.sheetId][cmd.dimension]);
        setShift(hidden, cmd.position === "before" ? cmd.base : cmd.base + 1, cmd.quantity);
        this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, hidden);
        break;
      }
      case "HIDE_COLUMNS_ROWS": {
        const hidden = deepCopy(this.hiddenHeaders[cmd.sheetId][cmd.dimension]);
        for (const el of cmd.elements) {
          hidden.add(el);
        }
        this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, hidden);
        break;
      }
      case "UNHIDE_COLUMNS_ROWS": {
        const hidden = deepCopy(this.hiddenHeaders[cmd.sheetId][cmd.dimension]);
        for (const el of cmd.elements) {
          hidden.delete(el);
        }
        this.history.update("hiddenHeaders", cmd.sheetId, cmd.dimension, hidden);
        break;
      }
    }
    return;
  }

  checkElementsIncludeAllVisibleHeaders(
    sheetId: UID,
    dimension: Dimension,
    elements: HeaderIndex[]
  ): boolean {
    const elementsOrHidden: HeaderIndex[] = elements;
    this.getters.getHeaderGroups(sheetId, dimension).forEach((group) => {
      if (group.isFolded) {
        elementsOrHidden.push(...range(group.start, group.end + 1));
      }
    });

    for (let header = 0; header < this.getters.getNumberHeaders(sheetId, dimension); header++) {
      if (
        !this.hiddenHeaders[sheetId][dimension].has(header) &&
        !elementsOrHidden.includes(header)
      ) {
        return false;
      }
    }
    return true;
  }

  isHeaderHiddenByUser(sheetId: UID, dimension: Dimension, index: HeaderIndex): boolean {
    return dimension === "COL"
      ? this.isColHiddenByUser(sheetId, index)
      : this.isRowHiddenByUser(sheetId, index);
  }

  isRowHiddenByUser(sheetId: UID, index: HeaderIndex): boolean {
    return this.hiddenHeaders[sheetId].ROW.has(index) || this.getters.isRowFolded(sheetId, index);
  }

  isColHiddenByUser(sheetId: UID, index: HeaderIndex): boolean {
    return this.hiddenHeaders[sheetId].COL.has(index) || this.getters.isColFolded(sheetId, index);
  }

  getHiddenColsGroups(sheetId: UID): ConsecutiveIndexes[] {
    const hiddenCols = [...this.hiddenHeaders[sheetId].COL.keys()];
    hiddenCols.sort((a, b) => a - b);
    return groupConsecutive(hiddenCols);
  }

  getUserHiddenCols(sheetId: UID): HeaderIndex[] {
    return [
      ...this.hiddenHeaders[sheetId].COL.keys(),
      ...this.getters.getFoldedHeaders(sheetId, "COL"),
    ];
  }

  getUserHiddenRows(sheetId: UID): HeaderIndex[] {
    return [
      ...this.hiddenHeaders[sheetId].ROW.keys(),
      ...this.getters.getFoldedHeaders(sheetId, "ROW"),
    ];
  }

  getHiddenRowsGroups(sheetId: UID): ConsecutiveIndexes[] {
    const hiddenRows = [...this.hiddenHeaders[sheetId].ROW.keys()];
    hiddenRows.sort((a, b) => a - b);
    return groupConsecutive(hiddenRows);
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      this.hiddenHeaders[sheet.id] = { COL: new Set(), ROW: new Set() };
      for (let row = 0; row < sheet.rowNumber; row++) {
        if (Boolean(sheet.rows[row]?.isHidden)) {
          this.hiddenHeaders[sheet.id].ROW.add(row);
        }
      }
      for (let col = 0; col < sheet.colNumber; col++) {
        if (Boolean(sheet.cols[col]?.isHidden)) {
          this.hiddenHeaders[sheet.id].COL.add(col);
        }
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
        const isHidden = this.hiddenHeaders[sheet.id]["ROW"].has(row);
        if (exportDefaults || isHidden) {
          if (sheet.rows[row] === undefined) {
            sheet.rows[row] = {};
          }
          sheet.rows[row].isHidden ||= isHidden;
        }
      }

      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (let col = 0; col < this.getters.getNumberCols(sheet.id); col++) {
        const isHidden = this.hiddenHeaders[sheet.id]["COL"].has(col);
        if (exportDefaults || isHidden) {
          if (sheet.cols[col] === undefined) {
            sheet.cols[col] = {};
          }
          sheet.cols[col].isHidden ||= isHidden;
        }
      }
    }
  }
}
