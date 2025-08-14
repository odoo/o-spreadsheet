import { CellClipboardHandler } from "../../clipboard_handlers/cell_clipboard";
import {
  deepEquals,
  positions,
  range,
  recomputeZones,
  trimContent,
  zoneToDimension,
} from "../../helpers";
import { getClipboardDataPositions } from "../../helpers/clipboard/clipboard_helpers";
import { _t } from "../../translation";
import {
  Command,
  CommandResult,
  HeaderIndex,
  RemoveDuplicatesCommand,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class DataCleanupPlugin extends UIPlugin {
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_DUPLICATES":
        return this.checkValidations(
          cmd,
          this.chainValidations(
            this.checkSingleRangeSelected,
            this.checkNoMergeInZone,
            this.checkRangeContainsValues,
            this.checkColumnsIncludedInZone
          ),
          this.chainValidations(this.checkNoColumnProvided, this.checkColumnsAreUnique)
        );
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_DUPLICATES":
        this.removeDuplicates(cmd.columns, cmd.hasHeader);
        break;
      case "TRIM_WHITESPACE":
        this.trimWhitespace();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private removeDuplicates(columnsToAnalyze: HeaderIndex[], hasHeader: boolean) {
    const sheetId = this.getters.getActiveSheetId();
    const zone = this.getters.getSelectedZone();
    if (hasHeader) {
      zone.top += 1;
    }

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

    const handler = new CellClipboardHandler(this.getters, this.dispatch);
    const data = handler.copy(getClipboardDataPositions(sheetId, rowsToKeep));
    if (!data) {
      return;
    }

    this.dispatch("CLEAR_CELLS", { target: [zone], sheetId });

    const zonePasted: Zone = {
      left: zone.left,
      top: zone.top,
      right: zone.left,
      bottom: zone.top,
    };

    handler.paste({ zones: [zonePasted], sheetId }, data, { isCutOperation: false });

    const remainingZone = {
      left: zone.left,
      top: zone.top - (hasHeader ? 1 : 0),
      right: zone.right,
      bottom: zone.top + numberOfUniqueRows - 1,
    };

    this.selection.selectZone({
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
    this.ui.notifyUI({
      type: "info",
      text: _t(
        "%s duplicate rows found and removed.\n%s unique rows remain.",
        removedRows.toString(),
        remainingRows.toString()
      ),
      sticky: false,
    });
  }

  private checkSingleRangeSelected(): CommandResult {
    const zones = this.getters.getSelectedZones();
    if (zones.length !== 1) {
      return CommandResult.MoreThanOneRangeSelected;
    }
    return CommandResult.Success;
  }

  private checkNoMergeInZone(): CommandResult {
    const sheetId = this.getters.getActiveSheetId();
    const zone = this.getters.getSelectedZone();
    const mergesInZone = this.getters.getMergesInZone(sheetId, zone);
    if (mergesInZone.length > 0) {
      return CommandResult.WillRemoveExistingMerge;
    }
    return CommandResult.Success;
  }

  private checkRangeContainsValues(cmd: RemoveDuplicatesCommand): CommandResult {
    const sheetId = this.getters.getActiveSheetId();
    const zone = this.getters.getSelectedZone();
    if (cmd.hasHeader) {
      zone.top += 1;
    }
    const evaluatedCells = this.getters.getEvaluatedCellsInZone(sheetId, zone);
    if (evaluatedCells.every((evaluatedCel) => evaluatedCel.type === "empty")) {
      return CommandResult.EmptyTarget;
    }
    return CommandResult.Success;
  }

  private checkNoColumnProvided(cmd: RemoveDuplicatesCommand): CommandResult {
    if (cmd.columns.length === 0) {
      return CommandResult.NoColumnsProvided;
    }
    return CommandResult.Success;
  }

  private checkColumnsIncludedInZone(cmd: RemoveDuplicatesCommand): CommandResult {
    const zone = this.getters.getSelectedZone();
    const columnsToAnalyze = cmd.columns;
    if (columnsToAnalyze.some((colIndex) => colIndex < zone.left || colIndex > zone.right)) {
      return CommandResult.ColumnsNotIncludedInZone;
    }
    return CommandResult.Success;
  }

  private checkColumnsAreUnique(cmd: RemoveDuplicatesCommand): CommandResult {
    if (cmd.columns.length !== new Set(cmd.columns).size) {
      return CommandResult.DuplicatesColumnsSelected;
    }
    return CommandResult.Success;
  }

  private trimWhitespace() {
    const zones = recomputeZones(this.getters.getSelectedZones());
    const sheetId = this.getters.getActiveSheetId();
    let count = 0;

    for (const { col, row } of zones.map(positions).flat()) {
      const cell = this.getters.getCell({ col, row, sheetId });
      if (!cell) {
        continue;
      }
      const trimmedContent = trimContent(cell.content);
      if (trimmedContent !== cell.content) {
        count += 1;
        this.dispatch("UPDATE_CELL", {
          sheetId,
          col,
          row,
          content: trimmedContent,
        });
      }
    }

    const text = count
      ? _t("Trimmed whitespace from %s cells.", count)
      : _t("No selected cells had whitespace trimmed.");
    this.ui.notifyUI({
      type: "info",
      text: text,
      sticky: false,
    });
  }
}
