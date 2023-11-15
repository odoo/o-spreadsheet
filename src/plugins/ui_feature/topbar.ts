import { Command } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class TopBarPlugin extends UIPlugin {
  static getters = ["isTopBarEnabled"] as const;
  private isEditionActive: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START_EDITION":
        this.isEditionActive = true;
        break;
      case "STOP_EDITION":
      case "CANCEL_EDITION":
        this.isEditionActive = false;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  isTopBarEnabled(): boolean {
    return !this.isEditionActive || !this.getters.getCurrentContent().startsWith("=");
  }
}
