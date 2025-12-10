import { Get } from "../store_engine";
import { Highlight } from "../types";
import { HighlightStore } from "./highlight_store";
import { SpreadsheetStore } from "./spreadsheet_store";

export class ArrayFormulaHighlight extends SpreadsheetStore {
  protected highlightStore = this.get(HighlightStore);

  constructor(get: Get) {
    super(get);
    this.highlightStore.register(this);
  }

  get highlights(): Highlight[] {
    const position = this.model.getters.getActivePosition();
    const spreader = this.model.getters.getArrayFormulaSpreadingOn(position);
    const zone = spreader
      ? this.model.getters.getSpreadZone(spreader, { ignoreSpillError: true })
      : this.model.getters.getSpreadZone(position, { ignoreSpillError: true });
    if (!zone) {
      return [];
    }
    const isArrayFormulaBlocked = this.model.getters.isArrayFormulaSpillBlocked(
      spreader ?? position
    );
    return [
      {
        range: this.model.getters.getRangeFromZone(position.sheetId, zone),
        dashed: isArrayFormulaBlocked,
        color: "#17A2B8",
        noFill: true,
        thinLine: true,
      },
    ];
  }
}
