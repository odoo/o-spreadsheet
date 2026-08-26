import { UuidGenerator } from "../../../helpers/uuid";
import { types } from "../../props_validation";
import { DataValidationPreview } from "./dv_preview/dv_preview";

import { useProps } from "@odoo/owl";
import { SpreadsheetComponent } from "../../spreadsheet/spreadsheet_component";

export class DataValidationPanel extends SpreadsheetComponent {
  static template = "o-spreadsheet-DataValidationPanel";
  static components = { DataValidationPreview };

  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  addDataValidationRule() {
    this.env.replaceSidePanel("DataValidationEditor", "DataValidation", {
      ruleId: UuidGenerator.smallUuid(),
    });
  }

  get validationRules() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getDataValidationRules(sheetId);
  }
}
