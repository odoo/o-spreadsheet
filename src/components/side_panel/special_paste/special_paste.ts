import { types, useProps } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

export class SpecialPastePanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpecialPastePanel";
  static components = { Section, Checkbox };
  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  onCancel() {
    this.props.onCloseSidePanel();
  }

  onConfirm() {
    this.props.onCloseSidePanel();
  }
}
