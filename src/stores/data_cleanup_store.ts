import { CellClipboardHandler } from "../clipboard_handlers/cell_clipboard";
import { getClipboardDataPositions } from "../helpers/clipboard/clipboard_helpers";
import { deepEquals, range } from "../helpers/misc";
import { zoneToDimension } from "../helpers/zones";
import { _t } from "../translation";
import { CancelledReason, Command, CommandResult } from "../types/commands";
import { HeaderIndex, UID, Zone } from "../types/misc";
import { Get } from "../types/store_engine";
import { NotificationStore } from "./notification_store";
import { SpreadsheetStore } from "./spreadsheet_store";

export class DataCleanupStore extends SpreadsheetStore {
  mutators = ["setHasHeader", "setColumns", "toggleAllColumns", "toggleColumn"] as const;
  private notificationStore = this.get(NotificationStore);

  hasHeader: boolean = false;
  columns: { [colIndex: number]: boolean } = {};

  constructor(get: Get) {
    super(get);
    this.updateColumns();
    this.model.selection.observe(this, {
      handleEvent: this.updateColumns.bind(this),
    });
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
  }

  private updateColumns() {
    const zone = this.model.getters.getSelectedZone();
    const oldColumns = this.columns;
    const newColumns = {};
    for (let i = zone.left; i <= zone.right; i++) {
      newColumns[i] = i in oldColumns ? oldColumns[i] : true;
    }
    this.setColumns(newColumns);
  }

  setHasHeader(hasHeader: boolean) {
    this.hasHeader = hasHeader;
  }

  setColumns(columns: { [colIndex: number]: boolean }) {
    this.columns = columns;
  }

  toggleAllColumns() {
    const newState = !this.isEveryColumnSelected;
    const newColumns = {};
    for (const index in this.columns) {
      newColumns[index] = newState;
    }
    this.setColumns(newColumns);
  }

  toggleColumn(colIndex: number) {
    const newColumns = { ...this.columns };
    newColumns[colIndex] = !this.columns[colIndex];
    this.setColumns(newColumns);
  }

  private get isEveryColumnSelected(): boolean {
    return Object.values(this.columns).every((value) => value);
  }

  get removeDuplicateErrors(): CancelledReason[] {
    const reasons: CancelledReason[] = [];
    if (!this.checkSingleRangeSelected()) {
      reasons.push(CommandResult.MoreThanOneRangeSelected);
    } else if (!this.checkNoMergeInZone()) {
      reasons.push(CommandResult.WillRemoveExistingMerge);
    } else if (!this.checkRangeContainsValues()) {
      reasons.push(CommandResult.EmptySelectedRange);
    } else if (!this.checkColumnsIncludedInZone()) {
      reasons.push(CommandResult.ColumnsNotIncludedInZone);
    }

    if (!this.checkNoColumnProvided()) {
      reasons.push(CommandResult.NoColumnsProvided);
    }
    return reasons;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_DUPLICATES":
        this.removeDuplicates();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private removeDuplicates() {
    const sheetId = this.getters.getActiveSheetId();
    const zone = this.getters.getSelectedZone();
    if (this.hasHeader) {
      zone.top += 1;
    }
    const columnsToAnalyze = this.getColsToAnalyze();

    const uniqueRowsIndexes = this.getUniqueRowsIndexes(
      sheetId,
      zone.top,
      zone.bottom,
      columnsToAnalyze
    );
    const numberOfUniqueRows = uniqueRowsIndexes.length;

    if (numberOfUniqueRows === zoneToDimension(zone).numberOfRows) {
      this.notifyRowsRemovedAndRemaining(0, numberOfUniqueRows);
      return;
    }

    const rowsToKeep: Zone[] = uniqueRowsIndexes.map((rowIndex) => ({
      left: zone.left,
      top: rowIndex,
      right: zone.right,
      bottom: rowIndex,
    }));

    const handler = new CellClipboardHandler(this.getters, this.model.dispatch);
    const data = handler.copy(getClipboardDataPositions(sheetId, rowsToKeep), false);
    if (!data) {
      return;
    }

    this.model.dispatch("CLEAR_CELLS", { target: [zone], sheetId });

    const zonePasted: Zone = {
      left: zone.left,
      top: zone.top,
      right: zone.left,
      bottom: zone.top,
    };

    handler.paste({ zones: [zonePasted], sheetId }, data, { isCutOperation: false });

    const remainingZone = {
      left: zone.left,
      top: zone.top - (this.hasHeader ? 1 : 0),
      right: zone.right,
      bottom: zone.top + numberOfUniqueRows - 1,
    };

    this.model.selection.selectZone({
      cell: { col: remainingZone.left, row: remainingZone.top },
      zone: remainingZone,
    });

    const removedRows = zone.bottom - zone.top + 1 - numberOfUniqueRows;
    this.notifyRowsRemovedAndRemaining(removedRows, numberOfUniqueRows);
  }

  private getUniqueRowsIndexes(
    sheetId: UID,
    top: HeaderIndex,
    bottom: HeaderIndex,
    columns: HeaderIndex[]
  ): number[] {
    const uniqueRows = new Map<number, string>();

    for (const row of range(top, bottom + 1)) {
      const cellsValuesInRow = columns.map((col) => {
        return this.getters.getEvaluatedCell({
          sheetId,
          col,
          row,
        }).value;
      });
      const isRowUnique = !Object.values(uniqueRows).some((uniqueRow) =>
        deepEquals(uniqueRow, cellsValuesInRow)
      );

      if (isRowUnique) {
        uniqueRows[row] = cellsValuesInRow;
      }
    }
    // transform key object in number
    return Object.keys(uniqueRows).map((key) => parseInt(key));
  }

  private notifyRowsRemovedAndRemaining(removedRows: number, remainingRows: number) {
    this.notificationStore.notifyUser({
      type: "info",
      text: _t(
        "%s duplicate rows found and removed.\n%s unique rows remain.",
        removedRows.toString(),
        remainingRows.toString()
      ),
      sticky: false,
    });
  }

  private checkSingleRangeSelected(): boolean {
    const zones = this.getters.getSelectedZones();
    if (zones.length !== 1) {
      return false;
    }
    return true;
  }

  private checkNoMergeInZone(): boolean {
    const sheetId = this.getters.getActiveSheetId();
    const zone = this.getters.getSelectedZone();
    const mergesInZone = this.getters.getMergesInZone(sheetId, zone);
    if (mergesInZone.length > 0) {
      return false;
    }
    return true;
  }

  private checkRangeContainsValues(): boolean {
    const sheetId = this.getters.getActiveSheetId();
    const zone = this.getters.getSelectedZone();
    if (this.hasHeader) {
      zone.top += 1;
    }
    const evaluatedCells = this.getters.getEvaluatedCellsInZone(sheetId, zone);
    if (evaluatedCells.every((evaluatedCel) => evaluatedCel.type === "empty")) {
      return false;
    }
    return true;
  }

  private checkNoColumnProvided(): boolean {
    const columnsToAnalyze = this.getColsToAnalyze();
    if (columnsToAnalyze.length === 0) {
      return false;
    }
    return true;
  }

  private checkColumnsIncludedInZone(): boolean {
    const zone = this.getters.getSelectedZone();
    const columnsToAnalyze = this.getColsToAnalyze();
    if (columnsToAnalyze.some((colIndex) => colIndex < zone.left || colIndex > zone.right)) {
      return false;
    }
    return true;
  }

  private getColsToAnalyze(): HeaderIndex[] {
    return Object.keys(this.columns)
      .filter((colIndex) => this.columns[colIndex])
      .map((colIndex) => parseInt(colIndex));
  }
}
