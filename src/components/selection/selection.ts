import { SELECTION_BORDER_COLOR } from "../../constants";
import { Component } from "../../owl3_compatibility_layer";
import { PropsOf } from "../../types/props_of";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Highlight } from "../highlight/highlight/highlight";
import { useModel } from "../owl_plugins/model_plugin";

export class Selection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Selection";
  static components = { Highlight };

  private model = useModel();

  get highlightProps(): PropsOf<Highlight> {
    const sheetId = this.model().getters.getActiveSheetId();
    const zone = this.model().getters.getUnboundedZone(
      sheetId,
      this.model().getters.getSelectedZone()
    );
    const range = this.model().getters.getRangeFromZone(sheetId, zone);
    return { range, color: SELECTION_BORDER_COLOR };
  }
}
