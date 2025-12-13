import { localizeDataValidationRule } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { DataValidationRule, UID } from "../../../types";
import { DataValidationEditor } from "./dv_editor/dv_editor";
import { DataValidationPreview } from "./dv_preview/dv_preview";

interface Props {
  onCloseSidePanel: () => void;
}

interface State {
  mode: "list" | "edit";
  activeRule: DataValidationRule | undefined;
  sheetId: UID | undefined;
}

export class DataValidationPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPanel";
  static props = {
    onCloseSidePanel: Function,
  };
  static components = { DataValidationPreview, DataValidationEditor };

  state = useState<State>({ mode: "list", activeRule: undefined, sheetId: undefined });

  onPreviewClick(id: UID) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const rule = this.env.model.getters.getDataValidationRule(sheetId, id);
    if (rule) {
      this.state.sheetId = sheetId;
      this.state.mode = "edit";
      this.state.activeRule = rule;
    }
  }

  addDataValidationRule() {
    this.state.mode = "edit";
    this.state.sheetId = this.env.model.getters.getActiveSheetId();
    this.state.activeRule = undefined;
  }

  onExitEditMode() {
    this.state.mode = "list";
    this.state.activeRule = undefined;
    this.state.sheetId = undefined;
  }

  localizeDVRule(rule?: DataValidationRule): DataValidationRule | undefined {
    if (!rule) return rule;
    const locale = this.env.model.getters.getLocale();
    return localizeDataValidationRule(rule, locale);
  }

  ruleExist(rule?: DataValidationRule): boolean {
    if (!rule || !this.state.sheetId) {
      return true;
    }
    return !!this.localizeDVRule(
      this.env.model.getters.getDataValidationRule(this.state.sheetId, rule.id)
    );
  }

  get validationRules() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getDataValidationRules(sheetId);
  }
}
