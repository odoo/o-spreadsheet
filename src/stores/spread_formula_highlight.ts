import { positionToZone, union } from "../helpers";
import { Get, SpreadsheetStore } from "../store_engine";
import { Highlight, Zone } from "../types";
import { HighlightStore } from "./highlight_store";

export class SpreadFormulaHighlight extends SpreadsheetStore {
  protected highlightStore = this.get(HighlightStore);

  constructor(get: Get) {
    super(get);
    this.highlightStore.register(this);
  }

  private getHighlightZone(): Zone | undefined {
    const position = this.model.getters.getActivePosition();
    const spreader = this.model.getters.getArrayFormulaSpreadingOn(position);
    const spreadPositions = spreader
      ? this.model.getters.getSpreadPositionsOf(spreader)
      : this.model.getters.getSpreadPositionsOf(position);

    if (spreadPositions.length) {
      const zones = spreadPositions.map(positionToZone);
      return union(...zones);
    } else {
      return undefined;
    }
  }

  getHighlights(): Highlight[] {
    const zone = this.getHighlightZone();
    if (!zone) {
      return [];
    }

    const sheetId = this.model.getters.getActiveSheetId();
    return [
      {
        sheetId,
        zone,
        color: "#1CAC78", // TODO: pick a color
        noFill: true,
        thinLine: true,
      },
    ];
  }
}
