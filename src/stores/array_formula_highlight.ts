import { onWillDestroy, usePlugin } from "@odoo/owl";
import { HighlightPlugin } from "../owl_plugins/highlight_plugin";
import { OwlPluginWithModel } from "../owl_plugins/owl_plugin_with_model";
import { Highlight } from "../types/misc";

export class ArrayFormulaHighlightPlugin extends OwlPluginWithModel {
  protected highlightPlugin = usePlugin(HighlightPlugin);

  setup() {
    this.highlightPlugin.register(this);
    onWillDestroy(() => {
      this.highlightPlugin.unRegister(this);
    });
  }

  get highlights(): Highlight[] {
    const position = this.model().getters.getActivePosition();
    const spreader = this.model().getters.getArrayFormulaSpreadingOn(position);
    const zone = spreader
      ? this.model().getters.getSpreadZone(spreader, { ignoreSpillError: true })
      : this.model().getters.getSpreadZone(position, { ignoreSpillError: true });
    if (!zone) {
      return [];
    }
    const pivotStyle = this.model().getters.getPivotStyleAtPosition(position);
    if (pivotStyle?.pivotStyle?.tableStyleId && pivotStyle.pivotStyle.tableStyleId !== "None") {
      return [];
    }
    const isArrayFormulaBlocked = this.model().getters.isArrayFormulaSpillBlocked(
      spreader ?? position
    );
    return [
      {
        range: this.model().getters.getRangeFromZone(position.sheetId, zone),
        dashed: isArrayFormulaBlocked,
        color: "#17A2B8",
        noFill: true,
        thinLine: true,
      },
    ];
  }
}
