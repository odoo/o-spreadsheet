import { UuidGenerator } from "../../../helpers/uuid";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";
import { DataValidationPreview } from "./dv_preview/dv_preview";

import { useProps } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { useStore } from "../../../store_engine/store_hooks";
import { Store } from "../../../types/store_engine";
import { SidePanelStore } from "../side_panel/side_panel_store";

export class DataValidationPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPanel";
  static components = { DataValidationPreview };

  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  private sidePanelStore!: Store<SidePanelStore>;

  setup() {
    this.sidePanelStore = useStore(SidePanelStore);
  }

  addDataValidationRule() {
    this.sidePanelStore.replace("DataValidationEditor", "DataValidation", {
      ruleId: UuidGenerator.smallUuid(),
    });
  }

  get validationRules() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getDataValidationRules(sheetId);
  }
}
