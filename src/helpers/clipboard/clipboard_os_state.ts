import { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";
import {
  ClipboardMIMEType,
  ClipboardOptions,
  CommandDispatcher,
  CommandResult,
  Getters,
  Zone,
} from "../../types";
import { zoneToDimension } from "../zones";
import { ClipboardCellsAbstractState } from "./clipboard_abstract_cell_state";

/** State of the clipboard when copying/cutting from the OS clipboard*/
export class ClipboardOsState extends ClipboardCellsAbstractState {
  private readonly values: string[][];

  constructor(
    content: string,
    getters: Getters,
    dispatch: CommandDispatcher["dispatch"],
    selection: SelectionStreamProcessor
  ) {
    super("COPY", getters, dispatch, selection);
    this.values = content
      .replace(/\r/g, "")
      .split("\n")
      .map((vals) => vals.split("\t"));
  }

  isPasteAllowed(target: Zone[], clipboardOption?: ClipboardOptions | undefined): CommandResult {
    const sheetId = this.getters.getActiveSheetId();
    const pasteZone = this.getPasteZone(target);
    if (this.getters.doesIntersectMerge(sheetId, pasteZone)) {
      return CommandResult.WillRemoveExistingMerge;
    }
    return CommandResult.Success;
  }

  paste(target: Zone[]) {
    const values = this.values;
    const pasteZone = this.getPasteZone(target);
    const { left: activeCol, top: activeRow } = pasteZone;
    const { width, height } = zoneToDimension(pasteZone);
    const sheetId = this.getters.getActiveSheetId();
    this.addMissingDimensions(width, height, activeCol, activeRow);
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        this.dispatch("UPDATE_CELL", {
          row: activeRow + i,
          col: activeCol + j,
          content: values[i][j],
          sheetId,
        });
      }
    }
    const zone = {
      left: activeCol,
      top: activeRow,
      right: activeCol + width - 1,
      bottom: activeRow + height - 1,
    };
    this.selection.selectZone({ cell: { col: activeCol, row: activeRow }, zone });
  }

  getClipboardContent(): Record<string, string> {
    return {
      [ClipboardMIMEType.PlainText]: this.values.map((values) => values.join("\t")).join("\n"),
    };
  }

  private getPasteZone(target: Zone[]): Zone {
    const height = this.values.length;
    const width = Math.max(...this.values.map((a) => a.length));
    const { left: activeCol, top: activeRow } = target[0];
    return {
      top: activeRow,
      left: activeCol,
      bottom: activeRow + height - 1,
      right: activeCol + width - 1,
    };
  }
}
