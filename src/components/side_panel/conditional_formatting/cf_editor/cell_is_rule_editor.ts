import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { getTextDecoration } from "../../../helpers";
import { Select } from "../../../select/select";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

interface Props {
  store: Store<ConditionalFormattingEditorStore>;
}

export class CellIsRuleEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CellIsRuleEditor";
  static components = {
    ColorPickerWidget,
    Select,
  };
  static props = { store: Object };

  getTextDecoration = getTextDecoration;

  get rule() {
    return this.props.store.state.rules.cellIs;
  }
}
