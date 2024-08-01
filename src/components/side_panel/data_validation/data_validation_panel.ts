import { Component, useState } from "@odoo/owl";
import { localizeDataValidationRule } from "../../../helpers/locale";
import type { DataValidationRule, SpreadsheetChildEnv, UID } from "../../../types";
import { DataValidationEditor } from "./dv_editor/dv_editor";
import { DataValidationPreview } from "./dv_preview/dv_preview";

interface Props {
  onCloseSidePanel: () => void;
}

interface State {
  mode: "list" | "edit";
  activeRule: DataValidationRule | undefined;
}

export class DataValidationPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPanel";
  static components = { DataValidationPreview, DataValidationEditor };

  state = useState<State>({ mode: "list", activeRule: undefined });

  onPreviewClick(id: UID) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const rule = this.env.model.getters.getDataValidationRule(sheetId, id);
    if (rule) {
      this.state.mode = "edit";
      this.state.activeRule = rule;
    }
  }

  addDataValidationRule() {
    this.state.mode = "edit";
    this.state.activeRule = undefined;
  }

  onExitEditMode() {
    this.state.mode = "list";
    this.state.activeRule = undefined;
  }

  localizeDVRule(rule?: DataValidationRule): DataValidationRule | undefined {
    if (!rule) return rule;
    const locale = this.env.model.getters.getLocale();
    return localizeDataValidationRule(rule, locale);
  }

  get validationRules() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getDataValidationRules(sheetId);
  }
}

DataValidationPanel.props = {
  onCloseSidePanel: Function,
};
