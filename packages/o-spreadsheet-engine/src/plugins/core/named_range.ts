import { isFuncallToken } from "../../formulas/parser";
import { Token } from "../../formulas/tokenizer";
import { deepEquals, isNumber, rangeReference } from "../../helpers";
import { Command, CommandResult, CoreCommand } from "../../types/commands";
import { DEFAULT_LOCALE } from "../../types/locale";
import {
  AdaptSheetName,
  ApplyRangeChange,
  NamedRange,
  UID,
  UnboundedZone,
  Zone,
} from "../../types/misc";
import { WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

interface NamedRangeState {
  readonly namedRanges: Array<NamedRange>;
}

/**
  - \p{L} is for any letter (from any language)
  - \p{N} is for any number
  - the u flag at the end is for unicode, which enables the `\p{...}` syntax
 */
const validNamedRangeNameRegex = /^[\p{L}|\p{N}|_|\.]*$/u;

export class NamedRangesPlugin extends CorePlugin<NamedRangeState> implements NamedRangeState {
  static getters = ["getNamedRange", "getNamedRangeFromZone", "getNamedRanges"] as const;

  readonly namedRanges: Array<NamedRange> = [];

  adaptRanges(applyChange: ApplyRangeChange, sheetId: UID, adaptSheetName: AdaptSheetName) {
    const newNamedRanges: Array<NamedRange> = [];
    let hasChanges = false;
    for (const namedRange of this.namedRanges) {
      const change = applyChange(namedRange.range);
      switch (change.changeType) {
        case "REMOVE":
          hasChanges = true;
          break;
        case "RESIZE":
        case "MOVE":
        case "CHANGE":
          hasChanges = true;
          newNamedRanges.push({ ...namedRange, range: change.range });
          break;
        case "NONE":
          newNamedRanges.push(namedRange);
      }
    }
    if (hasChanges) {
      this.history.update("namedRanges", newNamedRanges);
    }
  }

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_NAMED_RANGE":
        return this.checkValidNewNamedRangeName(cmd.name);
      case "UPDATE_NAMED_RANGE":
        return this.checkValidations(
          cmd,
          () => this.checkNamedRangeExists(cmd.oldRangeName),
          () =>
            cmd.newRangeName !== cmd.oldRangeName
              ? this.checkValidNewNamedRangeName(cmd.newRangeName)
              : CommandResult.Success
        );
      case "DELETE_NAMED_RANGE":
        return this.checkNamedRangeExists(cmd.name);
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_NAMED_RANGE": {
        const range = this.getters.getRangeFromRangeData(cmd.ranges[0]);
        const newNamedRanges = [...this.namedRanges, { name: cmd.name, range }];
        this.history.update("namedRanges", newNamedRanges);
        break;
      }
      case "UPDATE_NAMED_RANGE": {
        const index = this.getNamedRangeIndex(cmd.oldRangeName);
        if (index !== -1) {
          const range = this.getters.getRangeFromRangeData(cmd.ranges[0]);
          const newNamedRanges = [...this.namedRanges];
          newNamedRanges[index] = { name: cmd.newRangeName, range };
          this.history.update("namedRanges", newNamedRanges);
          if (cmd.oldRangeName !== cmd.newRangeName) {
            this.renameNamedRangeInFormulas(cmd.oldRangeName, cmd.newRangeName);
          }
        }
        break;
      }
      case "DELETE_NAMED_RANGE": {
        const index = this.getNamedRangeIndex(cmd.name);
        if (index !== -1) {
          const newNamedRanges = [...this.namedRanges];
          newNamedRanges.splice(index, 1);
          this.history.update("namedRanges", newNamedRanges);
        }
        break;
      }
    }
  }

  getNamedRange(name: UID): NamedRange | undefined {
    return this.namedRanges[this.getNamedRangeIndex(name)];
  }

  getNamedRangeFromZone(sheetId: UID, zone: Zone | UnboundedZone): NamedRange | undefined {
    for (const namedRange of this.namedRanges) {
      const range = namedRange.range;
      if (range.sheetId === sheetId && deepEquals(range.unboundedZone, zone)) {
        return namedRange;
      }
    }
    return undefined;
  }

  getNamedRanges(): NamedRange[] {
    return this.namedRanges;
  }

  private getNamedRangeIndex(name: UID): number {
    return this.namedRanges.findIndex((r) => r && r.name.toLowerCase() === name.toLowerCase());
  }

  private renameNamedRangeInFormulas(oldName: string, newName: string) {
    const lowerCaseOldName = oldName.toLowerCase();
    const isOldNamedRangeToken = (token: Token, nextToken: Token | undefined) => {
      return (
        token.type === "SYMBOL" &&
        token.value.toLowerCase() === lowerCaseOldName &&
        !isFuncallToken(token, nextToken)
      );
    };

    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCells(sheetId);
      for (const cellId in cells) {
        const cell = cells[cellId];
        if (!cell.isFormula) {
          continue;
        }

        const tokens = cell.compiledFormula.tokens;
        let newContent = "";
        let hasChanged = false;
        for (let i = 0; i < tokens.length; i++) {
          if (isOldNamedRangeToken(tokens[i], tokens[i + 1])) {
            hasChanged = true;
            newContent += newName;
          } else {
            newContent += tokens[i].value;
          }
        }

        if (hasChanged) {
          this.dispatch("UPDATE_CELL", {
            ...this.getters.getCellPosition(cellId),
            content: newContent,
          });
        }
      }
    }
  }

  import(data: WorkbookData) {
    for (const name in data.namedRanges || {}) {
      this.namedRanges.push({
        name: name,
        range: this.getters.getRangeFromSheetXC(undefined, data.namedRanges[name]),
      });
    }
  }

  export(data: WorkbookData) {
    data.namedRanges = {};
    for (const namedRange of this.namedRanges) {
      const xc = this.getters.getRangeString(namedRange.range, "forceSheetReference");
      data.namedRanges[namedRange.name] = xc;
    }
  }

  private checkValidNewNamedRangeName(name: string): CommandResult {
    if (this.getNamedRange(name)) {
      return CommandResult.NamedRangeNameAlreadyExists;
    }

    if (!validNamedRangeNameRegex.test(name) || isNumber(name, DEFAULT_LOCALE)) {
      return CommandResult.NamedRangeNameWithInvalidCharacter;
    }

    if (rangeReference.test(name)) {
      return CommandResult.NamedRangeNameLooksLikeCellReference;
    }

    return CommandResult.Success;
  }

  private checkNamedRangeExists(name: string): CommandResult {
    if (!this.getNamedRange(name)) {
      return CommandResult.NamedRangeNotFound;
    }
    return CommandResult.Success;
  }
}
