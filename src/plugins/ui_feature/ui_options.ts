import { Command } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class UIOptionsPlugin extends UIPlugin {
  static getters = ["shouldShowFormulas", "visibleHeaders", "isPrintMode"] as const;
  private showFormulas: boolean = false;
  private printMode: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SET_FORMULA_VISIBILITY":
        this.showFormulas = cmd.show;
        break;
      case "SET_PRINT_MODE":
        this.printMode = cmd.active;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  shouldShowFormulas(): boolean {
    return this.showFormulas;
  }

  visibleHeaders(): boolean {
    return !this.getters.isDashboard() && !this.printMode;
  }

  isPrintMode(): boolean {
    return this.printMode;
  }
}
