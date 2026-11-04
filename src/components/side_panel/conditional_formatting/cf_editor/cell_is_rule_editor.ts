import { usePlugin } from "@odoo/owl";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { getTextDecoration } from "../../../helpers/css";
import { OSComponent } from "../../../os_component";
import { Select } from "../../../select/select";
import { ConditionalFormattingEditorPlugin } from "./cf_editor_owl_plugin";

export class CellIsRuleEditor extends OSComponent {
  static template = "o-spreadsheet-CellIsRuleEditor";
  static components = {
    ColorPickerWidget,
    Select,
  };
  cfEditorPlugin = usePlugin(ConditionalFormattingEditorPlugin);

  getTextDecoration = getTextDecoration;

  get rule() {
    return this.cfEditorPlugin.state.rules.cellIs;
  }
}
