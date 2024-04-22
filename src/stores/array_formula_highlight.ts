import { Get } from "../store_engine";
import { Highlight, Zone } from "../types";
import { CellErrorType } from "../types/errors";
import { HighlightStore } from "./highlight_store";
import { SpreadsheetStore } from "./spreadsheet_store";

export class ArrayFormulaHighlight extends SpreadsheetStore {
  protected highlightStore = this.get(HighlightStore);

  constructor(get: Get) {
    super(get);
    this.highlightStore.register(this);
  }

  get highlights(): Highlight[] {
    let zone: Zone | undefined;
    const position = this.model.getters.getActivePosition();
    const cell = this.getters.getEvaluatedCell(position);
    const spreader = this.model.getters.getArrayFormulaSpreadingOn(position);
    zone = spreader
      ? this.model.getters.getSpreadZone(spreader, { ignoreSpillError: true })
      : this.model.getters.getSpreadZone(position, { ignoreSpillError: true });
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
      },
    ];
  }
}
