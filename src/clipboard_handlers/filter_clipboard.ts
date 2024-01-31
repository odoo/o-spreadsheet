import { createAdaptedZone, range } from "../helpers";
import { ClipboardCellData, ClipboardOptions, ClipboardPasteTarget, UID, Zone } from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

interface CopiedTable {
  zone: Zone;
  filtersValues: Array<string[]>;
}

interface ClipboardContent {
  zones: Zone[];
  tables: CopiedTable[];
  sheetId: UID;
}

export class FilterClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent, any> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    if (!data.zones.length) {
      return;
    }
    const sheetId = this.getters.getActiveSheetId();

    const zones = data.zones;
    if (!zones.length) {
      return {
        zones: data.clippedZones,
        tables: [],
        sheetId,
      };
    }

    const tables: CopiedTable[] = [];
    for (const zone of zones) {
      for (const table of this.getters.getFilterTablesInZone(sheetId, zone)) {
        const values: Array<string[]> = [];
        for (const col of range(table.zone.left, table.zone.right + 1)) {
          values.push(this.getters.getFilterValues({ sheetId, col, row: table.zone.top }));
        }
        tables.push({ filtersValues: values, zone: table.zone });
      }
    }
    return {
      zones: data.clippedZones,
      tables,
      sheetId: this.getters.getActiveSheetId(),
    };
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(
    target: ClipboardPasteTarget,
    content: ClipboardContent,
    options?: ClipboardOptions | undefined
  ) {
    if (!("tables" in content) || !target.zones.length) {
      return;
    }
    const zones = target.zones;
    const sheetId = this.getters.getActiveSheetId();
    if (!options?.isCutOperation) {
      if (options?.pasteOption === undefined) {
        this.pasteCopiedTables(sheetId, zones, content);
      }
    } else {
      this.pasteFromCut(sheetId, zones, content);
    }
  }

  private pasteFromCut(sheetId: UID, target: Zone[], content: ClipboardContent) {
    for (const filterTable of content.tables) {
      this.dispatch("REMOVE_FILTER_TABLE", {
        sheetId: content.sheetId,
        target: [filterTable.zone],
      });
    }
    this.pasteCopiedTables(sheetId, target, content);
  }

  /** Paste the filter tables that are in the state */
  private pasteCopiedTables(sheetId: UID, target: Zone[], content: ClipboardContent) {
    const selection = target[0];
    const cutZone = content.zones[0];
    const cutOffset: [number, number] = [
      selection.left - cutZone.left,
      selection.top - cutZone.top,
    ];
    for (const table of content.tables) {
      const newTableZone = createAdaptedZone(table.zone, "both", "MOVE", cutOffset);
      this.dispatch("CREATE_FILTER_TABLE", { sheetId, target: [newTableZone] });
      for (const i of range(0, table.filtersValues.length)) {
        this.dispatch("UPDATE_FILTER", {
          sheetId,
          col: newTableZone.left + i,
          row: newTableZone.top,
          hiddenValues: table.filtersValues[i],
        });
      }
    }
  }
}
