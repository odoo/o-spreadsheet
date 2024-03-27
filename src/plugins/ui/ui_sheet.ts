import { DEFAULT_FONT_SIZE, PADDING_AUTORESIZE } from "../../constants";
import { fontSizeMap } from "../../fonts";
import { computeIconWidth, computeTextWidth, largeMax } from "../../helpers/index";
import { _lt } from "../../translation";
import { Cell, CellValueType, Command, CommandResult, UID, Zone } from "../../types";
import { UIPlugin } from "../ui_plugin";

export class SheetUIPlugin extends UIPlugin {
  static getters = ["getCellWidth", "getCellHeight", "getTextWidth", "getCellText"];

  private ctx = document.createElement("canvas").getContext("2d")!;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "AUTORESIZE_ROWS":
      case "AUTORESIZE_COLUMNS":
      case "DELETE_SHEET_CONFIRMATION":
        try {
          this.getters.getSheet(cmd.sheetId);
          break;
        } catch (error) {
          return CommandResult.InvalidSheetId;
        }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "RENAME_SHEET":
        if (cmd.interactive) {
          this.interactiveRenameSheet(cmd.sheetId, _lt("Rename Sheet"));
        }
        break;
      case "DELETE_SHEET_CONFIRMATION":
        this.interactiveDeleteSheet(cmd.sheetId);
        break;
      case "ADD_MERGE":
        if (cmd.interactive) {
          this.interactiveMerge(cmd.sheetId, cmd.target);
        }
        break;
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(cmd.sheetId, col);
          if (size !== 0) {
            this.dispatch("RESIZE_COLUMNS_ROWS", {
              elements: [col],
              dimension: "COL",
              size: size + 2 * PADDING_AUTORESIZE,
              sheetId: cmd.sheetId,
            });
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let row of cmd.rows) {
          const size = this.getRowMaxHeight(cmd.sheetId, row);
          if (size !== 0) {
            this.dispatch("RESIZE_COLUMNS_ROWS", {
              elements: [row],
              dimension: "ROW",
              size: size + 2 * PADDING_AUTORESIZE,
              sheetId: cmd.sheetId,
            });
          }
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellWidth(cell: Cell): number {
    let width = this.getTextWidth(cell);
    const cellPosition = this.getters.getCellPosition(cell.id);
    const icon = this.getters.getConditionalIcon(cellPosition.col, cellPosition.row);
    if (icon) {
      width += computeIconWidth(this.ctx, this.getters.getCellStyle(cell));
    }
    return width;
  }

  getTextWidth(cell: Cell): number {
    const text = this.getters.getCellText(cell, this.getters.shouldShowFormulas());
    return computeTextWidth(this.ctx, text, this.getters.getCellStyle(cell));
  }

  getCellHeight(cell: Cell): number {
    const style = this.getters.getCellStyle(cell);
    const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
    return fontSizeMap[sizeInPt];
  }

  getCellText(cell: Cell, showFormula: boolean = false): string {
    if (showFormula && (cell.isFormula() || cell.evaluated.type === CellValueType.error)) {
      return cell.content;
    } else {
      return cell.formattedValue;
    }
  }

  // ---------------------------------------------------------------------------
  // Grid manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(sheetId: UID, index: number): number {
    const cells = this.getters.getColCells(sheetId, index);
    const sizes = cells.map((cell: Cell) => this.getCellWidth(cell));
    return Math.max(0, largeMax(sizes));
  }

  private getRowMaxHeight(sheetId: UID, index: number): number {
    const sheet = this.getters.getSheet(sheetId);
    const cells = Object.values(sheet.rows[index].cells);
    const sizes = cells.map((cell: Cell) => this.getCellHeight(cell));
    return Math.max(0, largeMax(sizes));
  }

  private interactiveRenameSheet(sheetId: UID, title: string) {
    const placeholder = this.getters.getSheetName(sheetId);
    this.ui.editText(title, placeholder, (name: string | null) => {
      if (!name) {
        return;
      }
      const result = this.dispatch("RENAME_SHEET", { sheetId: sheetId, name });
      const sheetName = this.getters.getSheetName(sheetId);
      if (!result.isSuccessful && sheetName !== name) {
        this.interactiveRenameSheet(sheetId, _lt("Please enter a valid sheet name"));
      }
    });
  }

  private interactiveDeleteSheet(sheetId: UID) {
    this.ui.askConfirmation(_lt("Are you sure you want to delete this sheet ?"), () => {
      this.dispatch("DELETE_SHEET", { sheetId: sheetId });
    });
  }

  private interactiveMerge(sheet: string, target: Zone[]) {
    const result = this.dispatch("ADD_MERGE", { sheetId: sheet, target });

    if (!result.isSuccessful) {
      if (result.isCancelledBecause(CommandResult.MergeIsDestructive)) {
        this.ui.askConfirmation(
          _lt("Merging these cells will only preserve the top-leftmost value. Merge anyway?"),
          () => {
            this.dispatch("ADD_MERGE", { sheetId: sheet, target, force: true });
          }
        );
      }
    }
  }
}
