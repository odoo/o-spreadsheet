import { Component } from "@odoo/owl";
import { localizeDataValidationRule } from "../../../helpers/locale";
import { DataValidationRule, SpreadsheetChildEnv } from "../../../types";
import { DataValidationPreview } from "./dv_preview/dv_preview";

export class DataValidationPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPanel";
  static components = { DataValidationPreview };
  static props = {
    onCloseSidePanel: Function,
  };

  addDataValidationRule() {
    const id = this.env.model.uuidGenerator.smallUuid();
    this.env.replaceSidePanel("DataValidationEditor", "DataValidation", { id });
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
