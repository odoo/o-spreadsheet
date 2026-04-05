import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
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

  get validationRules() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getDataValidationRules(sheetId);
  }
}
