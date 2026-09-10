import { useProps } from "@odoo/owl";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";
import { ColorScaleRuleEditorThreshold } from "./color_scale_rule_editor_threshold";

export class ColorScaleRuleEditor extends OSComponent {
  static template = "o-spreadsheet-ColorScaleRuleEditor";
  static components = {
    ColorScaleRuleEditorThreshold,
  };
  protected props = useProps({
    store: types.Store<ConditionalFormattingEditorStore>(),
  });
}
