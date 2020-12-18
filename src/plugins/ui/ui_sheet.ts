import { CancelledReason, Command, CommandResult, Sheet, UID, Cell, Zone } from "../../types";
import { UIPlugin } from "../ui_plugin";
import { DEFAULT_FONT_SIZE, PADDING_AUTORESIZE } from "../../constants";
import { fontSizeMap } from "../../fonts";
import { _lt } from "../../translation";
import { computeTextWidth } from "../../helpers/index";

interface UIState {
  activeSheet: Sheet;
}

export class SheetUIPlugin extends UIPlugin<UIState> {
  static getters = ["getActiveSheet", "getActiveSheetId", "getCellWidth", "getCellHeight"];
  activeSheet: Sheet = null as any;

  // This flag is used to avoid to historize the ACTIVE_SHEET command when it's
  // the main command.
  private historizeActiveSheet: boolean = true;
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
          return { status: "CANCELLED", reason: CancelledReason.InvalidSheetId };
        }
      case "ACTIVATE_SHEET":
        try {
          this.getters.getSheet(cmd.sheetIdTo);
          this.historizeActiveSheet = false;
          break;
        } catch (error) {
          return { status: "CANCELLED", reason: CancelledReason.InvalidSheetId };
        }
    }
    return { status: "SUCCESS" };
  }

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      case "DELETE_SHEET":
        if (this.getActiveSheetId() === cmd.sheetId) {
          const currentIndex = this.getters
            .getVisibleSheets()
            .findIndex((sheetId) => sheetId === this.getActiveSheetId());
          this.activeSheet = this.getters.getSheet(
            this.getters.getVisibleSheets()[Math.max(0, currentIndex - 1)]
          );
        }
        break;
    }
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
          this.interactiveMerge(cmd.sheetId, cmd.zone);
        }
        break;
      case "START":
        this.historizeActiveSheet = false;
        this.dispatch("ACTIVATE_SHEET", {
          sheetIdTo: this.getters.getSheets()[0].id,
          sheetIdFrom: this.getters.getSheets()[0].id,
        });
        break;
      case "ACTIVATE_SHEET":
        const sheet = this.getters.getSheet(cmd.sheetIdTo);
        if (this.historizeActiveSheet) {
          this.history.update("activeSheet", sheet);
        } else {
          this.activeSheet = sheet;
        }
        break;
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(cmd.sheetId, col);
          if (size !== 0) {
            this.dispatch("RESIZE_COLUMNS", {
              columns: [col],
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
            this.dispatch("RESIZE_ROWS", {
              rows: [row],
              size: size + 2 * PADDING_AUTORESIZE,
              sheetId: cmd.sheetId,
            });
          }
        }
        break;
    }
  }

  finalize() {
    this.historizeActiveSheet = true;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getActiveSheet(): Sheet {
    return this.activeSheet;
  }

  getActiveSheetId(): UID {
    return this.activeSheet.id;
  }

  getCellWidth(cell: Cell): number {
    const text = this.getters.getCellText(
      cell,
      this.getters.getActiveSheetId(),
      this.getters.shouldShowFormulas()
    );
    return computeTextWidth(this.ctx, text, this.getters.getCellStyle(cell));
  }

  getCellHeight(cell: Cell): number {
    const style = this.getters.getCellStyle(cell);
    const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
    return fontSizeMap[sizeInPt];
  }

  // ---------------------------------------------------------------------------
  // Grid manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(sheetId: UID, index: number): number {
    const cells = this.getters.getColCells(sheetId, index);
    const sizes = cells.map((cell: Cell) => this.getCellWidth(cell));
    return Math.max(0, ...sizes);
  }

  private getRowMaxHeight(sheetId: UID, index: number): number {
    const sheet = this.getters.getSheet(sheetId);
    const cells = Object.values(sheet.rows[index].cells);
    const sizes = cells.map((cell: Cell) => this.getCellHeight(cell));
    return Math.max(0, ...sizes);
  }

  private interactiveRenameSheet(sheetId: UID, title: string) {
    const placeholder = this.getters.getSheetName(sheetId)!;
    this.ui.editText(title, placeholder, (name: string | null) => {
      if (!name) {
        return;
      }
      const result = this.dispatch("RENAME_SHEET", { sheetId: sheetId, name });
      const sheetName = this.getters.getSheetName(sheetId);
      if (result.status === "CANCELLED" && sheetName !== name) {
        this.interactiveRenameSheet(sheetId, _lt("Please enter a valid sheet name"));
      }
    });
  }

  private interactiveDeleteSheet(sheetId: UID) {
    this.ui.askConfirmation(_lt("Are you sure you want to delete this sheet ?"), () => {
      this.dispatch("DELETE_SHEET", { sheetId: sheetId });
    });
  }

  private interactiveMerge(sheet: string, zone: Zone) {
    const result = this.dispatch("ADD_MERGE", { sheetId: sheet, zone });

    if (result.status === "CANCELLED") {
      if (result.reason === CancelledReason.MergeIsDestructive) {
        this.ui.askConfirmation(
          _lt("Merging these cells will only preserve the top-leftmost value. Merge anyway?"),
          () => {
            this.dispatch("ADD_MERGE", { sheetId: sheet, zone, force: true });
          }
        );
      }
    }
  }
}
