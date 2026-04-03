import { Component } from "../../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";
import { ColorScaleRuleEditorThreshold } from "./color_scale_rule_editor_threshold";

interface Props {
  store: Store<ConditionalFormattingEditorStore>;
}

export class ColorScaleRuleEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorScaleRuleEditor";
  static components = {
    ColorScaleRuleEditorThreshold,
  };
  static props = { store: Object };
}
