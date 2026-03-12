import { _t, getUniqueText } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { SelectionInput } from "../../selection_input/selection_input";
import { TextInput } from "../../text_input/text_input";
import { NamedRangePreview } from "./named_range_preview/named_range_preview";

interface Props {
  onCloseSidePanel: () => void;
}

export class NamedRangesPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NamedRangesPanel";
  static props = {
    onCloseSidePanel: Function,
  };
  static components = { NamedRangePreview, SelectionInput, TextInput };

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
