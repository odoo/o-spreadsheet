import { Command } from "../../types";
import { UIPlugin } from "../ui_plugin";

export class OneHistoryStepPlugin extends UIPlugin {
  handle(cmd: Command) {
    switch (cmd.type) {
      case "ONE_HISTORY_STEP":
        cmd.callback();
        break;
    }
  }
}
