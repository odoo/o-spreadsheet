<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { Component } from "@odoo/owl";
import { localizeDataValidationRule } from "../../../helpers/locale";
import { DataValidationRule } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
import { localizeDataValidationRule } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { DataValidationRule, UID } from "../../../types";
import { DataValidationEditor } from "./dv_editor/dv_editor";
=======
import { Component, useState } from "@odoo/owl";
import { localizeDataValidationRule } from "../../../helpers/locale";
import { DataValidationRule, UID } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { DataValidationEditor } from "./dv_editor/dv_editor";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { DataValidationPreview } from "./dv_preview/dv_preview";

interface Props {
  onCloseSidePanel: () => void;
}

export class DataValidationPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPanel";
  static props = {
    onCloseSidePanel: Function,
  };
  static components = { DataValidationPreview };

  addDataValidationRule() {
    this.env.replaceSidePanel("DataValidationEditor", "DataValidation", {
      ruleId: this.env.model.uuidGenerator.smallUuid(),
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
