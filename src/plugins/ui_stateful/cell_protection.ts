import { CommandResult, LocalCommand } from "../../types";
import { UIPlugin } from "../ui_plugin";

export class EvaluationCellProtectionPlugin extends UIPlugin {
  static getters = [] as const;

  allowDispatch(cmd: LocalCommand): CommandResult {
    if (this.hasOverlappingProtectionRules(cmd)) {
      this.ui.raiseBlockingErrorUI(
        "You can't edit this part of the sheet because it's protected.\nTo remove the protection rule, go to Data → Protect ranges and delete the rule."
      );
    }
    return CommandResult.Success;
  }

  handle(cmd: LocalCommand) {}

  finalize() {}

  private hasOverlappingProtectionRules(cmd: LocalCommand): Boolean {
    if (cmd) {
    }
    return false;
  }
}
