import { BasePlugin } from "../../base_plugin";
import { Command } from "../../types/index";
import { Mode } from "../../model";

export class UIOptionsPlugin extends BasePlugin {
  static modes: Mode[] = ["normal", "readonly"];
  static getters = ["shouldShowFormulas"];
  private showFormulas: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SET_FORMULA_VISIBILITY":
        this.showFormulas = cmd.show;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  shouldShowFormulas(): boolean {
    return this.showFormulas;
  }
}
