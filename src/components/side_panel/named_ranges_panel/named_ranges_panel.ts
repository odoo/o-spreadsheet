import { getUniqueText } from "../../../helpers/misc";
import { _t } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";
import { SelectionInput } from "../../selection_input/selection_input";
import { TextInput } from "../../text_input/text_input";
import { NamedRangePreview } from "./named_range_preview/named_range_preview";

import { props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { useModel } from "../../owl_plugins/model_plugin";

export class NamedRangesPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NamedRangesPanel";
  static components = { NamedRangePreview, SelectionInput, TextInput };

  protected props = props({
    onCloseSidePanel: types.function([]),
  });

  get namedRanges() {
    return this.model().getters.getNamedRanges();
  }

  addNewNamedRange() {
    const existingNames = this.namedRanges.map((nr) => nr.name);
    const sheetId = this.model().getters.getActiveSheetId();
    const selection = this.model().getters.getSelectedZone();
    this.model().dispatch("CREATE_NAMED_RANGE", {
      name: getUniqueText(_t("Named_Range"), existingNames, {
        compute: (text, index) => `${text}${index}`,
      }),
      ranges: [this.model().getters.getRangeDataFromZone(sheetId, selection)],
    });
  }

  private model = useModel();
}
