import { ShowFormulaCommand } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class UIOptionsPlugin extends UIPlugin {
  static getters = ["shouldShowFormulas"] as const;
  private showFormulas: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handlers = {
    SET_FORMULA_VISIBILITY: this.setFormulaVisibility,
  };

  private setFormulaVisibility(cmd: ShowFormulaCommand) {
    this.showFormulas = cmd.show;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  shouldShowFormulas(): boolean {
    return this.showFormulas;
  }
}
