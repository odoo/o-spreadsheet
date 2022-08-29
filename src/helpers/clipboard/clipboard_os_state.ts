import { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";
import { CommandDispatcher, Getters, Zone } from "../../types";
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

  paste(target: Zone[]) {
    const values = this.values;
    const { left: activeCol, top: activeRow } = target[0];
    const width = Math.max.apply(
      Math,
      values.map((a) => a.length)
    );
    const height = values.length;
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

  getClipboardContent(): string {
    return this.values.map((values) => values.join("\t")).join("\n");
  }
}
