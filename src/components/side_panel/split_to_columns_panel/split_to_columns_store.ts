import { NEWLINE } from "../../../constants";
import { canonicalizeNumberContent } from "../../../helpers/locale";
import { range } from "../../../helpers/misc";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { CellValueType } from "../../../types/cells";
import { Command, CommandResult, DispatchResult } from "../../../types/commands";
import { CellPosition, Zone } from "../../../types/misc";

export type SplitToColumnsSeparatorValue = "auto" | "custom" | " " | "," | ";" | typeof NEWLINE;

export class SplitToColumnsStore extends SpreadsheetStore {
  mutators = ["setSeparatorValue", "setCustomSeparator", "setShouldAddNewColumns"] as const;
  storeGetters = ["canSplitIntoColumns"] as const;

  separatorValue: SplitToColumnsSeparatorValue = "auto";
  customSeparator: string = "";
  addNewColumns: boolean = false;

  setSeparatorValue(separatorValue: SplitToColumnsSeparatorValue) {
    this.separatorValue = separatorValue;
  }

  setCustomSeparator(customSeparator: string) {
    this.customSeparator = customSeparator;
  }

  setShouldAddNewColumns(addNewColumns: boolean) {
    this.addNewColumns = addNewColumns;
  }

  canSplitIntoColumns(args: { force: boolean }): DispatchResult {
    const result = new DispatchResult([
      this.checkSingleColSelected(),
      this.checkNonEmptySelector(),
    ]);
    if (!result.isSuccessful) {
      return result;
    }
    return new DispatchResult([
      this.checkNotOverwritingContent(args.force),
      this.checkSeparatorInSelection(),
    ]);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SPLIT_TEXT_INTO_COLUMNS":
        if (!this.canSplitIntoColumns({ force: !!cmd.force }).isSuccessful) {
          return;
        }
        this.splitIntoColumns();
        break;
    }
  }

  get automaticSeparatorOfSelection(): string {
    const cells = this.getters.getSelectedCells();
    for (const cell of cells) {
      if (cell.value && cell.type === CellValueType.text) {
        const separator = this.getAutoSeparatorForString(cell.value);
        if (separator) {
          return separator;
        }
      }
    }
    return " ";
  }

  private getAutoSeparatorForString(str: string): string | undefined {
    const separators = [NEWLINE, ";", ",", " ", "."];
    for (const separator of separators) {
      if (str.includes(separator)) {
        return separator;
      }
    }
    return;
  }

  private splitIntoColumns() {
    const selection = this.getters.getSelectedZone();
    const sheetId = this.getters.getActiveSheetId();
    const splitted = this.getSplittedCols(selection, this.separatorString);
    if (this.addNewColumns) {
      this.addColsToAvoidCollisions(selection, splitted);
    }
    this.removeMergesInSplitZone(selection, splitted);
    this.addColumnsToNotOverflowSheet(selection, splitted);

    for (let i = 0; i < splitted.length; i++) {
      const row = selection.top + i;
      const splittedContent = splitted[i];

      const col = selection.left;
      const mainCell = this.getters.getCell({ sheetId, col, row });

      if (
        splittedContent.length === 1 &&
        !mainCell?.isFormula &&
        splittedContent[0] === mainCell?.content
      ) {
        continue;
      }

      for (const [index, content] of splittedContent.entries()) {
        this.model.dispatch("UPDATE_CELL", {
          sheetId,
          col: col + index,
          row,
          content: canonicalizeNumberContent(content, this.getters.getLocale()),
          format: "",
          style: mainCell?.style || null,
        });
      }
    }
  }

  private getSplittedCols(selection: Zone, separator: string): string[][] {
    if (!separator) {
      throw new Error("Separator cannot be empty");
    }
    const sheetId = this.getters.getActiveSheetId();
    const splitted: string[][] = [];
    for (const row of range(selection.top, selection.bottom + 1)) {
      const text = this.getters.getEvaluatedCell({
        sheetId,
        col: selection.left,
        row,
      }).formattedValue;
      splitted.push(this.splitAndRemoveTrailingEmpty(text, separator));
    }
    return splitted;
  }

  private splitAndRemoveTrailingEmpty(string: string, separator: string) {
    const splitted = string.split(separator);
    while (splitted.length > 1 && splitted[splitted.length - 1] === "") {
      splitted.pop();
    }
    return splitted;
  }

  private willSplittedColsOverwriteContent(selection: Zone, splittedCols: string[][]) {
    const sheetId = this.getters.getActiveSheetId();
    for (const row of range(selection.top, selection.bottom + 1)) {
      const splittedText = splittedCols[row - selection.top];
      for (let i = 1; i < splittedText.length; i++) {
        const cell = this.getters.getCell({ sheetId, col: selection.left + i, row });
        if (cell?.isFormula || cell?.content) {
          return true;
        }
      }
    }
    return false;
  }

  private removeMergesInSplitZone(selection: Zone, splittedCols: string[][]) {
    const sheetId = this.getters.getActiveSheetId();
    const colsInSplitZone = Math.max(...splittedCols.map((s) => s.length));
    const splitZone = { ...selection, right: selection.left + colsInSplitZone - 1 };
    const merges = this.getters.getMergesInZone(sheetId, splitZone);
    this.model.dispatch("REMOVE_MERGE", { sheetId, target: merges });
  }

  private addColsToAvoidCollisions(selection: Zone, splittedCols: string[][]) {
    const sheetId = this.getters.getActiveSheetId();

    let colsToAdd = 0;

    for (const row of range(selection.top, selection.bottom + 1)) {
      const cellPosition = { sheetId, col: selection.left, row };
      const splittedText = splittedCols[row - selection.top];
      const colsToAddInRow = this.getColsToAddToAvoidCollision(cellPosition, splittedText);
      colsToAdd = Math.max(colsToAdd, colsToAddInRow);
    }

    if (colsToAdd) {
      this.model.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: selection.left,
        sheetId,
        sheetName: this.getters.getSheetName(sheetId),
        quantity: colsToAdd,
        position: "after",
      });
    }
  }

  private getColsToAddToAvoidCollision(cellPosition: CellPosition, splittedText: string[]): number {
    const maxColumnsToSpread = splittedText.length;

    for (let i = 1; i < maxColumnsToSpread; i++) {
      const col = cellPosition.col + i;
      const cell = this.getters.getCell({ ...cellPosition, col });
      if (cell?.isFormula || cell?.content) {
        return maxColumnsToSpread - i;
      }
    }

    return 0;
  }

  private addColumnsToNotOverflowSheet(selection: Zone, splittedCols: string[][]) {
    const sheetId = this.getters.getActiveSheetId();
    const maxColumnsToSpread = Math.max(...splittedCols.map((s) => s.length - 1));
    const maxColIndex = this.getters.getNumberCols(sheetId) - 1;
    if (selection.left + maxColumnsToSpread > maxColIndex) {
      this.model.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: maxColIndex,
        sheetId,
        sheetName: this.getters.getSheetName(sheetId),
        quantity: selection.left + maxColumnsToSpread - maxColIndex,
        position: "after",
      });
    }
  }

  private checkSingleColSelected(): CommandResult {
    if (!this.getters.isSingleColSelected()) {
      return CommandResult.MoreThanOneColumnSelected;
    }
    return CommandResult.Success;
  }

  private checkNonEmptySelector(): CommandResult {
    if (this.separatorString === "") {
      return CommandResult.EmptySplitSeparator;
    }
    return CommandResult.Success;
  }

  private checkNotOverwritingContent(force: boolean): CommandResult {
    if (this.addNewColumns || force) {
      return CommandResult.Success;
    }
    const selection = this.getters.getSelectedZones()[0];
    const splitted = this.getSplittedCols(selection, this.separatorString);
    if (this.willSplittedColsOverwriteContent(selection, splitted)) {
      return CommandResult.SplitWillOverwriteContent;
    }
    return CommandResult.Success;
  }

  private checkSeparatorInSelection(): CommandResult {
    const cells = this.getters.getSelectedCells();
    for (const cell of cells) {
      if (cell.formattedValue.includes(this.separatorString)) {
        return CommandResult.Success;
      }
    }
    return CommandResult.NoSplitSeparatorInSelection;
  }

  get separatorString(): string {
    if (this.separatorValue === "custom") {
      return this.customSeparator;
    } else if (this.separatorValue === "auto") {
      return this.automaticSeparatorOfSelection;
    }
    return this.separatorValue;
  }
}
