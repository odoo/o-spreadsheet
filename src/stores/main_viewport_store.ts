import { findCellInNewZone, isEqual } from "../helpers/zones";
import { Command } from "../types/commands";
import { SelectionEvent } from "../types/event_stream/selection_events";
import { UID } from "../types/misc";
import { Get } from "../types/store_engine";
import { SpreadsheetStore } from "./spreadsheet_store";
import { ViewportsStore } from "./viewports_store";

/**
 * The goal of this store is to make its attached viewport store follow the active sheet
 */
export class MainViewportStore extends SpreadsheetStore {
  private viewStore = this.get(ViewportsStore);

  private sheetIdAtFinalize: UID | undefined = undefined;

  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: this.handleEvent.bind(this),
    });
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
  }

  private handleEvent(event: SelectionEvent) {
    const eventSheetId = this.getters.getActiveSheetId();
    if (event.options.scrollIntoView) {
      const oldZone = event.previousAnchor.zone;
      const newZone = event.anchor.zone;
      const isUpdateAnchorEvent = event.mode === "updateAnchor";
      const sameZone = isEqual(oldZone, newZone);
      let { col, row } =
        isUpdateAnchorEvent && sameZone ? event.anchor.cell : findCellInNewZone(oldZone, newZone);
      if (isUpdateAnchorEvent && !sameZone) {
        // altering a zone should not move the viewport in a dimension that wasn't changed
        const { top, bottom, left, right } =
          this.viewStore.viewports.getMainInternalViewport(eventSheetId);
        if (oldZone.left === newZone.left && oldZone.right === newZone.right) {
          col = left > col || col > right ? left : col;
        }
        if (oldZone.top === newZone.top && oldZone.bottom === newZone.bottom) {
          row = top > row || row > bottom ? top : row;
        }
      }
      col = Math.min(col, this.getters.getNumberCols(eventSheetId) - 1);
      row = Math.min(row, this.getters.getNumberRows(eventSheetId) - 1);
      this.viewStore.scrollToCell(eventSheetId, col, row);
    }
  }

  protected handle(cmd: Command): void {
    switch (cmd.type) {
      case "UNDO":
      case "REDO":
      case "DELETE_SHEET":
        if (!this.getters.tryGetSheet(this.viewStore.displayedSheetId)) {
          this.sheetIdAtFinalize = this.model.getters.getActiveSheetId();
        }
        break;
      case "ACTIVATE_SHEET":
        this.viewStore.setDisplayedSheetId(cmd.sheetIdTo);
        break;
    }
  }

  protected finalize(): void {
    if (this.sheetIdAtFinalize) {
      this.viewStore.setDisplayedSheetId(this.sheetIdAtFinalize);
      this.sheetIdAtFinalize = undefined;
    }
  }
}
