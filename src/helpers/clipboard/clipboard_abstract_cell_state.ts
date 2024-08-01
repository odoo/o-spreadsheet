import type { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";
import type {
  CommandDispatcher,
  Dimension,
  Getters,
  GridRenderingContext,
  HeaderIndex,
  UID,
  Zone,
} from "../../types";
import { CommandResult } from "../../types";
import type {
  ClipboardMIMEType,
  ClipboardOperation,
  ClipboardOptions,
  ClipboardState,
} from "./../../types/clipboard";

/** Abstract state of the clipboard when copying/cutting content that is pasted in cells of the sheet */
export abstract class ClipboardCellsAbstractState implements ClipboardState {
  readonly operation: ClipboardOperation;
  readonly sheetId: UID;

  constructor(
    operation: ClipboardOperation,
    protected getters: Getters,
    protected dispatch: CommandDispatcher["dispatch"],
    protected selection: SelectionStreamProcessor
  ) {
    this.operation = operation;
    this.sheetId = getters.getActiveSheetId();
  }

  isCutAllowed(target: Zone[]): CommandResult {
    return CommandResult.Success;
  }

  isPasteAllowed(target: Zone[], clipboardOption?: ClipboardOptions): CommandResult {
    return CommandResult.Success;
  }

  /**
   * Paste the clipboard content in the given target
   */
  abstract paste(target: Zone[], options?: ClipboardOptions | undefined): void;

  /**
   * Add columns and/or rows to ensure that col + width and row + height are still
   * in the sheet
   */
  protected addMissingDimensions(width: number, height: number, col: number, row: number) {
    const sheetId = this.getters.getActiveSheetId();
    const missingRows = height + row - this.getters.getNumberRows(sheetId);
    if (missingRows > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "ROW",
        base: this.getters.getNumberRows(sheetId) - 1,
        sheetId,
        quantity: missingRows,
        position: "after",
      });
    }
    const missingCols = width + col - this.getters.getNumberCols(sheetId);
    if (missingCols > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: this.getters.getNumberCols(sheetId) - 1,
        sheetId,
        quantity: missingCols,
        position: "after",
      });
    }
  }

  abstract getClipboardContent(): Record<ClipboardMIMEType, string>;

  isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension) {
    return false;
  }

  drawClipboard(renderingContext: GridRenderingContext) {}
}
