import { useProps } from "@odoo/owl";
import { colorNumberToHex } from "../../../../helpers/color";
import { types } from "../../../props_validation";
import { SelectionInput } from "../../../selection_input/selection_input";
import { SpreadsheetComponent } from "../../../spreadsheet/spreadsheet_component";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

export class DataBarRuleEditor extends SpreadsheetComponent {
  static template = "o-spreadsheet-DataBarRuleEditor";
  static components = {
    SelectionInput,
    RoundColorPicker,
  };
  protected props = useProps({
    store: types.Store<ConditionalFormattingEditorStore>(),
  });

  get rule() {
    return this.props.store.state.rules.dataBar;
  }

  colorNumberToHex = colorNumberToHex;
}
