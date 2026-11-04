import { usePlugin } from "@odoo/owl";
import { OSComponent } from "../../../os_component";
import { ConditionalFormattingEditorPlugin } from "./cf_editor_owl_plugin";
import { ColorScaleRuleEditorThreshold } from "./color_scale_rule_editor_threshold";

export class ColorScaleRuleEditor extends OSComponent {
  static template = "o-spreadsheet-ColorScaleRuleEditor";
  static components = {
    ColorScaleRuleEditorThreshold,
  };
  cfEditorPlugin = usePlugin(ConditionalFormattingEditorPlugin);
}
