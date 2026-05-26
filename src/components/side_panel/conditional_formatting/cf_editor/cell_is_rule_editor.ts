import { props } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { getTextDecoration } from "../../../helpers/css";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

export class CellIsRuleEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CellIsRuleEditor";
  static components = {
    ColorPickerWidget,
    Select,
  };
  protected props = props({
    store: types.Store<ConditionalFormattingEditorStore>(),
  });

  getTextDecoration = getTextDecoration;

  get rule() {
    return this.props.store.state.rules.cellIs;
  }
}
