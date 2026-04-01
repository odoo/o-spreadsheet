import { Component } from "@odoo/owl";
import { colorNumberToHex } from "../../../../helpers";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { SelectionInput } from "../../../selection_input/selection_input";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

interface Props {
  store: Store<ConditionalFormattingEditorStore>;
}

export class DataBarRuleEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataBarRuleEditor";
  static components = {
    SelectionInput,
    RoundColorPicker,
  };
  static props = { store: Object };

  get rule() {
    return this.props.store.state.rules.dataBar;
  }

  colorNumberToHex = colorNumberToHex;
}
