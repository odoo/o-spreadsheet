import { NEWLINE } from "../../constants";
import { range } from "../../helpers";
import { canonicalizeNumberContent } from "../../helpers/locale";
import type { CellPosition, Command, SplitTextIntoColumnsCommand, Zone } from "../../types/index";
import { CellValueType, CommandResult } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class SplitToColumnsPlugin extends UIPlugin {
  static getters = ["getAutomaticSeparator"] as const;

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "SPLIT_TEXT_INTO_COLUMNS":
        return this.chainValidations(
          this.batchValidations(this.checkSingleColSelected, this.checkNonEmptySelector),
          this.batchValidations(this.checkNotOverwritingContent, this.checkSeparatorInSelection)
        )(cmd);
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SPLIT_TEXT_INTO_COLUMNS":
        this.splitIntoColumns(cmd);
        break;
    }
  }

  getAutomaticSeparator(): string {
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

  private splitIntoColumns({ separator, addNewColumns }: SplitTextIntoColumnsCommand) {
    const selection = this.getters.getSelectedZone();
    const sheetId = this.getters.getActiveSheetId();
    const splitted = this.getSplittedCols(selection, separator);
    if (addNewColumns) {
      this.addColsToAvoidCollisions(selection, splitted);
    }
    this.removeMergesInSplitZone(selection, splitted);
    this.addColumnsToNotOverflowSheet(selection, splitted);

    for (let i = 0; i < splitted.length; i++) {
      const row = selection.top + i;
      const splittedContent = splitted[i];

      const col = selection.left;
      const mainCell = this.getters.getCell({ sheetId, col, row });

      if (splittedContent.length === 1 && splittedContent[0] === mainCell?.content) {
        continue;
      }

      for (const [index, content] of splittedContent.entries()) {
        this.dispatch("UPDATE_CELL", {
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
        if (cell && cell.content) {
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
    this.dispatch("REMOVE_MERGE", { sheetId, target: merges });
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
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: selection.left,
        sheetId,
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
      if (cell && cell.content) {
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
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: maxColIndex,
        sheetId,
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

  private checkNonEmptySelector(cmd: SplitTextIntoColumnsCommand): CommandResult {
    if (cmd.separator === "") {
      return CommandResult.EmptySplitSeparator;
    }
    return CommandResult.Success;
  }

  private checkNotOverwritingContent(cmd: SplitTextIntoColumnsCommand): CommandResult {
    if (cmd.addNewColumns || cmd.force) {
      return CommandResult.Success;
    }
    const selection = this.getters.getSelectedZones()[0];
    const splitted = this.getSplittedCols(selection, cmd.separator);
    if (this.willSplittedColsOverwriteContent(selection, splitted)) {
      return CommandResult.SplitWillOverwriteContent;
    }
    return CommandResult.Success;
  }

  private checkSeparatorInSelection({ separator }: SplitTextIntoColumnsCommand): CommandResult {
    const cells = this.getters.getSelectedCells();
    for (const cell of cells) {
      if (cell.formattedValue.includes(separator)) {
        return CommandResult.Success;
      }
    }
    return CommandResult.NoSplitSeparatorInSelection;
  }
}
