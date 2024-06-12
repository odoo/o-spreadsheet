import { clipboardHandlersRegistries } from "../clipboard_handlers";
import { isInside, recomputeZones } from "../helpers";
import { getClipboardDataPositions } from "../helpers/clipboard/clipboard_helpers";
import { Get } from "../store_engine";
import { _t } from "../translation";
import { Command, Highlight, Zone } from "../types";
import { CellErrorType } from "../types/errors";
import { SelectionEvent } from "../types/event_stream";
import { HighlightStore } from "./highlight_store";
import { NotificationStore } from "./notification_store";
import { SpreadsheetStore } from "./spreadsheet_store";

export class ArrayFormulaHighlight extends SpreadsheetStore {
  protected highlightStore = this.get(HighlightStore);
  private notification = this.get(NotificationStore);
  private draggedHighlightZone?: Zone;

  constructor(get: Get) {
    super(get);
    this.highlightStore.register(this);
  }

  protected handle(cmd: Command): void {
    switch (cmd.type) {
      case "START_CHANGE_HIGHLIGHT":
        const zone = this.getHighlightZone();
        if (zone && this.getters.isGridSelectionActive()) {
          this.model.selection.capture(
            this,
            { cell: { col: zone.left, row: zone.top }, zone },
            {
              handleEvent: this.handleEvent.bind(this),
              release: this.cancelChangeHighlight.bind(this),
            }
          );
        }
        break;
      case "STOP_CHANGE_HIGHLIGHT": {
        const target = this.draggedHighlightZone;
        if (!this.model.selection.isListening(this) || !target) {
          return;
        }
        this.model.selection.release(this);
        const originalZone = this.getHighlightZone();
        if (!originalZone) {
          return;
        }

        if (!this.isZoneEmpty(originalZone, target)) {
          this.notification.askConfirmation(
            _t("This will overwrite the content of some cells. Move the formula anyway ?"),
            () => {
              this.model.dispatch("MOVE_ARRAY_FORMULA_HIGHLIGHT", {
                originalZone,
                targetZone: target,
              });
            }
          );
        } else {
          this.moveArrayFormula(originalZone, target);
        }

        this.draggedHighlightZone = undefined;
        break;
      }
      case "MOVE_ARRAY_FORMULA_HIGHLIGHT": {
        const sheetId = this.model.getters.getActiveSheetId();
        const zoneToDelete = recomputeZones([cmd.targetZone], [cmd.originalZone]);
        this.model.dispatch("DELETE_CONTENT", { sheetId, target: zoneToDelete });
        this.moveArrayFormula(cmd.originalZone, cmd.targetZone);
      }
    }
  }

  private handleEvent(event: SelectionEvent) {
    this.draggedHighlightZone = event.anchor.zone;
  }

  private moveArrayFormula(originalZone: Zone, target: Zone) {
    const sheetId = this.getters.getActiveSheetId();

    const handlers = clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(this.getters, this.model.dispatch));

    let copiedData = {};
    const clipboardData = getClipboardDataPositions(sheetId, [originalZone]);
    for (const handler of handlers) {
      const data = handler.copy(clipboardData);
      copiedData = { ...copiedData, ...data };
    }

    const pasteTarget = { zones: [target], sheetId };
    for (const handler of handlers) {
      handler.paste(pasteTarget, copiedData, { isCutOperation: true });
    }

    this.model.selection.selectZone({
      cell: { row: target.top, col: target.left },
      zone: target,
    });
  }

  /** Check if the target zone is empty, ignoring the overlap with the original zone */
  private isZoneEmpty(originalZone: Zone, target: Zone) {
    const sheetId = this.getters.getActiveSheetId();
    for (let row = target.top; row <= target.bottom; row++) {
      for (let col = target.left; col <= target.right; col++) {
        if (isInside(col, row, originalZone)) {
          continue;
        }
        if (this.model.getters.getCell({ sheetId, col, row })?.content) {
          return false;
        }
      }
    }
    return true;
  }

  get highlights(): Highlight[] {
    const position = this.model.getters.getActivePosition();
    const cell = this.getters.getEvaluatedCell(position);
    const zone = this.draggedHighlightZone || this.getHighlightZone();
    if (!zone) {
      return [];
    }
    return [
      {
        sheetId: position.sheetId,
        zone,
        dashed: cell.value === CellErrorType.SpilledBlocked,
        color: "#17A2B8",
        noFill: true,
        thinLine: true,
        movable: true,
      },
    ];
  }

  private getHighlightZone(): Zone | undefined {
    const position = this.model.getters.getActivePosition();
    const spreader = this.model.getters.getArrayFormulaSpreadingOn(position);
    return spreader
      ? this.model.getters.getSpreadZone(spreader, { ignoreSpillError: true })
      : this.model.getters.getSpreadZone(position, { ignoreSpillError: true });
  }

  private cancelChangeHighlight() {
    this.draggedHighlightZone = undefined;
  }
}
