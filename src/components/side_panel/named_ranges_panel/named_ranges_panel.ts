import { getUniqueText } from "../../../helpers/misc";
import { _t } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";
import { SelectionInput } from "../../selection_input/selection_input";
import { TextInput } from "../../text_input/text_input";
import { NamedRangePreview } from "./named_range_preview/named_range_preview";

import { useProps } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";

export class NamedRangesPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NamedRangesPanel";
  static components = { NamedRangePreview, SelectionInput, TextInput };

  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  get namedRanges() {
    return this.env.model.getters.getNamedRanges();
  }

  addNewNamedRange() {
    const existingNames = this.namedRanges.map((nr) => nr.name);
    const sheetId = this.env.model.getters.getActiveSheetId();
    const selection = this.env.model.getters.getSelectedZone();
    this.env.model.dispatch("CREATE_NAMED_RANGE", {
      name: getUniqueText(_t("Named_Range"), existingNames, {
        compute: (text, index) => `${text}${index}`,
      }),
      ranges: [this.env.model.getters.getRangeDataFromZone(sheetId, selection)],
    });
  }
}
