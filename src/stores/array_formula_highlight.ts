import { usePlugin } from "@odoo/owl";
import { HighlightPlugin } from "../owl_plugins/highlight_plugin";
import { Highlight } from "../types/misc";
import { Get } from "../types/store_engine";
import { SpreadsheetStore } from "./spreadsheet_store";

export class ArrayFormulaHighlight extends SpreadsheetStore {
  protected highlightPlugin = usePlugin(HighlightPlugin);

  constructor(get: Get) {
    super(get);
    this.highlightPlugin.register(this);
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
    const pivotStyle = this.getters.getPivotStyleAtPosition(position);
    if (pivotStyle?.pivotStyle?.tableStyleId && pivotStyle.pivotStyle.tableStyleId !== "None") {
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
