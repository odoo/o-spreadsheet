import { Component, useState } from "@odoo/owl";
import { CellProtectionRule, SpreadsheetChildEnv, UID } from "../../../types";
import { CellProtectionEditor } from "./cp_editor/cp_editor";
import { CellProtectionPreview } from "./cp_preview/cp_preview";

interface Props {
  onCloseSidePanel: () => void;
}

interface State {
  mode: "list" | "edit";
  activeRule: CellProtectionRule | undefined;
}

export class CellProtectionPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CellProtectionPanel";
  static props = {
    onCloseSidePanel: Function,
  };
  static components = { CellProtectionEditor, CellProtectionPreview };

  state = useState<State>({ mode: "list", activeRule: undefined });

  addCellProtectionRule() {
    this.state.mode = "edit";
    this.state.activeRule = undefined;
  }

  onExitEditMode() {
    this.state.mode = "list";
    this.state.activeRule = undefined;
  }

  onPreviewClick(id: UID) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const rule = this.env.model.getters.getCellProtectionRule(sheetId, id);
    if (rule) {
      this.state.mode = "edit";
      this.state.activeRule = rule;
    }
  }

  get cellProtectionRules() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getCellProtectionRules(sheetId);
  }
}
