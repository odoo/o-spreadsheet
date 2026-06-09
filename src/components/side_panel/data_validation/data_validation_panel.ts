import { localizeDataValidationRule } from "../../../helpers/locale";
import { UuidGenerator } from "../../../helpers/uuid";
import { DataValidationRule } from "../../../types/data_validation";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";
import { DataValidationPreview } from "./dv_preview/dv_preview";

import { props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";

export class DataValidationPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPanel";
  static components = { DataValidationPreview };

  protected props = props({
    onCloseSidePanel: types.function(),
  });

  addDataValidationRule() {
    this.env.replaceSidePanel("DataValidationEditor", "DataValidation", {
      ruleId: UuidGenerator.smallUuid(),
    });
  }

  localizeDVRule(rule?: DataValidationRule): DataValidationRule | undefined {
    if (!rule) {
      return rule;
    }
    const locale = this.env.model.getters.getLocale();
    return localizeDataValidationRule(rule, locale);
  }

  get validationRules() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getDataValidationRules(sheetId);
  }
}
