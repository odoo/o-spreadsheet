import { useProps } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { SpreadsheetComponentEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";
import { ColorScaleRuleEditorThreshold } from "./color_scale_rule_editor_threshold";

export class ColorScaleRuleEditor extends Component<SpreadsheetComponentEnv> {
  static template = "o-spreadsheet-ColorScaleRuleEditor";
  static components = {
    ColorScaleRuleEditorThreshold,
  };
  protected props = useProps({
    store: types.Store<ConditionalFormattingEditorStore>(),
  });
}
