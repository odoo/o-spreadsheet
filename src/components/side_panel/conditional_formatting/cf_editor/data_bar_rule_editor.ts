import { usePlugin } from "@odoo/owl";
import { colorNumberToHex } from "../../../../helpers/color";
import { OSComponent } from "../../../os_component";
import { SelectionInput } from "../../../selection_input/selection_input";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { ConditionalFormattingEditorPlugin } from "./cf_editor_owl_plugin";

export class DataBarRuleEditor extends OSComponent {
  static template = "o-spreadsheet-DataBarRuleEditor";
  static components = {
    SelectionInput,
    RoundColorPicker,
  };
  cfEditorPlugin = usePlugin(ConditionalFormattingEditorPlugin);

  get rule() {
    return this.cfEditorPlugin.state.rules.dataBar;
  }

  colorNumberToHex = colorNumberToHex;
}
