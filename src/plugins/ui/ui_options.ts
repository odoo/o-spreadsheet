import { Command } from "../../types/commands";
import { UIOptionsPluginGetters } from "../../types/getters";
import { Mode } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class UIOptionsPlugin extends UIPlugin implements UIOptionsPluginGetters {
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
