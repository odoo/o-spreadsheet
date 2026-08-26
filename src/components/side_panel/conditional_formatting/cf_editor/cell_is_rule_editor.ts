import { useProps } from "@odoo/owl";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { getTextDecoration } from "../../../helpers/css";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { SpreadsheetComponent } from "../../../spreadsheet/spreadsheet_component";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

export class CellIsRuleEditor extends SpreadsheetComponent {
  static template = "o-spreadsheet-CellIsRuleEditor";
  static components = {
    ColorPickerWidget,
    Select,
  };
  protected props = useProps({
    store: types.Store<ConditionalFormattingEditorStore>(),
  });

  getTextDecoration = getTextDecoration;

  get rule() {
    return this.props.store.state.rules.cellIs;
  }
}
