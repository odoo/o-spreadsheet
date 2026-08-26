import { useProps } from "@odoo/owl";
import { types } from "../../../props_validation";
import { SpreadsheetComponent } from "../../../spreadsheet/spreadsheet_component";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";
import { ColorScaleRuleEditorThreshold } from "./color_scale_rule_editor_threshold";

export class ColorScaleRuleEditor extends SpreadsheetComponent {
  static template = "o-spreadsheet-ColorScaleRuleEditor";
  static components = {
    ColorScaleRuleEditorThreshold,
  };
  protected props = useProps({
    store: types.Store<ConditionalFormattingEditorStore>(),
  });
}
